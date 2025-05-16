import pkg from '@ton/ton';
const { fromNano, toNano, internal, Address, beginCell, WalletContractV5R1, Cell } = pkg;

import cryptoPkg from '@ton/crypto';
import { TON_WALLET_MNEMONIC } from '../constants/keys.js';
import {SERVICE_KEY} from '../constants/service.js';
import { getUsdtJettonWallet } from './getUsdtJettonWallet.js';
const { mnemonicToWalletKey } = cryptoPkg;
import crypto from 'crypto';
import { sleep } from './sleep.js';

const hashSeqno = (seqno) => {
    const hmac = crypto.createHmac('sha256', SERVICE_KEY);
    hmac.update(seqno.toString());
    return hmac.digest('hex').substring(0, 16);
};

const getWallet = async () => {
    const mnemonicArray = TON_WALLET_MNEMONIC.split(' ');
    const key = await mnemonicToWalletKey(mnemonicArray);

    const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: key.publicKey,
    });

    return { wallet, key };
};

export const sendTonUsdtTransfer = async ({ client, toAddress, amount }) => {
    try {
        if (!client) throw new Error("TonClient is required");
        if (!toAddress) throw new Error("Wrong address");
        if (!amount || isNaN(Number(amount))) throw new Error("Wrong amount");

        const { wallet, key } = await getWallet();
        const sender = client.open(wallet);

        const balance = await sender.getBalance();
        console.log(`Sender balance: ${fromNano(balance)} TON`);

        if (fromNano(balance) < 0.05) {
            throw new Error(`Not enough balance: ${fromNano(balance)} TON`);
        }

        const seqnoBefore = await sender.getSeqno();
        console.log('Current seqno:', seqnoBefore);

        const jettonAmount = BigInt(amount);

        const seqnoHash = hashSeqno(seqnoBefore);
        const comment = `Withdrawal from Frog Protocol ${seqnoHash}`;

        const forwardPayload = beginCell()
            .storeUint(0, 32)
            .storeBuffer(Buffer.from(comment, 'utf-8'))
            .endCell();

        const messageBody = beginCell()
            .storeUint(0xf8a7ea5, 32)
            .storeUint(0, 64)
            .storeCoins(jettonAmount)
            .storeAddress(Address.parse(toAddress))
            .storeAddress(wallet.address)
            .storeBit(0)
            .storeCoins(toNano("0.000000001"))
            .storeBit(1)
            .storeRef(forwardPayload)
            .endCell();

        const jettonWalletAddress = await getUsdtJettonWallet({ address: wallet.address.toString() });
        if (!jettonWalletAddress) {
            throw new Error("I can't get jetton wallet address");
        }

        const internalMessage = internal({
            to: Address.parse(jettonWalletAddress),
            value: toNano("0.05"),
            bounce: true,
            body: messageBody,
        });

        const startTime = Math.floor(Date.now() / 1000);

        await sender.sendTransfer({
            seqno: seqnoBefore,
            secretKey: key.secretKey,
            messages: [internalMessage],
            sendMode: 3,
        });


        let transactionSent = false;
        let retries = 100;

        while (retries > 0) {
            await sleep(2500);

            try {
                const seqnoAfter = await sender.getSeqno();
                console.log(`Checking seqno: ${seqnoBefore} -> ${seqnoAfter}`);

                if (seqnoAfter > seqnoBefore) {
                    console.log(`Transaction with seqno=${seqnoBefore} confirmed!`);
                    transactionSent = true;
                    break;
                }
            } catch (e) {
                console.log(`Error checking seqno: ${e.message}`);
            }

            retries--;
        }

        if (retries === 0) {
            console.log("Timeout waiting for transaction confirmation");
        }

        return {
            client,
            walletAddress: wallet.address,
            startTime,
            seqnoBefore,
            seqnoHash,
            success: transactionSent
        };
    } catch (error) {
        console.error("sendTonUsdtTransfer error:", error);
        return { success: false, error: error.message };
    }
};

// Функция для поиска хеша транзакции по хешу seqno
export const findTransactionHash = async ({ client, walletAddress, startTime, seqnoBefore, seqnoHash }) => {
    try {
        if (!client) throw new Error("TonClient is required");
        if (!walletAddress || !startTime || seqnoBefore === undefined || !seqnoHash) {
            throw new Error("Missing transaction parameters");
        }

        // Обработка адреса
        let walletAddr;
        try {
            if (typeof walletAddress === 'string') {
                walletAddr = Address.parse(walletAddress);
            } else if (walletAddress.toString) {
                walletAddr = walletAddress;
            } else {
                walletAddr = Address.parse(walletAddress.toString());
            }
        } catch (e) {
            console.error("Error parsing address:", e);
            throw new Error(`Invalid wallet address format: ${walletAddress}`);
        }

        let txHash = null;

        const result = await findTransactionBySeqno(client, walletAddr, startTime, 20, seqnoHash, seqnoBefore);

        if (result.found) {
            txHash = result.txHash;
            console.log(`Found transaction with comment containing seqno hash=${seqnoHash}, txHash: ${txHash}`);
        } else {
            console.log(`Transaction with seqno hash=${seqnoHash} not found, using time-based search...`);

            const transactions = await client.getTransactions(walletAddr, { limit: 20 });

            const recentTx = transactions.find(tx =>
                tx.now && tx.now >= startTime &&
                tx.inMessage && tx.inMessage.info && tx.inMessage.info.src === null
            );

            if (recentTx) {
                txHash = recentTx.hash().toString('hex');
                console.log(`Found recent transaction by time, txHash: ${txHash}`);
            }
        }

        return txHash
    } catch (error) {
        console.error("findTransactionHash error:", error);
        return null
    }
};



