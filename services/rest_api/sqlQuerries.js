// protocol/sqlQueries.js


export const getUserByTelegramIdSql = () => {
    return `SELECT telegram_id,
                     user_name,
                     visits,
                     last_visit
              FROM protocol_info_users
              WHERE telegram_id = $1;`;
  };
  
  export const insertUserSql = () => {
    return `INSERT INTO protocol_info_users
              (telegram_id,
               user_name,
               last_visit)
              VALUES ($1, $2, $3);`;
  };
  
  export const updateUserSql = () => {
    return `UPDATE protocol_info_users
              SET visits     = $1,
                  last_visit = $2
              WHERE telegram_id = $3;`;
  };
  
  export const getWalletByUserIdSql = () => {
    return `SELECT address
              FROM protocol_info_wallets
              WHERE user_id = $1 AND address = $2
              ORDER BY id;`;
  };
  
  export const insertWalletSql = () => {
    return `INSERT INTO protocol_info_wallets
              (user_id,
               address,
               created)
              VALUES ($1, $2, $3);`;
  };

export const getProtocolTokensSql = () => `
    SELECT address, symbol, decimals, logo_url
    FROM protocol_tokens;
`;

// --- protocol_user_tokens ---
export const insertProtocolUserTokenSql = () => `
    INSERT INTO protocol_user_tokens (wallet, token_mint, amount)
    VALUES ($1, $2, $3)
    ON CONFLICT (wallet, token_mint)
    DO UPDATE SET amount = protocol_user_tokens.amount + EXCLUDED.amount;
`;


export const getProtocolUserTokensByWalletSql = () => `
    SELECT wallet, token_mint, amount
    FROM protocol_user_tokens
    WHERE wallet = $1;
`;

// --- protocol_wallet_usdt ---
export const insertProtocolWalletUsdtSql = () => `
    INSERT INTO protocol_wallet_usdt (wallet, amount)
    VALUES ($1, $2)
    ON CONFLICT (wallet)
    DO UPDATE SET amount = protocol_wallet_usdt.amount + EXCLUDED.amount;
`;


export const getProtocolWalletUsdtByWalletSql = () => `
    SELECT wallet, amount
    FROM protocol_wallet_usdt
    WHERE wallet = $1;
`;

// --- protocol_transactions ---
export const insertProtocolTransactionSql = () => `
    INSERT INTO protocol_transactions (tx_hash, user_wallet, token_mint, tx_type, amount, timestamp, usdt_amount)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING tx_hash;
`;

export const getProtocolTransactionsByWalletSql = () => `
    SELECT tx_hash, user_wallet, token_mint, tx_type, amount, timestamp
    FROM protocol_transactions
    WHERE user_wallet = $1
    ORDER BY timestamp DESC;
`;

export const getProtocolTransactionsByWalletAndTokenSql = () => `
    SELECT tx_hash, user_wallet, token_mint, tx_type, amount, timestamp
    FROM protocol_transactions
    WHERE user_wallet = $1 AND token_mint = $2
    ORDER BY timestamp DESC;
`;

export const getProtocolTransactionByHashSql = () => `
    SELECT tx_hash, user_wallet, token_mint, tx_type, amount, timestamp
    FROM protocol_transactions
    WHERE tx_hash = $1;
`;

export const insertProtocolWithdrawSql = () => `
    INSERT INTO protocol_withdraws (user_wallet, amount, timestamp)
    VALUES ($1, $2, $3);
`;


export const getRecentTokensSql = () => `
    SELECT DISTINCT token_mint
    FROM (SELECT token_mint
          FROM protocol_transactions
          WHERE user_wallet = $1
          ORDER BY timestamp DESC
          LIMIT 1000) AS X;
`;


export const getTokenSql = () => `
    SELECT address, symbol, decimals, logo_url
    FROM protocol_tokens
    WHERE address = $1;
`;