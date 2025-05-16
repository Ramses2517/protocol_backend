// protocol/typeConversion.js

export const protocolTokenTypeConversion = ({ tokenObject }) => {
    return {
        address: tokenObject.address,
        symbol: tokenObject.symbol,
        decimals: Number(tokenObject.decimals),
        logo_url: tokenObject.logo_url ?? null,
    };
};

export const protocolUserTokenTypeConversion = ({ tokenObject }) => {
    return {
        wallet: tokenObject.wallet,
        token_mint: tokenObject.token_mint,
        amount: Number(tokenObject.amount), // rawAmount, не делим
    };
};


export const protocolTransactionTypeConversion = ({ transactionObject }) => {
    return {
        tx_hash: transactionObject.tx_hash,
        user_wallet: transactionObject.user_wallet,
        token_mint: transactionObject.token_mint,
        tx_type: transactionObject.tx_type,
        amount: Number(transactionObject.amount), // rawAmount
        timestamp: Number(transactionObject.timestamp),
    };
};

// Новые функции конверсии типов

export const userTypeConversion = ({ userObject }) => {
    return {
        telegram_id: userObject.telegram_id,
        user_name: userObject.user_name,
        visits: Number(userObject.visits || 0),
        last_visit: Number(userObject.last_visit || 0)
    };
};



export const recentTokensTypeConversion = ({ tokens }) => {
    return tokens; // Здесь уже массив строк, не требуется дополнительная конверсия
};

export const tokenPriceTypeConversion = ({ price }) => {
    return Number(price || 0);
};