async function findTransactionBySeqno(client, walletAddress, startTime = 0, limit = 20, seqnoHash) {
    const result = {
        found: false,
        txHash: null,
        transaction: null,
    };

    const transactions = await client.getTransactions(walletAddress, { limit });

    for (const tx of transactions) {
        if (tx.now && tx.now < startTime) {
            continue;
        }

        if (tx.outMessages && tx.outMessages.size > 0) {
            let foundInOutMessages = false;

            for (const outMsg of tx.outMessages.values()) {
                if (!outMsg.body) continue;

                const msgData = decodeMessage(outMsg.body);

                if (msgData.opName === 'jetton_transfer' && msgData.forwardPayload) {
                    const forwardData = decodeMessage(msgData.forwardPayload);

                    if (forwardData.opName === 'comment' && forwardData.text) {
                        const comment = forwardData.text;

                        if (comment.includes(`protocol ${seqnoHash}`)) {
                            result.found = true;
                            result.txHash = tx.hash().toString('hex');
                            result.transaction = tx;
                            return result;
                        }
                    }
                }
            }

            if (foundInOutMessages) break;
        }

        if (tx.inMessage && tx.inMessage.body) {
            const inMsgData = decodeMessage(tx.inMessage.body);

            if (inMsgData.opName === 'comment' && inMsgData.text) {
                const comment = inMsgData.text;

                if (comment.includes(`protocol ${seqnoHash}`)) {
                    result.found = true;
                    result.txHash = tx.hash().toString('hex');
                    result.transaction = tx;
                    return result;
                }
            }
        }
    }

    return result;
}

function decodeMessage(body) {
    try {
        if (typeof body === 'string') {
            if (body.startsWith('x{') && body.endsWith('}')) {
                const cleanHex = body.substring(2, body.length - 1);
                const cell = Cell.fromBoc(Buffer.from(cleanHex, 'hex'))[0];
                return decodeCell(cell);
            }
            return { rawData: body };
        } else if (body && typeof body === 'object') {
            return decodeCell(body);
        } else {
            return { error: 'Unknown message format' };
        }
    } catch (error) {
        return {
            error: `Error decoding: ${error.message}`,
            rawData: body ? (typeof body === 'string' ? body : 'Cell object') : 'null'
        };
    }
}

function decodeCell(cell) {
    const slice = cell.beginParse();

    if (slice.remainingBits < 32) {
        return { type: 'empty', remainingBits: slice.remainingBits };
    }

    const opcode = slice.loadUint(32);

    let opName = 'unknown';
    let decodedData = {};

    switch (opcode) {
        case 0:
            opName = 'comment';
            if (slice.remainingBits > 0) {
                try {
                    decodedData.text = slice.loadStringTail();
                } catch (e) {
                    decodedData.error = `Ошибка при чтении комментария: ${e.message}`;
                }
            }
            break;
        case 0xD53276DB:
            opName = 'excesses';
            if (slice.remainingBits >= 64) {
                decodedData.queryId = slice.loadUint(64);
            }
            break;
        case 0xF8A7EA5:
            opName = 'jetton_transfer';
            if (slice.remainingBits >= 64) {
                decodedData.queryId = slice.loadUint(64);
                try {
                    if (slice.remainingBits > 0) {
                        decodedData.amount = slice.loadCoins().toString();
                        if (slice.remainingBits > 0) {
                            decodedData.destination = slice.loadAddress();

                            if (slice.remainingBits > 0) {
                                decodedData.responseDestination = slice.loadAddress();

                                if (slice.remainingBits > 0) {
                                    const customPayloadPresent = slice.loadBit();
                                    decodedData.customPayloadPresent = customPayloadPresent;

                                    if (customPayloadPresent && slice.remainingBits > 0) {
                                    }

                                    if (slice.remainingBits > 0) {
                                        decodedData.forwardAmount = slice.loadCoins().toString();

                                        if (slice.remainingBits > 0) {
                                            const forwardPayloadPresent = slice.loadBit();
                                            decodedData.forwardPayloadPresent = forwardPayloadPresent;

                                            if (forwardPayloadPresent && slice.remainingRefs > 0) {
                                                decodedData.forwardPayload = slice.loadRef();
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    decodedData.error = `Error reading data: ${e.message}`;
                }
            }
            break;
        case 0x7362D09C:
            opName = 'jetton_transfer_notification';
            if (slice.remainingBits >= 64) {
                decodedData.queryId = slice.loadUint(64);
                try {
                    if (slice.remainingBits > 0) {
                        decodedData.amount = slice.loadCoins().toString();
                        if (slice.remainingBits > 0) {
                            decodedData.sender = slice.loadAddress();

                            if (slice.remainingBits > 0) {
                                const forwardPayloadPresent = slice.loadBit();
                                decodedData.forwardPayloadPresent = forwardPayloadPresent;

                                if (forwardPayloadPresent) {
                                    if (slice.remainingRefs > 0) {
                                        decodedData.forwardPayload = slice.loadRef();
                                    } else if (slice.remainingBits > 0) {
                                        decodedData.forwardPayloadInline = true;
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    decodedData.error = `Error reading data: ${e.message}`;
                }
            }
            break;
        default:
            opName = 'unknown';
    }

    return {
        opcode: `0x${opcode.toString(16).toUpperCase()}`,
        opName,
        ...decodedData
    };
}



