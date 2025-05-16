// protocol/index.js

import express from "express";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { requestHandlers } from "./requestHandlers.js";
import { REST_API_HOST, REST_API_PORT } from "../shared/constants/settings.js";
import { VALID_REQUEST, BAD_REQUEST, INTERNAL_ERROR, errorsMessages } from "../shared/constants/httpCodes.js";
import { SERVICE_KEY } from "../shared/constants/service.js";
import { verifyTelegramWebAppData } from "./auth.js";

const app = express();
const mainPath = "/protocol/api/v1";

app.use(bodyParser.json());

// CORS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, web-tg-code");
    next();
});


export const authenticateToken = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
  
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(BAD_REQUEST).json({
          status: BAD_REQUEST,
          name: errorsMessages[BAD_REQUEST].name,
          message: "Authorization token is missing or invalid",
        });
      }
      const token = authHeader.split(" ")[1];
  
      jwt.verify(token, SERVICE_KEY, (err, decoded) => {
        if (err) {
          return res.status(BAD_REQUEST).json({
            status: BAD_REQUEST,
            name: errorsMessages[BAD_REQUEST].name,
            message: "Invalid or expired token",
          });
        }
        req.user = decoded;
        next();
      });
    } catch (error) {
      console.error("Token verification error:", error);
  
      res.status(INTERNAL_ERROR).json({
        status: INTERNAL_ERROR,
        name: errorsMessages[INTERNAL_ERROR].name,
        message: errorsMessages[INTERNAL_ERROR].message,
      });
    }
  };

// --- Healthcheck ---
app.get(`${mainPath}/health`, (req, res) => {
    res.status(VALID_REQUEST).json({ status: VALID_REQUEST });
});


app.post(`${mainPath}/auth/login`, async (req, res) => {
    try {
      const initData = req.headers["web-tg-code"];
      const verify = verifyTelegramWebAppData(initData);
  
      if (!verify.isValid) {
        return res.status(BAD_REQUEST).json({
          status: BAD_REQUEST,
          name: errorsMessages[BAD_REQUEST].name,
        });
      }

  
      const telegramId = verify.userId;
      const userName = verify.userName;
  
      const { ok, token } = await requestHandlers.authenticateUser({
        telegramId,
        userName,
      });
  
      if (ok) {
        res.status(VALID_REQUEST).json({
          status: VALID_REQUEST,
          token,
        });
      } else {
        res.status(INTERNAL_ERROR).json({
          status: INTERNAL_ERROR,
          name: errorsMessages[INTERNAL_ERROR].name,
          message: "Failed to authenticate user.",
        });
      }
    } catch (error) {
      console.error("Error during authentication:", error);
  
      res.status(INTERNAL_ERROR).json({
        status: INTERNAL_ERROR,
        name: errorsMessages[INTERNAL_ERROR].name,
        message: errorsMessages[INTERNAL_ERROR].message,
      });
    }
  });

