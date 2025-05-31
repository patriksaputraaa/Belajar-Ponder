import { createConfig } from "ponder";
import { Erc20Abi } from "./abis/erc20Abi";

export default createConfig({
  chains: {
    arbitrum: {
      id: 42161,
      rpc: process.env.PONDER_RPC_URL_42161!,
    },
  },
  contracts: {
    ERC20: {
      chain: "arbitrum",
      abi: Erc20Abi,
      address: "0xC99522da19b62ff5035355ACBe3Ebfef1F58Bc59",
      startBlock: 342109081,
    },
  },
});
