// protocol/views.js

import { getPgPool } from "../shared/helpers/pgPool.js";
import {
    getProtocolTokensSql,
    insertProtocolUserTokenSql,
    getProtocolUserTokensByWalletSql,
    insertProtocolWalletUsdtSql,
    getProtocolWalletUsdtByWalletSql,
    insertProtocolTransactionSql,
    insertProtocolWithdrawSql,
    getUserByTelegramIdSql,
    insertUserSql,
    updateUserSql,
    getWalletByUserIdSql,
    insertWalletSql,
    getRecentTokensSql,
    getTokenSql
} from "./sqlQuerries.js";
import { Connection, Keypair, VersionedTransaction, PublicKey, Transaction, TransactionMessage, ComputeBudgetProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import bs58 from "bs58";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getQuoteData } from "../shared/utils/getQuoteData.js";
import { getSwapData } from "../shared/utils/getSwapData.js";
import { getUsdtOnChainBalance } from "../shared/utils/getUsdtOnChainBalance.js";
import { getUsdtJettonWallet } from "../shared/utils/getUsdtJettonWallet.js";
import { SOLANA_EXECUTOR_PRIVATE_KEY } from "../shared/constants/keys.js";
import { SOLANA_RPC_URL } from "../shared/constants/urls.js";
import { USDT_MINT } from "../shared/constants/solanaAddresses.js";
import { SERVICE_KEY } from "../shared/constants/service.js";
import { 
    protocolTokenTypeConversion,
    protocolUserTokenTypeConversion,
    userTypeConversion,
    recentTokensTypeConversion,
    tokenPriceTypeConversion
} from "./typeConversion.js";
import { getTonAddress } from "../shared/utils/getTonAddress.js";
import { sleep } from "../shared/utils/sleep.js";
const pgPool = getPgPool();
const connection = new Connection(SOLANA_RPC_URL);
const executorKeypair = Keypair.fromSecretKey(bs58.decode(SOLANA_EXECUTOR_PRIVATE_KEY));

// Константа для кошелька администратора, куда будет переводиться комиссия
const ADMIN_SOLANA_WALLET = "BR4e1UUfevkmYZNf2xa2eTSrsaQGS6ms6zPRU12ExdLg"; 

// --- TON USDT Wallet operations ---
export const getOnChainUsdtBalanceView = async ({ wallet, userId }) => {
    try {
        // Проверка принадлежности кошелька пользователю
        const isOwner = await verifyWalletOwnershipView({ wallet, userId });
        if (!isOwner) {
            console.log("getOnChainUsdtBalanceView: Wallet does not belong to user", { wallet, userId });
            return null;
        }
        
        const balance = await getUsdtOnChainBalance({ address: wallet });
        if (!balance) {
            console.log("getOnChainUsdtBalanceView: Error getting balance", { wallet, userId });
            return null;
        }

        return Number(balance);
    } catch (error) {
        console.error("getOnChainUsdtBalanceView error:", error.message);
        return null;
    }
};

export const getUsdtJettonWalletView = async ({ wallet, userId }) => {
    try {
        // Проверка принадлежности кошелька пользователю
        const isOwner = await verifyWalletOwnershipView({ wallet, userId });
        if (!isOwner) {
            console.log("getUsdtJettonWalletView: Wallet does not belong to user", { wallet, userId });
            return null;
        }
        
        const jettonWalletInfo = await getUsdtJettonWallet({ address: wallet });
        if (!jettonWalletInfo) {
            console.log("getUsdtJettonWalletView: Error getting jetton wallet info", { wallet, userId });
            return null;
        }   
        return jettonWalletInfo;
    } catch (error) {
        console.error("getUsdtJettonWalletView error:", error.message);
        return null;
    }
};

// --- Wallet management ---
export const insertWalletView = async ({ userId, wallet }) => {
    try {
        // Проверка, существует ли уже такой кошелек
        const existingWallet = await verifyWalletOwnershipView({ wallet, userId });
        if (existingWallet) {
            console.log("insertWalletView: Wallet already exists for this user", { wallet, userId });
            return true; // Кошелек уже есть, считаем операцию успешной
        }
        
        await pgPool.query(insertWalletSql(), [userId, getTonAddress({address: wallet}), Math.floor(Date.now() / 1000)]);
        return true;
    } catch (error) {
        console.error("insertWalletView error:", error.message);
        return false;
    }
};

