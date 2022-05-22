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

  const MainBridgeFactory = await ethers.getContractFactory("MainBridge")
  const SideBridgeFactory = await ethers.getContractFactory("SideBridge")

  // ========== BSC <-> Polygon ========== //
  if (!deployment.BSC_POLYGON) deployment.BSC_POLYGON = {}
  if (
    network.name === 'bsc' ||
    network.name === 'bsc_testnet' ||
    network.name === 'polygon' ||
    network.name === 'mumbai'
  ) {
    if (!deployment.BSC_POLYGON.MainBridge) {
      const bscMainBridge = await upgrades.deployProxy(MainBridgeFactory, [0]);
      await bscMainBridge.deployed();
      console.log("BSC <-> Polygon | BscMainBridge Deployed at:", bscMainBridge.address);
      deployment.BSC_POLYGON.MainBridge = bscMainBridge.address;
    }
    if (!deployment.BSC_POLYGON.SideBridge) {
      const bscSideBridge = await upgrades.deployProxy(SideBridgeFactory, [0]);
      await bscSideBridge.deployed();
      console.log("BSC <-> Polygon | BscSideBridge Deployed at:", bscSideBridge.address);
      deployment.BSC_POLYGON.SideBridge = bscSideBridge.address;
    }
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
