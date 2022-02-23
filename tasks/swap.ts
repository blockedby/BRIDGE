import { task } from "hardhat/config";

task("swap", "Make swap")
.setAction(async function (taskArguments, hre) {
    const etChainIDtestnet = 4;
    const bnChainIDtestnet = 97;
    const bncAddress = "0x991879fd7a029E9788FB74925Aa8B7FCdc8F745d";
    const ethAddress = "0xEC1d65396Ff9ECabA09F3dfcF01d0AEA1D9e7C15";
    const _to = "0xccA210e7C05322379F801a07F320E863efE68f80"
    const _amount = hre.ethers.utils.parseEther("10");
    const _chainID = bnChainIDtestnet;
    const _tokenSymbol = "KCNC";
    const contract = await hre.ethers.getContractAt("Bridge",ethAddress);
    const transactionResponse = await contract.swap(_to,_amount,_chainID,_tokenSymbol);
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});