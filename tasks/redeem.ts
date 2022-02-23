
import { task } from "hardhat/config";

task("redeem", "Make redeem")
.setAction(async function (taskArguments, hre) {
    const [validator] = await hre.ethers.getSigners();
    const etChainIDtestnet = 4;
    const bnChainIDtestnet = 97;
    const bncAddress = "0x991879fd7a029E9788FB74925Aa8B7FCdc8F745d";
    const ethAddress = "0xEC1d65396Ff9ECabA09F3dfcF01d0AEA1D9e7C15";
    const _to = "0xccA210e7C05322379F801a07F320E863efE68f80"
    const _amount = hre.ethers.utils.parseEther("10");
    const _chainID = bnChainIDtestnet;
    const _nonce = 1;
    const _tokenSymbol = "KCNC";
    const contract = await hre.ethers.getContractAt("Bridge",ethAddress);
    const amountToSwap = hre.ethers.utils.parseEther("100");
 
      const cryptedMessage = hre.ethers.utils.solidityKeccak256(
        ["address","uint256","uint256","string","uint256"],
        [_to, amountToSwap, 
          bnChainIDtestnet,_tokenSymbol,_nonce]);
      const arrayify = hre.ethers.utils.arrayify(cryptedMessage);
      const flatSig = await validator.signMessage(arrayify);
      
    const transactionResponse = await contract.redeem(_to,_amount,_chainID,_tokenSymbol,flatSig);
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});
