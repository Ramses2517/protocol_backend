import { TONX_RPC_URL } from "../constants/urls.js";
import { TON_USDT } from "../constants/tonAddresses.js";

export const getUsdtOnChainBalance = async ({ address }) => {
  try {
    const response = await fetch(TONX_RPC_URL
        , {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "getAccountJettonBalance",
        params: {
          account_id: address,
          jetton_id: TON_USDT
        },
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.log("getUsdtOnChainBalance error", data.error);
      return null;
    }
    return typeConversion(data.result)
  } catch (error) {
    console.log("getUsdtOnChainBalance", address, error);
    return null;
  }
};


const typeConversion = (object) => {
    return Number(object.balance)
}