// --- Wallet management ---
app.post(`${mainPath}/add`, authenticateToken, async (req, res) => {
    try {
        const { wallet } = req.body;
        const userId = req.user.telegramId;
        
        const [ok] = await requestHandlers.addWallet({ userId, wallet });
        
        if (ok) {
            res.status(VALID_REQUEST).json({ 
                status: VALID_REQUEST,
                result: { success: true }
            });
        } else {
            res.status(BAD_REQUEST).json({
                status: BAD_REQUEST,
                name: errorsMessages[BAD_REQUEST].name,
                message: "Failed to add wallet"
            });
        }
    } catch (error) {
        console.error("add", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});

// --- TON USDT operations ---

app.get(`${mainPath}/usdt_onchain_balance/:wallet`, authenticateToken, async (req, res) => {
    try {
        const { wallet } = req.params;
        const userId = req.user.telegramId;
        
        const [ok, balance] = await requestHandlers.getOnChainUsdtBalance({ wallet, userId });
        
        if (ok) {
            res.status(VALID_REQUEST).json({ 
                status: VALID_REQUEST,
                result: balance
            });
        } else {
            res.status(BAD_REQUEST).json({
                status: BAD_REQUEST,
                name: errorsMessages[BAD_REQUEST].name,
                message: "Failed to get TON USDT balance"
            });
        }
    } catch (error) {
        console.error("usdt_onchain_balance", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});

app.get(`${mainPath}/ton_jetton_wallet/:wallet`, authenticateToken, async (req, res) => {
    try {
        const { wallet } = req.params;
        const userId = req.user.telegramId;
        
        const [ok, walletInfo] = await requestHandlers.getUsdtJettonWallet({ wallet, userId });
        
        if (ok) {
            res.status(VALID_REQUEST).json({ 
                status: VALID_REQUEST,
                result: walletInfo
            });
        } else {
            res.status(BAD_REQUEST).json({
                status: BAD_REQUEST,
                name: errorsMessages[BAD_REQUEST].name,
                message: "Failed to get TON USDT wallet information"
            });
        }
    } catch (error) {
        console.error("ton_jetton_wallet", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});

// --- Recent tokens ---

app.get(`${mainPath}/recent_tokens/:wallet`, authenticateToken, async (req, res) => {
    try {
        const { wallet } = req.params;
        const userId = req.user.telegramId;
        
        const [ok, tokens] = await requestHandlers.getRecentTokens({ wallet, userId });
        
        if (ok) {
            res.status(VALID_REQUEST).json({ 
                status: VALID_REQUEST,
                result: tokens
            });
        } else {
            res.status(BAD_REQUEST).json({
                status: BAD_REQUEST,
                name: errorsMessages[BAD_REQUEST].name,
                message: "Failed to get recent tokens"
            });
        }
    } catch (error) {
        console.error("recent_tokens", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});

app.get(`${mainPath}/token_price/:mint`, authenticateToken, async (req, res) => {
    try {
        const { mint } = req.params;
        
        const [ok, priceInfo] = await requestHandlers.getTokenPrice({ tokenMint: mint });
        
        if (ok) {
            res.status(VALID_REQUEST).json({ 
                status: VALID_REQUEST,
                result: priceInfo
            });
        } else {
            res.status(BAD_REQUEST).json({
                status: BAD_REQUEST,
                name: errorsMessages[BAD_REQUEST].name,
                message: "Failed to get token price"
            });
        }
    } catch (error) {
        console.error("token_price", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});

app.get(`${mainPath}/tokens`, authenticateToken, async (req, res) => {
    try {
        const [ok, tokens] = await requestHandlers.getTokens();
        res.status(VALID_REQUEST).json({ status: VALID_REQUEST, result: tokens });
    } catch (error) {
        console.error("tokens", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});

// --- protocol_user_tokens ---

app.get(`${mainPath}/user_tokens/:wallet`, authenticateToken, async (req, res) => {
    try {
        const { wallet } = req.params;
        const initData = req.headers["web-tg-code"];
        const verify = verifyTelegramWebAppData(initData);

    
        if (!verify.isValid) {
          return res.status(BAD_REQUEST).json({
            status: BAD_REQUEST,
            name: errorsMessages[BAD_REQUEST].name,
          });
        }
        const userId = verify.userId;
        const [ok, tokens] = await requestHandlers.getUserTokens({ wallet, userId });
        res.status(VALID_REQUEST).json({ status: VALID_REQUEST, result: tokens });
    } catch (error) {
        console.error("user_tokens", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});

// --- protocol_wallet_usdt ---

app.get(`${mainPath}/user_usdt/:wallet`, authenticateToken, async (req, res) => {
    try {
        const { wallet } = req.params;
        const initData = req.headers["web-tg-code"];
        const verify = verifyTelegramWebAppData(initData);
    
        if (!verify.isValid) {
          return res.status(BAD_REQUEST).json({
            status: BAD_REQUEST,
            name: errorsMessages[BAD_REQUEST].name,
          });
        }
    
        const userId = verify.userId;
        const [ok, balance] = await requestHandlers.getUserUsdtBalance({ wallet, userId });
        res.status(VALID_REQUEST).json({ status: VALID_REQUEST, result: balance });
    } catch (error) {
        console.error("user_usdt", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});




// --- Buy Token (USDT -> Token) ---

app.post(`${mainPath}/buy`, authenticateToken, async (req, res) => {
    try {
        const { wallet, output_mint, usdt_amount } = req.body;
        const initData = req.headers["web-tg-code"];
        const verify = verifyTelegramWebAppData(initData);
    
        if (!verify.isValid) {
          return res.status(BAD_REQUEST).json({
            status: BAD_REQUEST,
            name: errorsMessages[BAD_REQUEST].name,
          });
        }
    
        const userId = verify.userId;
        const [ok, result] = await requestHandlers.buyToken({
            wallet,
            outputMint: output_mint,
            usdtAmountRaw: usdt_amount,
            userId
        });
        if (ok) {
            res.status(VALID_REQUEST).json({ status: VALID_REQUEST, result });
        } else {
            res.status(BAD_REQUEST).json({
                status: BAD_REQUEST,
                name: errorsMessages[BAD_REQUEST].name,
                message: errorsMessages[BAD_REQUEST].message,
            });
        }
    } catch (error) {
        console.error("buy", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});

// --- Sell Token (Token -> USDT) ---

app.post(`${mainPath}/sell`, authenticateToken, async (req, res) => {
    try {
        const { wallet, input_mint, token_amount } = req.body;
        const initData = req.headers["web-tg-code"];
        const verify = verifyTelegramWebAppData(initData);
    
        if (!verify.isValid) {
          return res.status(BAD_REQUEST).json({
            status: BAD_REQUEST,
            name: errorsMessages[BAD_REQUEST].name,
          });
        }
    
        const userId = verify.userId;
        const [ok, result] = await requestHandlers.sellToken({
            wallet,
            inputMint: input_mint,
            tokenAmountRaw: token_amount,
            userId
        });
        if (ok) {
            res.status(VALID_REQUEST).json({ status: VALID_REQUEST, result });
        } else {
            res.status(BAD_REQUEST).json({
                status: BAD_REQUEST,
                name: errorsMessages[BAD_REQUEST].name,
                message: errorsMessages[BAD_REQUEST].message,
            });
        }
    } catch (error) {
        console.error("sell", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});


app.post(`${mainPath}/withdraw`, authenticateToken, async (req, res) => {
    try {
        const { wallet, amount } = req.body;
        const initData = req.headers["web-tg-code"];
        const verify = verifyTelegramWebAppData(initData);
    
        if (!verify.isValid) {
          return res.status(BAD_REQUEST).json({
            status: BAD_REQUEST,
            name: errorsMessages[BAD_REQUEST].name,
          });
        }
      
        const userId = verify.userId
        const [ok, result] = await requestHandlers.withdrawUsdt({ wallet, amount, userId });


        if (ok) {
            res.status(VALID_REQUEST).json({ status: VALID_REQUEST, result });
        } else {
            res.status(BAD_REQUEST).json({
                status: BAD_REQUEST,
                name: errorsMessages[BAD_REQUEST].name,
                message: result || errorsMessages[BAD_REQUEST].message,
            });
        }
    } catch (error) {
        console.error("withdraw", error);
        res.status(INTERNAL_ERROR).json({
            status: INTERNAL_ERROR,
            name: errorsMessages[INTERNAL_ERROR].name,
            message: errorsMessages[INTERNAL_ERROR].message,
        });
    }
});

// --- start server ---

app.listen(REST_API_PORT, REST_API_HOST, () => {
    console.log(`🟢 REST API running at http://${REST_API_HOST}:${REST_API_PORT}`);
});