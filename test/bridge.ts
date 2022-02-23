import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { ethers } from "hardhat";

function toEther(num:number){
    return ethers.utils.parseEther(String(num));
}
const etChainIDtestnet = 4;
const bnChainIDtestnet = 97;

describe("Bridge", function () {
  let 
    owner:SignerWithAddress,
    alice:SignerWithAddress,
    bob:SignerWithAddress,
    validator:SignerWithAddress,
    ETHBridge: ContractFactory,
    BNCBridge: ContractFactory,
    ethTokenFactory: ContractFactory,
    bridge: Contract,
    binance: Contract,
    ethToken: Contract,
    bncToken: Contract,
    KCNC:string,
    ethOwner:Contract,
    bncOwner:Contract,
    tempAddress:string
  before(async () => {
    [owner,alice,bob,validator] = await  ethers.getSigners();
    ETHBridge = await ethers.getContractFactory("Bridge",owner);
    BNCBridge = await ethers.getContractFactory("Bridge",owner);
    ethTokenFactory = await ethers.getContractFactory("ZepToken");
    tempAddress = "0x52815Fdd39b816D518815aa737ab14e97D4886AF";

  });
  beforeEach(async () => {
    bridge = await ETHBridge.deploy(etChainIDtestnet);
    binance = await BNCBridge.deploy(bnChainIDtestnet);
    ethToken = await ethTokenFactory.deploy(ethers.utils.parseEther("10000"));
    bncToken = await ethTokenFactory.deploy(ethers.utils.parseEther("10000"));

    await bridge.deployed();
    await binance.deployed();
    await ethToken.deployed();
    await ethToken.connect(owner).setOwner(bridge.address);
    await bncToken.deployed();
    await bncToken.connect(owner).setOwner(binance.address);
    KCNC = await ethToken.symbol();
    ethOwner = bridge.connect(owner);
    bncOwner = binance.connect(owner);

  });
  describe("Basic operations", function () {
    async function tsAddToken() {
      expect( await ethOwner.isTokenAdded(KCNC)).to.eq(false);
      await expect( ethOwner.isTokenActive(KCNC)).to.revertedWith("");
      await ethOwner.setGateway(bnChainIDtestnet,tempAddress);
      await ethOwner.addToken(ethToken.address,bncToken.address,bnChainIDtestnet);
      await expect(ethOwner.addToken(ethToken.address,bncToken.address,bnChainIDtestnet)).to.be.revertedWith("");
    }
    it('Should set and get chainID', async () => {

      const currentChainID = await bridge.chainID();
      await ethOwner.setChainID(100);
      expect (await bridge.chainID()).to.eq(100);
      await ethOwner.grantRole(await ethOwner.MODERATOR(),alice.address);
      await ethOwner.grantRole(await ethOwner.VALIDATOR(),bob.address);
      await expect (bridge.connect(alice).setChainID(1314)).to.be.revertedWith("");
      await expect (bridge.connect(bob).setChainID(1314)).to.be.revertedWith("");

    });

    it('Should set and get gateways', async () => {
      let anotherChainID = 100;
      await expect(ethOwner.getGateway(anotherChainID)).to.be.revertedWith("");
      await expect(ethOwner.setGateway(etChainIDtestnet,tempAddress)).to.be.revertedWith("");

      await ethOwner.setGateway(anotherChainID,tempAddress);
      expect(await ethOwner.getGateway(anotherChainID)).to.eq(tempAddress);
    });
    it('Should set and get validator', async () => {
      const validator = await bridge.validator();
      await ethOwner.setValidator(tempAddress);
      expect(await bridge.validator()).to.eq(tempAddress);
    });
    it('Should add token and get token address', async () => {
      // await expect(ethOwner.addToken(ethToken.address,bncToken.address,etChainIDtestnet)).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Wrong chain ID'");
      await expect(bridge.getTokenAddress(KCNC)).to.be.revertedWith("")
      await tsAddToken();
      expect(await bridge.getTokenAddress(KCNC)).to.eq(ethToken.address);
      // wrong token
      await expect(ethOwner.addToken(ethers.constants.AddressZero,bncToken.address,bnChainIDtestnet)).to.be.revertedWith("");
      // wrong bridged
      await expect(ethOwner.addToken(ethToken.address,ethers.constants.AddressZero,bnChainIDtestnet)).to.be.revertedWith("");
      // without gateway
      await expect(ethOwner.addToken(ethToken.address,bncToken.address,228)).to.be.revertedWith("");

    });
    it('Should pause and play token', async () => {
      await tsAddToken();
      expect(await bridge.isTokenActive(KCNC)).to.eq(true);
      await ethOwner.setPauseOnToken(KCNC);
      expect(await bridge.isTokenActive(KCNC)).to.eq(false);

      await expect(ethOwner.setPauseOnToken("TEST")).to.be.revertedWith("");

      await ethOwner.setPlayOnToken(KCNC);
      expect(await bridge.isTokenActive(KCNC)).to.eq(true);

      await expect(ethOwner.setPlayOnToken("TEST")).to.be.revertedWith("");
    });
    it('Should get and set bridged addresses', async () => {
      await expect (bridge.getBridgedAddress(KCNC,bnChainIDtestnet)).to.be.revertedWith("")
      await expect (bridge.setBridgedAddress(KCNC,bnChainIDtestnet,tempAddress)).to.be.revertedWith("")

      await tsAddToken()
      const tx = await ethOwner.setGateway(993,alice.address);
      await tx.wait();
      expect (await bridge.getBridgedAddress(KCNC,bnChainIDtestnet)).to.eq(bncToken.address);
      // await ethOwner.setGateway(993,alice.address);
      const tx2 = await ethOwner.setBridgedAddress(KCNC,993,tempAddress);
      await expect (ethOwner.setBridgedAddress(KCNC,993,ethers.constants.AddressZero)).to.be.revertedWith("");
      // await tx2.wait();
      expect (await bridge.getBridgedAddress(KCNC,993)).to.eq(tempAddress);
      await expect(bridge.getBridgedAddress(KCNC,1007)).to.be.revertedWith("")
    });
    it('Should check approved chain', async () => {
      await tsAddToken()
      expect ( await bridge.isChainConfigured(KCNC,bnChainIDtestnet)).to.eq(true);
      expect ( await bridge.isChainConfigured(KCNC,1000)).to.eq(false);
    }); 
it('Should swap and redeem token', async () => {
      // swap preparation
      const amountToSwap = ethers.utils.parseEther("100");
      let currentNonce:number = await bridge.getCurrentNonce();
      expect (currentNonce).to.eq(1);
  
      const cryptedMessage = ethers.utils.solidityKeccak256(
        ["address","uint256","uint256","string","uint256"],
        [owner.address, amountToSwap, 
          bnChainIDtestnet,KCNC,currentNonce]);
      const arrayify = ethers.utils.arrayify(cryptedMessage);
      const badSig = await alice.signMessage(arrayify);
      const flatSig = await validator.signMessage(arrayify);
      // without gateway
      await expect(ethOwner.swap(
        owner.address, amountToSwap, bnChainIDtestnet, KCNC)
      ).to.be.revertedWith("")
      // config first bridge
      await ethOwner.setGateway(bnChainIDtestnet,binance.address);
      // without token
      await expect(ethOwner.swap(
        owner.address, amountToSwap, bnChainIDtestnet, KCNC)
      ).to.be.revertedWith("")
      // config first bridge
      await ethOwner.addToken(ethToken.address,bncToken.address,bnChainIDtestnet);
      // token is on pause
      await ethOwner.setPauseOnToken(KCNC);
      await expect(ethOwner.swap(
        owner.address, amountToSwap, bnChainIDtestnet, KCNC)
      ).to.be.revertedWith("");
      await ethOwner.setPlayOnToken(KCNC);
      // to zero address
      await expect(ethOwner.swap(
        ethers.constants.AddressZero, amountToSwap, bnChainIDtestnet, KCNC)
      ).to.be.revertedWith("");
      expect (await bridge.getBridgedAddress(KCNC,bnChainIDtestnet)).to.eq(bncToken.address);    
      // swap
      const initialBalance:BigNumber = await ethToken.balanceOf(owner.address);
      await expect(ethOwner.swap(
        owner.address, amountToSwap, bnChainIDtestnet, KCNC)
      ).to.emit(bridge,"SwapInitialized").withArgs(
        owner.address, amountToSwap, bnChainIDtestnet,KCNC,currentNonce
      )
      // balance should change
      const afterBalance:BigNumber = await ethToken.balanceOf(owner.address);
      const finalBalance = afterBalance.add(amountToSwap);
      expect(finalBalance).to.eq(initialBalance);
      // redeem preparation
      await bncOwner.setGateway(etChainIDtestnet,bridge.address);
      await bncOwner.addToken(bncToken.address,ethToken.address,etChainIDtestnet);
      // check
      expect (await binance.isChainConfigured(await bncToken.symbol(),etChainIDtestnet)).to.eq(true);
      expect (await binance.getBridgedAddress(await bncToken.symbol(),etChainIDtestnet)).to.eq(ethToken.address);
      
      await bncOwner.setValidator(validator.address);
      let bncValidatorRole = await bncOwner.VALIDATOR();
      await bncOwner.grantRole(bncValidatorRole, validator.address);
      expect (await binance.hasRole(bncValidatorRole,validator.address)).to.eq(true);
      // wrong chain ID
      await expect(binance.connect(bob).redeem(
        owner.address, amountToSwap, etChainIDtestnet,KCNC,
        currentNonce,flatSig
      )).to.be.revertedWith("");
      // token is on pause
      await bncOwner.setPauseOnToken(await bncToken.symbol());
      await expect(binance.connect(bob).redeem(
        owner.address, amountToSwap, bnChainIDtestnet,KCNC,
        currentNonce,flatSig
      )).to.be.revertedWith("");
      await bncOwner.setPlayOnToken(await bncToken.symbol());
      // wrong signature
      await expect(binance.connect(bob).redeem(
        owner.address, amountToSwap, bnChainIDtestnet,KCNC,
        currentNonce,badSig
      )).to.be.revertedWith("");
      // wrong amount to redeen
      await expect(binance.connect(bob).redeem(
        owner.address, ethers.utils.parseEther("1000000000"), bnChainIDtestnet,KCNC,
        currentNonce,flatSig
      )).to.be.revertedWith("");
      // wrong address to redeen
      await expect(binance.connect(bob).redeem(
        bob.address, amountToSwap, bnChainIDtestnet,KCNC,
        currentNonce,flatSig
      )).to.be.revertedWith("");
      
      // redeem
      const initialBalance1:BigNumber = await bncToken.balanceOf(owner.address);
      await expect(binance.connect(bob).redeem(
        owner.address, amountToSwap, bnChainIDtestnet,KCNC,
        currentNonce,flatSig
      )).to.emit(binance,"SwapExecuted"
        ).withArgs(owner.address,amountToSwap,bnChainIDtestnet,KCNC,currentNonce)    
        // can't redeem twice
      await expect(binance.connect(bob).redeem(
        owner.address, amountToSwap, bnChainIDtestnet,KCNC,
        currentNonce,flatSig
      )).to.be.revertedWith("");
      await expect(binance.connect(bob).redeem(
        owner.address, amountToSwap, bnChainIDtestnet,KCNC,
        currentNonce,flatSig
      )).to.be.revertedWith("");
        // balance should change
        const afterBalance1:BigNumber = await bncToken.balanceOf(owner.address);
        const finalBalance1 = initialBalance1.add(amountToSwap);
        expect(finalBalance1).to.eq(afterBalance1);
  
    });

  });
  

  });
