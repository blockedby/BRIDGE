
import { ethers } from "hardhat";

async function main() {
  const etChainIDtestnet = 4;
  const bnChainIDtestnet = 97;
  const [validator] = await ethers.getSigners();
  console.log('Validator is account:', validator.address);

  const amountToSwap = ethers.utils.parseEther("100");
  let args =[
    // to,
    validator.address,
    // amount,
    10,
    // chainID,
    97,
    // symbol,
    "KCNC",
    // nonce
    1
    ]

  const cryptedMessage = ethers.utils.solidityKeccak256(
    ["address","uint256","uint256","string","uint256"],
    args);
  const arrayify = ethers.utils.arrayify(cryptedMessage);
  const flatSig = await validator.signMessage(arrayify);

  // console.log("My balance ",await ethers.provider.getBalance()

  console.log("Message signed, \n", flatSig);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