export const verifyWalletOwnershipView = async ({ wallet, userId }) => {
    try {
        const result = await pgPool.query(getWalletByUserIdSql(), [userId, getTonAddress({address: wallet})]);
        
        if (!result.rows.length || result.rows[0].address !== getTonAddress({address: wallet})) {
            return false;
        }
        
        return true;
    } catch (error) {
        console.error("verifyWalletOwnershipView error:", error.message);
        return false;
    }
};

export const getUserView = async ({ telegramId }) => {
    try {
      const result = await pgPool.query(getUserByTelegramIdSql(), [telegramId]);
      return result.rows.length ? userTypeConversion({ userObject: result.rows[0] }) : null;
    } catch (error) {
      console.error("getUserView", telegramId, error);
      return null;
    }
  };
  
  export const createUserView = async ({ telegramId, userName }) => {
    try {
      await pgPool.query(insertUserSql(), [
        telegramId,
        userName,
        Number(new Date()),
      ]);
      return true;
    } catch (error) {
      console.error("createUserView", telegramId, userName, error);
      return false;
    }
  };
  
  export const updateUserView = async ({ user }) => {
    try {
      const visits = user.visits;
      await pgPool.query(updateUserSql(), [
        Number(visits) + 1,
        Number(new Date()),
        user.telegram_id,
      ]);
      return true;
    } catch (error) {
      console.error("updateUserView", user, error);
      return false;
    }
  };
  
  export const generateJwtTokenView = ({ telegramId, userName }) => {
    try {
      return jwt.sign(
        {
          telegramId,
          userName,
          iat: Math.floor(Date.now() / 1000),
          jti: crypto.randomUUID(),
        },
        SERVICE_KEY,
        { expiresIn: "30m" },
      );
    } catch (error) {
      console.error("generateJwtTokenView", telegramId, userName, error);
      return null;
    }
  };


export const getProtocolTokensView = async () => {
    try {
        const result = await pgPool.query(getProtocolTokensSql());
        return result.rows.map(row => protocolTokenTypeConversion({ tokenObject: row }));
    } catch (error) {
        console.log("getProtocolTokensView", error);
        return [];
    }
};

// --- protocol_user_tokens ---

export const createOrUpdateUserTokenView = async ({ wallet, tokenMint, amount, userId }) => {
    try {
        // Проверка принадлежности кошелька пользователю
        const isOwner = await verifyWalletOwnershipView({ wallet, userId });
        if (!isOwner) {
            console.log("createOrUpdateUserTokenView: Wallet does not belong to user", { wallet, userId });
            return false;
        }
        
        await pgPool.query(insertProtocolUserTokenSql(), [getTonAddress({address: wallet}), tokenMint, amount]);
        return true;
    } catch (error) {
        console.log("createOrUpdateUserTokenView", error);
        return false;
    }
};


export const getUserTokensByWalletView = async ({ wallet, userId }) => {
    try {
        // Проверка принадлежности кошелька пользователю
        const isOwner = await verifyWalletOwnershipView({ wallet, userId });
        if (!isOwner) {
            console.log("getUserTokensByWalletView: Wallet does not belong to user", { wallet, userId });
            return [];
        }
        
        const result = await pgPool.query(getProtocolUserTokensByWalletSql(), [getTonAddress({address: wallet})]);
        return result.rows.map(row => protocolUserTokenTypeConversion({ tokenObject: row }));
    } catch (error) {
        console.log("getUserTokensByWalletView", error);
        return [];
    }
};

// --- protocol_wallet_usdt ---

export const createOrUpdateUserUsdtBalanceView = async ({ wallet, amount, userId }) => {
    try {
        // Проверка принадлежности кошелька пользователю
        const isOwner = await verifyWalletOwnershipView({ wallet, userId });
        if (!isOwner) {
            console.log("createOrUpdateUserUsdtBalanceView: Wallet does not belong to user", { wallet, userId });
            return false;
        }
        
        await pgPool.query(insertProtocolWalletUsdtSql(), [getTonAddress({address: wallet}), amount]);
        return true;
    } catch (error) {
        console.log("createOrUpdateUserUsdtBalanceView", error);
        return false;
    }
};


export const getUserUsdtBalanceView = async ({ wallet, userId }) => {
    try {
        // Проверка принадлежности кошелька пользователю
        const isOwner = await verifyWalletOwnershipView({ wallet, userId });
        if (!isOwner) {
            console.log("getUserUsdtBalanceView: Wallet does not belong to user", { wallet, userId });
            return null;
        }
        const result = await pgPool.query(getProtocolWalletUsdtByWalletSql(), [getTonAddress({address: wallet})]);
        return result.rows[0] ? Number(result.rows[0].amount) : 0;
    } catch (error) {
        console.log("getUserUsdtBalanceView", error);
        return null;
    }
};

