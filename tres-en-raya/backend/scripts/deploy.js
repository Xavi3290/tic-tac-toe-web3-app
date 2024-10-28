require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  // Obtener el contrato compilado
  const PlayerStats = await ethers.getContractFactory("PlayerStats");
  console.log("Deploying PlayerStats...");
  
  // Desplegar el contrato
  const playerStats = await PlayerStats.deploy();
  
  // Esperar a que se complete el despliegue
  await playerStats.deployed();
  
  console.log("PlayerStats deployed to:", playerStats.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
