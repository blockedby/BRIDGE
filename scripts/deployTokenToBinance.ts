import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);
  const Token = await ethers.getContractFactory('ZepToken');
  const token = await Token.deploy(1000);

  console.log('Token address:', token.address);
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
