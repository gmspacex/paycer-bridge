import { ethers } from "hardhat";
import { expect } from "chai";
import { advanceBlockTo } from "./utilities"
import { deployProxy } from "./utilities/deploy";
import { BridgeMintableToken, ERC20Mock, MainBridge, SideBridge } from "../typechain";

describe("BSC <-> Polygon", function () {
	let mainBridge: MainBridge;
	let sideBridge: SideBridge;
	let tokenA: ERC20Mock, tokenB: ERC20Mock;
	let tokenASideAddr;
	let deployer;
	before(async function () {
		this.signers = await ethers.getSigners()
		deployer = this.signers[0];
	})

	describe("Register standard erc20 and create swap pair", async () => {
		beforeEach(async () => {
			const erc20Mock = await ethers.getContractFactory("ERC20Mock", deployer)
			tokenA = <ERC20Mock>await erc20Mock.deploy("Token A", "TokenA", 1e10)
			tokenB = <ERC20Mock>await erc20Mock.deploy("Token B", "TokenB", 1e10)
			mainBridge = <MainBridge>await deployProxy("MainBridge", 0);
			sideBridge = <SideBridge>await deployProxy("SideBridge", 0);
		})
		it("register token on main bridge", async () => {
			expect(await mainBridge.registeredERC20(tokenA.address)).to.be.false;
			expect(await mainBridge.registeredERC20(tokenB.address)).to.be.false;

			await expect(mainBridge.registerSwapPairToSide(tokenA.address)).to.emit(mainBridge, "SwapPairRegister").withArgs(
				deployer.address,
				tokenA.address,
				"Token A",
				"TokenA",
				18
			)
			expect(await mainBridge.registeredERC20(tokenA.address)).to.be.true;

			await expect(mainBridge.registerSwapPairToSide(tokenA.address)).to.revertedWith('already registered');
		})

		it("create swap pair on side bridge", async () => {
			const registerTx = await mainBridge.registerSwapPairToSide(tokenA.address)
			await expect(sideBridge.createSwapPair(
				registerTx.hash,
				tokenA.address,
				"Token A",
				"TokenA",
				18
			)).to.emit(sideBridge, "SwapPairCreated")
			await expect(sideBridge.createSwapPair(
				registerTx.hash,
				tokenA.address,
				"Token A",
				"TokenA",
				18
			)).to.revertedWith('duplicated swap pair');

			const tokenASideAddr = await sideBridge.swapMappingMain2Side(tokenA.address);
			expect(await sideBridge.swapMappingSide2Main(tokenASideAddr)).to.equal(tokenA.address)
		})

		it("register only erc20 standard tokens", async () => {
			await expect(mainBridge.registerSwapPairToSide(deployer.address))
				.to.revertedWith('function call to a non-contract account');
		})
	})

	describe("Swap from Main to Side", async () => {
		beforeEach(async () => {
			const erc20Mock = await ethers.getContractFactory("ERC20Mock", deployer)
			tokenA = <ERC20Mock>await erc20Mock.deploy("Token A", "TokenA", 1e10)
			tokenB = <ERC20Mock>await erc20Mock.deploy("Token B", "TokenB", 1e10)

			mainBridge = <MainBridge>await deployProxy("MainBridge", 0);
			sideBridge = <SideBridge>await deployProxy("SideBridge", 0);

			const registerTx = await mainBridge.registerSwapPairToSide(tokenA.address)
			await sideBridge.createSwapPair(registerTx.hash, tokenA.address, "Token A", "TokenA", 18)
			tokenASideAddr = await sideBridge.swapMappingMain2Side(tokenA.address);
		})

		it("transfer tokenA to main bridge", async () => {
			await tokenA.approve(mainBridge.address, 1e12);
			await expect(mainBridge.swapMain2Side(tokenB.address, 1000))
				.to.revertedWith('not registered token');
			await expect(mainBridge.swapMain2Side(tokenA.address, 1000))
				.to.emit(mainBridge, "SwapStarted").withArgs(
					tokenA.address,
					deployer.address,
					1000,
					0
				)
			expect(await tokenA.balanceOf(mainBridge.address)).to.eq(1000);
		})
		it("fill mainTx to side and mint tokenASide", async () => {
			await tokenA.approve(mainBridge.address, 1e12);
			const swapTx = await mainBridge.swapMain2Side(tokenA.address, 1000)
			await expect(sideBridge.fillMain2SideSwap(
				swapTx.hash,
				tokenA.address,
				deployer.address,
				1000
			)).to.emit(sideBridge, 'SwapFilled').withArgs(
				tokenASideAddr,
				swapTx.hash,
				deployer.address,
				1000
			)
			await expect(sideBridge.fillMain2SideSwap(swapTx.hash, tokenA.address, deployer.address, 1000))
				.to.revertedWith('main swap tx filled already');
			await expect(sideBridge.fillMain2SideSwap(ethers.constants.HashZero, tokenB.address, deployer.address, 1000))
				.to.revertedWith('no swap pair for this token');

			const tokenASide = await ethers.getContractAt("BridgeMintableToken", tokenASideAddr);
			expect(await tokenASide.balanceOf(deployer.address)).to.equal(1000);
		})
	})
	describe("Swap from Side to Main", async () => {
		beforeEach(async () => {
			const erc20Mock = await ethers.getContractFactory("ERC20Mock", deployer)
			tokenA = <ERC20Mock>await erc20Mock.deploy("Token A", "TokenA", 1e10)
			tokenB = <ERC20Mock>await erc20Mock.deploy("Token B", "TokenB", 1e10)

			mainBridge = <MainBridge>await deployProxy("MainBridge", 0);
			sideBridge = <SideBridge>await deployProxy("SideBridge", 0);

			const registerTx = await mainBridge.registerSwapPairToSide(tokenA.address)
			await sideBridge.createSwapPair(registerTx.hash, tokenA.address, "Token A", "TokenA", 18)
			tokenASideAddr = await sideBridge.swapMappingMain2Side(tokenA.address);

			await tokenA.approve(mainBridge.address, 1e12);
			const swapTx = await mainBridge.swapMain2Side(tokenA.address, 1000)
			await sideBridge.fillMain2SideSwap(swapTx.hash, tokenA.address, deployer.address, 1000)
		})

		it("transfer tokenASide to side bridge and burn", async () => {
			const tokenASide = <BridgeMintableToken>await ethers.getContractAt("BridgeMintableToken", tokenASideAddr, deployer);
			await tokenASide.approve(sideBridge.address, 1000);

			await expect(sideBridge.swapSide2Main(tokenB.address, 1000))
				.to.revertedWith('no swap pair for this token');
			await expect(sideBridge.swapSide2Main(tokenASide.address, 1000))
				.to.emit(sideBridge, 'SwapStarted').withArgs(
					tokenASide.address,
					tokenA.address,
					deployer.address,
					1000,
					0
				)
			expect(await tokenASide.balanceOf(deployer.address)).to.eq(0);
			expect(await tokenASide.balanceOf(sideBridge.address)).to.eq(0);
		})
		it("fill sideTx to main and release tokenA", async () => {
			const tokenASide = <BridgeMintableToken>await ethers.getContractAt("BridgeMintableToken", tokenASideAddr, deployer);
			await tokenASide.approve(sideBridge.address, 1000);
			const swapTx = await sideBridge.swapSide2Main(tokenASide.address, 1000);

			expect(await tokenA.balanceOf(deployer.address)).to.eq(1e10 - 1000);
			await expect(mainBridge.fillSide2MainSwap(
				swapTx.hash,
				tokenA.address,
				deployer.address,
				1000
			)).to.emit(mainBridge, 'SwapFilled').withArgs(
				tokenA.address,
				swapTx.hash,
				deployer.address,
				1000
			)
			expect(await tokenA.balanceOf(deployer.address)).to.eq(1e10);

			await expect(mainBridge.fillSide2MainSwap(
				swapTx.hash,
				tokenA.address,
				deployer.address,
				1000
			)).to.revertedWith('side tx filled already');
			await expect(mainBridge.fillSide2MainSwap(
				ethers.constants.HashZero,
				tokenB.address,
				deployer.address,
				1000
			)).to.revertedWith('not registered token');
		})
	})
})