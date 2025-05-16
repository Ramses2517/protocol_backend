// protocol/requestHandlers.js

import {
    getProtocolTokensView,
    createOrUpdateUserTokenView,
    getUserTokensByWalletView,
    createOrUpdateUserUsdtBalanceView,
    getUserUsdtBalanceView,
    buyTokenView,
    sellTokenView,
    withdrawUsdtView,
    getUserView,
    createUserView,
    updateUserView,
    generateJwtTokenView,
    insertWalletView,
    getOnChainUsdtBalanceView,
    getUsdtJettonWalletView,
    getRecentTokensView,
    getTokenPrice
} from "./views.js";
import { TON, SOLANA } from "../shared/constants/networks.js";
import { validateAddress, checkAllParameters, validateNumber } from "./validators.js";

export const requestHandlers = {

    getTokens: async () => {
        const tokens = await getProtocolTokensView();
        return [true, tokens];
    },

    authenticateUser: async ({ telegramId, userName }) => {
        let user = await getUserView({ telegramId });
        if (user) {
          await updateUserView({ user });
        } else if (!user) {
          const created = await createUserView({ telegramId, userName });
          if (!created) {
            return { ok: false, token: null };
          }
          user = { telegram_id: telegramId, user_name: userName };
        }
        const token = generateJwtTokenView({
          telegramId: user.telegram_id,
          userName: user.user_name,
        });
        if (!token) {
          return { ok: false, token: null };
        }
        return { ok: true, token };
      },

    // --- wallet management ---
    
    addWallet: async ({ userId, wallet }) => {
        const address = validateAddress({ address: wallet, type: TON });
        
        if (checkAllParameters({ parameters: [address] })) {
            const ok = await insertWalletView({ userId, wallet: address.value });
            return [ok];
        }
        return [false];
    },

    // --- TON USDT operations ---
    
    getOnChainUsdtBalance: async ({ wallet, userId }) => {
        const address = validateAddress({ address: wallet, type: TON });
        
        if (checkAllParameters({ parameters: [address] })) {
            const balanceInfo = await getOnChainUsdtBalanceView({ wallet: address.value, userId });
            return [!!balanceInfo, balanceInfo];
        }
        return [false, null];
    },
    
    getUsdtJettonWallet: async ({ wallet, userId }) => {
        const address = validateAddress({ address: wallet, type: TON });
        
        if (checkAllParameters({ parameters: [address] })) {
            const walletInfo = await getUsdtJettonWalletView({ wallet: address.value, userId });
            return [!!walletInfo, walletInfo];
        }
        return [false, null];
    },

    // --- Recent tokens ---
    
    getRecentTokens: async ({ wallet, userId }) => {
        const address = validateAddress({ address: wallet, type: TON });
        
        if (checkAllParameters({ parameters: [address] })) {
            const tokens = await getRecentTokensView({ wallet: address.value, userId });
            return [true, tokens];
        }
        return [false, []];
    },
    
    // --- Token Price ---
    
    getTokenPrice: async ({ tokenMint }) => {
        try {
            const address = validateAddress({ address: tokenMint, type: SOLANA });
            
            if (checkAllParameters({ parameters: [address] })) {
                const priceInfo = await getTokenPrice({ tokenMint: address.value });
                return [!!priceInfo, priceInfo];
            }
            return [false, null];
        } catch (error) {
            console.log("getTokenPrice handler", error);
            return [false, null];
        }
    },

    // --- protocol_user_tokens ---

    createOrUpdateUserToken: async ({ wallet, tokenMint, amount, userId }) => {
        const address = validateAddress({ address: wallet, type: TON });
        const amountValidated = validateNumber({ value: amount });
        const tokenMintValidated = validateAddress({ address: tokenMint, type: SOLANA });
        
        if (checkAllParameters({ parameters: [address, amountValidated, tokenMintValidated] })) {
            const ok = await createOrUpdateUserTokenView({ wallet: address.value, tokenMint: tokenMintValidated.value, amount: amountValidated.value, userId });
            return [ok];
        }
        return [false];
    },

    getUserTokens: async ({ wallet, userId }) => {
        const address = validateAddress({ address: wallet, type: TON });
        
        
        if (checkAllParameters({ parameters: [address] })) {
            const tokens = await getUserTokensByWalletView({ wallet: address.value, userId });
            return [true, tokens];
        }
        return [false, null];
    },

    // --- protocol_wallet_usdt ---

    createOrUpdateUserUsdtBalance: async ({ wallet, amount, userId }) => {
        const address = validateAddress({ address: wallet, type: TON });
        const amountValidated = validateNumber({ value: amount });
        
        if (checkAllParameters({ parameters: [address, amountValidated] })) {
            const ok = await createOrUpdateUserUsdtBalanceView({ wallet: address.value, amount: amountValidated.value, userId });
            return [ok];
        }
        return [false];
    },

    getUserUsdtBalance: async ({ wallet, userId }) => {
        const address = validateAddress({ address: wallet, type: TON });        
        if (checkAllParameters({ parameters: [address] })) {
            const balance = await getUserUsdtBalanceView({ wallet: address.value, userId });
            return [true, balance];
        }
        return [false, null];
    },

    // --- trading operations ---

    buyToken: async ({ wallet, outputMint, usdtAmountRaw, userId }) => {
        const address = validateAddress({ address: wallet, type: TON });
        const usdtAmount = validateNumber({ value: usdtAmountRaw });
        const outputMintValidated = validateAddress({ address: outputMint, type: SOLANA });
        
        if (checkAllParameters({ parameters: [address, usdtAmount, outputMintValidated] })) {
            const result = await buyTokenView({ wallet: address.value, outputMint: outputMintValidated.value, usdtAmountRaw: usdtAmount.value, userId });
            return [!!result, result];
        }
        return [false, null];
    },

    sellToken: async ({ wallet, inputMint, tokenAmountRaw, userId }) => {
        const address = validateAddress({ address: wallet, type: TON });
        const tokenAmount = validateNumber({ value: tokenAmountRaw });
        const inputMintValidated = validateAddress({ address: inputMint, type: SOLANA });
        
        if (checkAllParameters({ parameters: [address, tokenAmount, inputMintValidated] })) {
            const result = await sellTokenView({ wallet: address.value, inputMint: inputMintValidated.value, tokenAmountRaw: tokenAmount.value, userId });
            return [!!result, result];
        }
        return [false, null];
    },

    withdrawUsdt: async ({ wallet, amount, userId }) => {
        const address = validateAddress({ address: wallet, type: TON });
        const amountValidated = validateNumber({ value: amount });
        
        if (checkAllParameters({ parameters: [address, amountValidated] })) {
            const result = await withdrawUsdtView({ wallet: address.value, amount: amountValidated.value, userId });
            return [!!result, result];
        }
        return [false, null];
    },
};