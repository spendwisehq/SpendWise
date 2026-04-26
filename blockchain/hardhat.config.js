// blockchain/hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

const DEPLOYER_KEY  = process.env.DEPLOYER_PRIVATE_KEY  || '0x' + '1'.repeat(64);
const MUMBAI_RPC    = process.env.POLYGON_MUMBAI_RPC     || 'https://rpc-amoy.polygon.technology';
const MAINNET_RPC   = process.env.POLYGON_MAINNET_RPC    || 'https://polygon-rpc.com';
const POLYGONSCAN   = process.env.POLYGONSCAN_API_KEY    || '';

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.25',
        settings: {
          optimizer: { enabled: true, runs: 200 },
       },
     },
      {
        version: '0.8.19',
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
      {
        version: '0.8.20',
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
      {
        version: '0.8.24',
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    ],
  },

  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url:     'http://127.0.0.1:8545',
      chainId: 31337,
    },
    amoy: {
      url:      MUMBAI_RPC,
      chainId:  80002,
      accounts: [DEPLOYER_KEY],
      gasPrice: 'auto',
    },
    polygon: {
      url:      MAINNET_RPC,
      chainId:  137,
      accounts: [DEPLOYER_KEY],
      gasPrice: 'auto',
    },
  },

  etherscan: {
    apiKey: {
      polygon:        POLYGONSCAN,
      polygonAmoy:    POLYGONSCAN,
      polygonMumbai:  POLYGONSCAN,
    },
    customChains: [
      {
        network:   'polygonAmoy',
        chainId:   80002,
        urls: {
          apiURL:     'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com',
        },
      },
    ],
  },

  paths: {
    sources:   './contracts',
    tests:     './test',
    cache:     './cache',
    artifacts: './artifacts',
  },

  gasReporter: {
    enabled:  process.env.REPORT_GAS === 'true',
    currency: 'USD',
  },
};