// Функция для подготовки инструкции трансфера комиссии на кошелек администратора
export const transferFeeToAdminWallet = async (feeAmount) => {
    if (!feeAmount || Number(feeAmount) <= 0) {
        console.log("transferFeeToAdminWallet: Invalid fee amount", { feeAmount });
        return null;
    }
    
    try {
        // Преобразуем сумму в BigInt без дополнительного умножения
        const amount = BigInt(Math.floor(Number(feeAmount)));
        
        // Получаем токеновый адрес USDT
        const usdtMint = new PublicKey(USDT_MINT);
        const adminWallet = new PublicKey(ADMIN_SOLANA_WALLET);
        
        // Получаем связанный токеновый аккаунт для отправителя и получателя
        const sourceTokenAccount = await getAssociatedTokenAddress(
            usdtMint,
            executorKeypair.publicKey
        );
        
        const destinationTokenAccount = await getAssociatedTokenAddress(
            usdtMint,
            adminWallet
        );
        
        // Проверяем существование токенового аккаунта получателя
        let destinationAccountExists = false;
        try {
            await getAccount(connection, destinationTokenAccount);
            destinationAccountExists = true;
        } catch (error) {
            console.log("Destination token account does not exist, will include creation instruction");
        }
        
        // Подготавливаем массив инструкций
        const instructions = [];
        
        // Если токеновый аккаунт получателя не существует, добавляем инструкцию для его создания
        if (!destinationAccountExists) {
            const createAtaInstruction = createAssociatedTokenAccountInstruction(
                executorKeypair.publicKey, // payer
                destinationTokenAccount,    // ata
                adminWallet,                // owner
                usdtMint                    // mint
            );
            instructions.push(createAtaInstruction);
        }
        
        // Добавляем инструкцию перевода токенов
        const transferInstruction = createTransferInstruction(
            sourceTokenAccount,         // исходный токеновый аккаунт
            destinationTokenAccount,    // целевой токеновый аккаунт
            executorKeypair.publicKey,  // владелец исходного аккаунта
            amount                      // сумма перевода
        );
        instructions.push(transferInstruction);
        
        // Возвращаем инструкции для добавления в транзакцию
        return {
            instructions,
            feeAmount,
            sourceTokenAccount,
            destinationTokenAccount,
            destinationAccountExists
        };
    } catch (error) {
        console.error("transferFeeToAdminWallet error:", error.message);
        return null;
    }
};

// --- Swap operations: Buy & Sell ---

