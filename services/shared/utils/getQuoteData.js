import { JUPITER_QUOTE_API_URL } from "../constants/urls.js";

export const getQuoteData = async ({ inputMint, outputMint, amount }) => {
    try {
        const quoteResponse = await fetch(`${JUPITER_QUOTE_API_URL}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=100`);
        const quoteData = await quoteResponse.json();
        if (quoteData.error) {
            throw new Error(quoteData.error);
        }
        return quoteData;
    } catch (error) {
        console.error('getQuoteData', inputMint, outputMint, amount, error);
        return null
    }
};
