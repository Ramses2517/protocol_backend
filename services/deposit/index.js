import { getPgClient } from "../shared/helpers/pgClient.js";
import { TON_DEPOSIT_WALLET, TON_USDT } from "../shared/constants/tonAddresses.js";
import { getTonAddress } from "../shared/utils/getTonAddress.js";
import { TONX_RPC_URL } from "../shared/constants/urls.js";
import { sleep } from "../shared/utils/sleep.js";

const getLastDepositTimestamp = async ({ pgClient }) => {
    try {
        const query = `
            SELECT timestamp    
            FROM protocol_deposits
            ORDER BY timestamp DESC
            LIMIT 1;
        `;
        const result = await pgClient.query(query);
        if (result.rows.length) {
            return Number(result.rows[0].timestamp) + 1;
        }
        return Math.floor(Date.now() / 1000) - 300;
    } catch (error) {
        console.log("getLastDepositTimestamp error", error);
        return Math.floor(Date.now() / 1000) - 300;
    }
};

const getIncomingJettonTransfers = async ({ startUtime, endUtime }) => {
    try {
        const payload = {
            id: 1,
            jsonrpc: "2.0",
            method: "getJettonTransfers",
            params: {
                address: TON_DEPOSIT_WALLET,
                sort: "DESC",
                jetton_master: TON_USDT,
                start_utime: startUtime,
                end_utime: endUtime,
            },
        };

        const res = await fetch(TONX_RPC_URL, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const json = await res.json();
        return json?.result || [];
    } catch (error) {
        console.log("getIncomingJettonTransfers error", error);
        return [];
    }
};



const saveDepositAndUpdateBalance = async ({ pgClient, deposit }) => {
    try {
        const {
            userWallet,
            txHash,
            amount,
            createdAt,
        } = deposit;

        await pgClient.query("BEGIN");

        const insertDepositQuery = `
            INSERT INTO protocol_deposits (tx_hash, user_wallet, amount, timestamp)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tx_hash) DO NOTHING
            RETURNING tx_hash;
        `;

        const result = await pgClient.query(insertDepositQuery, [
            txHash,
            userWallet,
            amount,
            createdAt,
        ]);


        if (result.rows.length) {
            const updateBalanceQuery = `
            INSERT INTO protocol_wallet_usdt (wallet, amount)
            VALUES ($1, $2)
            ON CONFLICT (wallet) DO UPDATE
            SET amount = protocol_wallet_usdt.amount + EXCLUDED.amount;
        `;

            await pgClient.query(updateBalanceQuery, [userWallet, amount]);
        }

        await pgClient.query("COMMIT");

        return true;
    } catch (error) {
        await pgClient.query("ROLLBACK");
        console.log("saveDepositAndUpdateBalance error", error);
        return false;
    }
};

const processDeposits = async () => {
    const pgClient = await getPgClient();
    try {
        const startUtime = await getLastDepositTimestamp({ pgClient });
        const endUtime = Math.floor(Date.now() / 1000);

        console.log('checking...')

        const transfers = await getIncomingJettonTransfers({ startUtime, endUtime });
        console.log(`Found ${transfers.length} new transfers`);

        for (const transfer of transfers) {
            const destination = getTonAddress({ address: transfer.destination, bounce: false });
            const source = getTonAddress({ address: transfer.source, bounce: false });
            const amount = transfer.amount;
            const txHash = transfer.transaction_hash;
            const createdAt = transfer.transaction_now;

            if (destination !== TON_DEPOSIT_WALLET) {
                continue;
            }

            await saveDepositAndUpdateBalance({
                pgClient,
                deposit: {
                    userWallet: source,
                    txHash,
                    amount,
                    createdAt,
                },
            });
        }
        console.log('done')
    } catch (error) {
        console.log("processDeposits error", error);
    } finally {
        await pgClient.end();
    }
};

const listener = async () => {
    console.log("🟢 Start DEPOSIT SERVICE");
    while (true) {
        await processDeposits();
        await sleep(500);
    }
};

listener();