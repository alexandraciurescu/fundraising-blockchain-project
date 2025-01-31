// scripts/deploy.js
const hre = require("hardhat");

async function main() {
    console.log("Începem procesul de deployment...");

    // Obținem contul care va face deployment-ul
    const [deployer] = await ethers.getSigners();
    console.log("Deployment făcut cu adresa:", deployer.address);

    // 1. Deploy GovernanceToken
    console.log("Deploying GovernanceToken...");
    const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
    const governanceToken = await GovernanceToken.deploy();
    await governanceToken.waitForDeployment();
    const governanceTokenAddress = await governanceToken.getAddress();
    console.log("GovernanceToken deploiat la adresa:", governanceTokenAddress);

    // 2. Deploy HumanitarianFund cu adresa GovernanceToken
    console.log("Deploying HumanitarianFund...");
    const HumanitarianFund = await hre.ethers.getContractFactory("HumanitarianFund");
    const humanitarianFund = await HumanitarianFund.deploy(governanceTokenAddress);
    await humanitarianFund.waitForDeployment();
    const fundAddress = await humanitarianFund.getAddress();
    console.log("HumanitarianFund deploiat la adresa:", fundAddress);

    // 3. Setăm HumanitarianFund ca minter pentru GovernanceToken
    console.log("Setăm drepturile de minting...");
    const setMinterTx = await governanceToken.setMinter(fundAddress, true);
    await setMinterTx.wait();
    console.log("Drepturi de minting setate pentru HumanitarianFund");

    // 4. Deploy HumanitarianDAO cu ambele adrese necesare
    console.log("Deploying HumanitarianDAO...");
    const HumanitarianDAO = await hre.ethers.getContractFactory("HumanitarianDAO");
    const humanitarianDAO = await HumanitarianDAO.deploy(governanceTokenAddress, fundAddress);
    await humanitarianDAO.waitForDeployment();
    const daoAddress = await humanitarianDAO.getAddress();
    console.log("HumanitarianDAO deploiat la adresa:", daoAddress);

    // 5. Setăm DAO-ul în HumanitarianFund
    console.log("Setăm adresa DAO în HumanitarianFund...");
    const setDAOTx = await humanitarianFund.setDAOContract(daoAddress);
    await setDAOTx.wait();
    console.log("Adresa DAO setată în HumanitarianFund");

    // Afișăm toate adresele la final
    console.log("\nDeployment complet! Salvați aceste adrese pentru interfața web:");
    console.log("GovernanceToken:", governanceTokenAddress);
    console.log("HumanitarianFund:", fundAddress);
    console.log("HumanitarianDAO:", daoAddress);
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });