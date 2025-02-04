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

    // 2. Deploy DAOObserver
    console.log("Deploying DAOObserver...");
    const DAOObserver = await hre.ethers.getContractFactory("DAOObserver");
    const daoObserver = await DAOObserver.deploy();
    await daoObserver.waitForDeployment();
    const observerAddress = await daoObserver.getAddress();
    console.log("DAOObserver deploiat la adresa:", observerAddress);

    // 3. Deploy HumanitarianFund cu adresele GovernanceToken și Observer
    console.log("Deploying HumanitarianFund...");
    const HumanitarianFund = await hre.ethers.getContractFactory("HumanitarianFund");
    const humanitarianFund = await HumanitarianFund.deploy(
        governanceTokenAddress,
        observerAddress
    );
    await humanitarianFund.waitForDeployment();
    const fundAddress = await humanitarianFund.getAddress();
    console.log("HumanitarianFund deploiat la adresa:", fundAddress);

    // 4. Setăm HumanitarianFund ca minter pentru GovernanceToken
    console.log("Setăm drepturile de minting...");
    const setMinterTx = await governanceToken.setMinter(fundAddress, true);
    await setMinterTx.wait();
    console.log("Drepturi de minting setate pentru HumanitarianFund");

    // 5. Deploy HumanitarianDAO cu toate adresele necesare
    console.log("Deploying HumanitarianDAO...");
    const HumanitarianDAO = await hre.ethers.getContractFactory("HumanitarianDAO");
    const humanitarianDAO = await HumanitarianDAO.deploy(
        governanceTokenAddress, 
        fundAddress,
        observerAddress
    );
    await humanitarianDAO.waitForDeployment();
    const daoAddress = await humanitarianDAO.getAddress();
    console.log("HumanitarianDAO deploiat la adresa:", daoAddress);

    // 6. Setăm DAO-ul în HumanitarianFund
    console.log("Setăm adresa DAO în HumanitarianFund...");
    const setDAOTx = await humanitarianFund.setDAOContract(daoAddress);
    await setDAOTx.wait();
    console.log("Adresa DAO setată în HumanitarianFund");

    // Afișăm toate adresele la final
    console.log("\nDeployment complet! Salvați aceste adrese pentru interfața web:");
    console.log("GovernanceToken:", governanceTokenAddress);
    console.log("DAOObserver:", observerAddress);
    console.log("HumanitarianFund:", fundAddress);
    console.log("HumanitarianDAO:", daoAddress);

    // Scriem adresele într-un fișier pentru referință ușoară
    const fs = require("fs");
    const contractAddresses = {
        governanceToken: governanceTokenAddress,
        observer: observerAddress,
        fund: fundAddress,
        dao: daoAddress
    };

    fs.writeFileSync(
        "deployed-addresses.json",
        JSON.stringify(contractAddresses, null, 2)
    );
    console.log("\nAdresele au fost salvate în fișierul deployed-addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });