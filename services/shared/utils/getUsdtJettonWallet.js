import { TONX_RPC_URL } from "../constants/urls.js";
import { TON_USDT } from "../constants/tonAddresses.js";
import { getTonAddress } from "./getTonAddress.js";
export const getUsdtJettonWallet = async ({ address }) => {
    try {
      const response = await fetch(TONX_RPC_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "getJettonWallets",
          params: {
            jetton_address: TON_USDT,
            owner_address: address
          },
        }),
      });
  
      const data = await response.json();
      
      if (data.error) {
        console.log("getUsdtJettonWallet error", data.error);
        return null;
      }
      
      if (!data.result || !data.result.length) {
        return null;
      }
      return getTonAddress({address: data.result[0].address, bounce:true})

    } catch (error) {
      console.log("getUsdtJettonWallet", address, error);
      return null;
    }
  };