export const buyTokenView = async ({ wallet, outputMint, usdtAmountRaw, userId }) => {
    // Проверка принадлежности кошелька пользователю
    const isOwner = await verifyWalletOwnershipView({ wallet, userId });
    if (!isOwner) {
        console.log("buyTokenView: Wallet does not belong to user", { wallet, userId });
        return false;
    }
    
    const usdtBalance = await getUserUsdtBalanceView({ wallet, userId });
    if (!usdtBalance || Number(usdtBalance.amount) < Number(usdtAmountRaw)) {
        console.log("buyTokenView: Not enough USDT on balance", {
            wallet,
            balance: usdtBalance?.amount || 0,
            requested: usdtAmountRaw
        });
        return false;
    }

    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');

        const feePercent = 0.01;
        const feeAmount = Math.floor(Number(usdtAmountRaw) * feePercent);
        const usdtAmountWithoutFee = Number(usdtAmountRaw) - feeAmount;

        const quoteData = await getQuoteData({ inputMint: USDT_MINT, outputMint, amount: usdtAmountWithoutFee.toString() });
        if (!quoteData) {
            console.log("buyTokenView: Error getting quote data");
            return false;
        }
        const { receivedAmount, swapData } = await getSwapData({ quoteData, executorKeypair });
        if (!receivedAmount || !swapData) {
            console.log("buyTokenView: Error getting swap data");
            return false;
        }
        
        // Получаем коллдату для трансфера комиссии
        const feeTransferData = await transferFeeToAdminWallet(feeAmount);
        if (!feeTransferData) {
            console.log("buyTokenView: Error getting fee transfer data");
            return false;
        }
        
        let txid;
        
        // Десериализуем транзакцию свапа
        const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
        const swapTransaction = VersionedTransaction.deserialize(swapTransactionBuf);
        
        // Извлекаем сообщение транзакции свапа
        const swapMessage = swapTransaction.message;
        
        // Получаем последний хэш блока для создания новой транзакции
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        
        // Создаем новое сообщение, включающее инструкции из свапа и инструкции перевода комиссии
        const feeTransferInstructions = feeTransferData.instructions;
        
        // 1. Отправляем свап-транзакцию
        swapTransaction.sign([executorKeypair]);
        txid = await connection.sendTransaction(swapTransaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 5
        });
        
        // Ожидаем подтверждения транзакции
        const { value } = await connection.confirmTransaction({
            signature: txid,
            lastValidBlockHeight,
            blockhash
        }, 'confirmed');
        
        if (value?.err) {
            throw new Error(`Swap transaction confirmed with error: ${JSON.stringify(value.err)}`);
        }
        
        // 2. Отправляем транзакцию для перевода комиссии
        const feeTransaction = new Transaction();
        for (const instruction of feeTransferInstructions) {
            feeTransaction.add(instruction);
        }
        
        feeTransaction.recentBlockhash = blockhash;
        feeTransaction.feePayer = executorKeypair.publicKey;
        
        feeTransaction.sign(executorKeypair);
        
        const feeSignature = await connection.sendRawTransaction(feeTransaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });
        
       const feeConfirmation = await connection.confirmTransaction({
            signature: feeSignature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');
        
        if (feeConfirmation.value?.err) {
            console.log("Fee transfer failed:", feeConfirmation.value.err);
        } else {
            console.log("Fee transfer successful:", {
                amount: feeAmount,
                signature: feeSignature
            });
        }

        const dbAmount = '-' + usdtAmountRaw.toString();

        await client.query(insertProtocolWalletUsdtSql(), [getTonAddress({address: wallet}), dbAmount]);

        await client.query(insertProtocolUserTokenSql(), [getTonAddress({address: wallet}), outputMint, receivedAmount]);

        await client.query(insertProtocolTransactionSql(), [
            txid,
            getTonAddress({address: wallet}),
            outputMint,
            "buy",
            receivedAmount,
            Math.floor(Date.now() / 1000),
            usdtAmountRaw
        ]);

        await client.query('COMMIT');
        return true
    } catch (error) {
        await client.query('ROLLBACK');
        console.log("buyTokenView", error);
        return false;
    } finally {
        client.release();
    }
};

export const sellTokenView = async ({ wallet, inputMint, tokenAmountRaw, userId }) => {
    const isOwner = await verifyWalletOwnershipView({ wallet, userId });
    if (!isOwner) {
        console.log("sellTokenView: Wallet does not belong to user", { wallet, userId });
        return false;
    }
    
    const userTokens = await getUserTokensByWalletView({ wallet, userId });
    const tokenToSell = userTokens.find(token => token.token_mint === inputMint);

    if (!tokenToSell || Number(tokenToSell.amount) < Number(tokenAmountRaw)) {
        console.log("sellTokenView: Not enough tokens on balance", {
            wallet,
            tokenMint: inputMint,
            balance: tokenToSell?.amount || 0,
            requested: tokenAmountRaw
        });
        return false;
    }

    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');

        const quoteData = await getQuoteData({ inputMint, outputMint: USDT_MINT, amount: tokenAmountRaw });
        if (!quoteData) {
            console.log("sellTokenView: Error getting quote data");
            return false;
        }
        const { receivedAmount, swapData } = await getSwapData({ quoteData, executorKeypair });
        if (!receivedAmount || !swapData) {
            console.log("sellTokenView: Error getting swap data");
            return false;
        }

        const feePercent = 0.01;
        const feeAmount = Math.floor(Number(receivedAmount) * feePercent);
        const amountAfterFee = Number(receivedAmount) - feeAmount;
        
        // Получаем коллдату для трансфера комиссии
        const feeTransferData = await transferFeeToAdminWallet(feeAmount);
        if (!feeTransferData) {
            console.log("sellTokenView: Error getting fee transfer data");
            return false;
        }
        
        let txid;
        
        // Десериализуем транзакцию свапа
        const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
        const swapTransaction = VersionedTransaction.deserialize(swapTransactionBuf);
        
        // Получаем последний хэш блока для создания транзакций
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        
        // Получаем инструкции для перевода комиссии
        const feeTransferInstructions = feeTransferData.instructions;
        
        // 1. Отправляем свап-транзакцию
        swapTransaction.sign([executorKeypair]);
        txid = await connection.sendTransaction(swapTransaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 5
        });
        
        // Ожидаем подтверждения транзакции
        const swapConfirmation = await connection.confirmTransaction({
            signature: txid,
            lastValidBlockHeight,
            blockhash
        }, 'confirmed');
        
        if (swapConfirmation.value?.err) {
            throw new Error(`Swap transaction confirmed with error: ${JSON.stringify(swapConfirmation.value.err)}`);
        }
        
        // 2. Отправляем транзакцию для перевода комиссии
        const feeTransaction = new Transaction();
        for (const instruction of feeTransferInstructions) {
            feeTransaction.add(instruction);
        }
        
        feeTransaction.recentBlockhash = blockhash;
        feeTransaction.feePayer = executorKeypair.publicKey;
        
        feeTransaction.sign(executorKeypair);
        
        const feeSignature = await connection.sendRawTransaction(feeTransaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });
        
        const feeConfirmation = await connection.confirmTransaction({
            signature: feeSignature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');
        
        if (feeConfirmation.value?.err) {
            console.log("Fee transfer failed:", feeConfirmation.value.err);
        } else {
            console.log("Fee transfer successful:", {
                amount: feeAmount,
                signature: feeSignature
            });
        }

        const dbAmount = '-' + tokenAmountRaw.toString();

        await client.query(insertProtocolUserTokenSql(), [getTonAddress({address: wallet}), inputMint, dbAmount]);

        // Зачисляем сумму после вычета комиссии
        await client.query(insertProtocolWalletUsdtSql(), [getTonAddress({address: wallet}), amountAfterFee.toString()]);

        await client.query(insertProtocolTransactionSql(), [
            txid,
            getTonAddress({address: wallet}),
            inputMint,
            "sell",
            tokenAmountRaw,
            Math.floor(Date.now() / 1000),
            amountAfterFee.toString()
        ]);

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.log("sellTokenView", error);
        return false;
    } finally {
        client.release();
    }
};

