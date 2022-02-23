
import { ethers } from "hardhat";

async function main() {
  const etChainIDtestnet = 4;
  const bnChainIDtestnet = 97;

  const BNCBridge = await ethers.getContractFactory("Bridge");
  const BNCbridge = await BNCBridge.deploy(bnChainIDtestnet);
  // console.log("My balance ",await ethers.provider.getBalance()
  await BNCbridge.deployed();

  console.log("BNCbridge deployed to:", BNCbridge.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
