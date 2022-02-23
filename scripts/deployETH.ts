
import { ethers } from "hardhat";

async function main() {
  const etChainIDtestnet = 4;
  const bnChainIDtestnet = 97;

  const ETHBridge = await ethers.getContractFactory("Bridge");
  const ethbridge = await ETHBridge.deploy(etChainIDtestnet);

  await ethbridge.deployed();

  console.log("ETHbridge deployed to:", ethbridge.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
