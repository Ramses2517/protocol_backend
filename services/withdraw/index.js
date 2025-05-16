import { getPgClient } from "../shared/helpers/pgClient.js";
import { sleep } from "../shared/utils/sleep.js";
import { sendTonUsdtTransfer, findTransactionHash } from "../shared/utils/withdraw.js";
import { TonClient } from '@ton/ton';
import { TON_CENTER_API_KEY } from "../shared/constants/keys.js";
import { TON_CENTER_API_URL } from "../shared/constants/urls.js";

const getPendingWithdraws = async ({ pgClient }) => {
    try {
        const query = `
            SELECT id, user_wallet, amount, timestamp
            FROM protocol_withdraws
            WHERE tx_hash IS NULL
            ORDER BY timestamp ASC;
        `;
        const result = await pgClient.query(query);
        return result.rows;
    } catch (error) {
        console.log("getPendingWithdraws error", error);
        return [];
    }
};

const updateWithdrawStatus = async ({ pgClient, withdrawId, txHash }) => {
    try {
        await pgClient.query("BEGIN");

        const updateQuery = `
            UPDATE protocol_withdraws
            SET tx_hash = $1
            WHERE id = $2;
        `;

        await pgClient.query(updateQuery, [txHash, withdrawId]);
        await pgClient.query("COMMIT");

        return true;
    } catch (error) {
        await pgClient.query("ROLLBACK");
        console.log("updateWithdrawStatus error", error);
        return false;
    }
};

const processWithdraws = async () => {
    const pgClient = await getPgClient();
    try {
        const client = new TonClient({
            endpoint: TON_CENTER_API_URL,
            apiKey: TON_CENTER_API_KEY
        });

        const pendingWithdraws = await getPendingWithdraws({ pgClient });
        console.log(`Found ${pendingWithdraws.length} pending withdrawals`);

        for (const withdraw of pendingWithdraws) {
            const { id, user_wallet, amount } = withdraw;

            console.log(`Processing withdrawal: ID ${id}, Amount: ${amount}, Wallet: ${user_wallet}`);

            const transferResult = await sendTonUsdtTransfer({
                client,
                toAddress: user_wallet,
                amount: amount
            });

            if (!transferResult || !transferResult.success) {
                console.log(`Failed to create transaction for withdrawal ID ${id}: ${transferResult?.error || 'Unknown error'}`);
                continue;
            }

            console.log(`Transaction created for withdrawal ID ${id}`);

            await sleep(3000);

            const txHash = await findTransactionHash({
                client,
                walletAddress: transferResult.walletAddress,
                startTime: transferResult.startTime,
                seqnoBefore: transferResult.seqnoBefore,
                seqnoHash: transferResult.seqnoHash
            });

            await updateWithdrawStatus({
                pgClient,
                withdrawId: id,
                txHash: txHash || 'transaction_not_found'
            });

            console.log(`Withdrawal ID ${id} processed: TxHash = ${txHash || 'not found'}`);

            // Задержка между обработкой заявок
            await sleep(1000);
        }

        console.log('Processing complete');
    } catch (error) {
        console.log("processWithdraws error", error);
    } finally {
        await pgClient.end();
    }
};

const listener = async () => {
    console.log("🟢 Starting WITHDRAW SERVICE");
    while (true) {
        await processWithdraws();
        await sleep(5000);
    }
};

listener();
