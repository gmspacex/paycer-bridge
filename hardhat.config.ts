
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + '/.env' });

import { HardhatUserConfig, task } from "hardhat/config";
import '@typechain/hardhat';
import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-abi-exporter';
import 'hardhat-contract-sizer';
import 'hardhat-deploy-ethers';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

const config: HardhatUserConfig = {
  gasReporter: {
    showTimeSpent: true,
    currency: "USD",
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_ID}`,
        blockNumber: 14295000,
      },
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_ID}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 70000000000,
    },
    kovan: {
      url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_ID}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 2000000000,
    },
    polygon: {
      url: `https://rpc-mainnet.maticvigil.com/`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    bsc_testnet: {
      url: 'https://data-seed-prebsc-1-s2.binance.org:8545',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 200000,
  },
  etherscan: {
    apiKey: `${process.env.ETHERSCAN_API_KEY}`,
  },
  abiExporter: {
    path: "./abi",
    clear: true,
    flat: true,
    spacing: 2,
  },
  typechain: {
    outDir: './typechain',
    target: "ethers-v5",
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
  },
};

export default config;