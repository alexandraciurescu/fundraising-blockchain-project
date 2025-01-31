// scripts/deploy-dao.js
const hre = require("hardhat");

async function main() {
    console.log("Începem deployarea sistemului DAO...");

    // 1. Deploy GovernanceToken
    console.log("Deploying GovernanceToken...");
    const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
    const governanceToken = await GovernanceToken.deploy();
    await governanceToken.waitForDeployment();
    const tokenAddress = await governanceToken.getAddress();
    console.log("GovernanceToken deployed to:", tokenAddress);

    // 2. Deploy HumanitarianDAO
    console.log("Deploying HumanitarianDAO...");
    const HumanitarianDAO = await hre.ethers.getContractFactory("HumanitarianDAO");
    const humanitarianDAO = await HumanitarianDAO.deploy(tokenAddress);
    await humanitarianDAO.waitForDeployment();
    const daoAddress = await humanitarianDAO.getAddress();
    console.log("HumanitarianDAO deployed to:", daoAddress);

    // 3. Transfer ownership of GovernanceToken to DAO
    console.log("Transferring GovernanceToken ownership to DAO...");
    await governanceToken.transferOwnership(daoAddress);
    console.log("Ownership transferred successfully");

    console.log("\nDeployment complet!");
    console.log("GovernanceToken:", tokenAddress);
    console.log("HumanitarianDAO:", daoAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });