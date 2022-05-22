import { BigNumber } from 'ethers';
import { ethers, upgrades, config, network } from 'hardhat';
const fs = require("fs");

const deploymentPath = "./deployments";
const deploymentFilePath = `${deploymentPath}/${network.name}.json`;

async function main() {
	const deployment = fs.existsSync(deploymentFilePath)
		? JSON.parse(fs.readFileSync(deploymentFilePath))
		: {};

	const [deployer] = await ethers.getSigners();
	console.log("deployer: ", deployer.address);

	const ERC20Mock = await ethers.getContractFactory("ERC20Mock")

	// ========== Mock ERC20 Token ========== //
	if (!deployment.MockERC20) {
		// Initial Supply: 10,000,000
		const mock = await ERC20Mock.deploy("Test", "TEST", BigNumber.from(10).pow(25));
		await mock.deployed();
		console.log("Mock ERC20 Token deployed at:", mock.address);
		deployment.MockERC20 = mock.address;
	}
	if (!fs.existsSync(deploymentPath)) {
		fs.mkdirSync(deploymentPath);
	}
	fs.writeFileSync(deploymentFilePath, JSON.stringify(deployment, null, 2));
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
