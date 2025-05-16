import TonWeb from "tonweb";

export const getTonAddress = ({ address, bounce }) => {
  return new TonWeb.utils.Address(address).toString(true, true, bounce);
};
