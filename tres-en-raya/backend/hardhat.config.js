require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
const { PRIVATE_KEY, ALCHEMY_SEPOLIA_URL } = process.env;

module.exports = {
  solidity: "0.8.27",
  networks: {
    sepolia: {
      url: ALCHEMY_SEPOLIA_URL,  // URL de Alchemy para Sepolia desde el .env
      accounts: [`0x${PRIVATE_KEY}`]  // Clave privada desde el .env
    },
  },
};