export const withdrawUsdtView = async ({ wallet, amount, userId }) => {
    // Проверка принадлежности кошелька пользователю
    const isOwner = await verifyWalletOwnershipView({ wallet, userId });
    if (!isOwner) {
        console.log("withdrawUsdtView: Wallet does not belong to user", { wallet, userId });
        return false;
    }
    
    // Проверка баланса перед выводом
    const usdtBalance = await getUserUsdtBalanceView({ wallet, userId });
    if (!usdtBalance || usdtBalance.amount < amount) {
        console.log("withdrawUsdtView: Недостаточно USDT на балансе", {
            wallet,
            balance: usdtBalance?.amount || 0,
            requested: amount
        });
        return false;
    }

    try {
        // Уменьшаем баланс USDT
        const dbAmount = '-' + amount.toString();
        await pgPool.query(insertProtocolWalletUsdtSql(), [getTonAddress({address: wallet}), dbAmount]);

        // Записываем информацию о выводе
        const timestamp = Math.floor(Date.now() / 1000);
        await pgPool.query(insertProtocolWithdrawSql(), [getTonAddress({address: wallet}), amount, timestamp]);
        return true
    } catch (error) {
        console.log("withdrawUsdtView error", error);
        return false
    }
};

// --- protocol_transactions ---

export const getRecentTokensView = async ({ wallet, userId }) => {
    try {
        // Проверка принадлежности кошелька пользователю
        const isOwner = await verifyWalletOwnershipView({ wallet, userId });
        if (!isOwner) {
            console.log("getRecentTokensView: Wallet does not belong to user", { wallet, userId });
            return [];
        }
        
        const result = await pgPool.query(getRecentTokensSql(), [getTonAddress({address: wallet})]);
        const tokens = result.rows.map(row => row.token_mint);
        return recentTokensTypeConversion({ tokens });
    } catch (error) {
        console.log("getRecentTokensView", error);
        return [];
    }
};

export const getTokenPrice = async ({ tokenMint }) => {
    try {
        const tokenResult = await pgPool.query(getTokenSql(), [tokenMint]);
        if (!tokenResult.rows.length) {
            console.log("getTokenPrice: Token not found", { tokenMint });
            return null;
        }
        
        const token = tokenResult.rows[0];
        const tokenDecimals = token.decimals;
        
        const standardAmount = Math.pow(10, tokenDecimals).toString();
        
        const quoteData = await getQuoteData({ 
            inputMint: tokenMint, 
            outputMint: USDT_MINT, 
            amount: standardAmount 
        });
        
        if (!quoteData) {
            console.log("getTokenPrice: Error getting quote data", { tokenMint });
            return null;
        }
        
        const price = Number(quoteData.outAmount) / Math.pow(10, 6); // USDT decimals = 6
        
        return tokenPriceTypeConversion({ price });
        
    } catch (error) {
        console.log("getTokenPrice", error);
        return null;
    }
};