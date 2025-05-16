import { JUPITER_SWAP_API_URL } from "../constants/urls.js";

export const getSwapData = async ({ quoteData, executorKeypair }) => {
    try {
        const receivedAmount = quoteData.outAmount;

        const swapRequestBody = {
            quoteResponse: quoteData,
            userPublicKey: executorKeypair.publicKey.toString(),
            wrapAndUnwrapSol: true,
        };

        const swapResponse = await fetch(JUPITER_SWAP_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(swapRequestBody)
        });

        const swapData = await swapResponse.json();
        if (!swapData) {
            throw new Error("Cant get swap data");
        }
        if (swapData.error) {
            throw new Error(swapData.error);
        }

        return {
            receivedAmount,
            swapData
        };
    } catch (error) {
        console.error('getSwapData', error);
        return null;
    }
};

