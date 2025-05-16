import { TON, SOLANA } from "../shared/constants/networks.js";
import { PublicKey } from "@solana/web3.js";
import TonWeb from "tonweb";

export const validateAddress = ({ address, type }) => {
    try {
        if (type === TON) {
        return { valid: isValidTonAddress(address), value: address };
      } else if (type === SOLANA) {
        return { valid: isValidSolanaAddress(address), value: address };
      } 
    } catch (error) {
      return { valid: false, value: address };
    }
  };
  
  const isValidSolanaAddress = (address) => {
    try {
      new PublicKey(address);
      return PublicKey.isOnCurve(new PublicKey(address).toBuffer());
    } catch (e) {
      return false;
    }
  };
  
  
  export const isValidTonAddress = (address) => {
    try {
      new TonWeb.utils.Address(address);
      return true;
    } catch (e) {
      return false;
    }
  };

  const BOOLEAN_VALUES = {
    true: true,
    false: false,
  };
  
  const isNumeric = (value) => {
    try {
      return /^\d+$/.test(value);
    } catch (error) {
      return false;
    }
  };
  
  export const validateNumber = ({ value }) => {
    try {
      if (Object.keys(BOOLEAN_VALUES).includes(value)) {
        return { valid: false, value: value };
      }
      return { valid: isNumeric(value), value: Number(value) };
    } catch (error) {
      return { valid: false, value: value };
    }
  };

export const checkAllParameters = ({ parameters }) => {
    return parameters.every((x) => x.valid === true);
  };

