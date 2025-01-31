const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gas Cost Analysis", function () {
    let token, fund, dao, owner, admin, beneficiary;

    beforeEach(async function () {
        [owner, admin, beneficiary] = await ethers.getSigners();

        // Deploy GovernanceToken
        const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
        token = await GovernanceToken.deploy();
        await token.waitForDeployment();

        // Deploy HumanitarianFund
        const HumanitarianFund = await ethers.getContractFactory("HumanitarianFund");
        fund = await HumanitarianFund.connect(admin).deploy(await token.getAddress());
        await fund.waitForDeployment();

        // Deploy HumanitarianDAO
        const HumanitarianDAO = await ethers.getContractFactory("HumanitarianDAO");
        dao = await HumanitarianDAO.deploy(await token.getAddress(), await fund.getAddress());
        await dao.waitForDeployment();

        // Create a campaign
        await fund.connect(admin).createCampaign(
            "Emergency Relief",
            "Flood victims support",
            ethers.parseEther("10"),
            beneficiary.address,
            30
        );

        // Mint tokens to owner for voting
        await token.connect(owner).setMinter(owner.address, true);
        await token.connect(owner).mint(owner.address, ethers.parseEther("1000"));
    });

    it("Should estimate gas cost for proposal creation", async function () {
        const tx = await dao.connect(owner).propose(
            "Test Proposal",
            "This is a test proposal",
            0
        );
        const receipt = await tx.wait();
    
        console.log("Gas used for proposal creation:", receipt.gasUsed.toString());
        expect(Number(receipt.gasUsed)).to.be.greaterThan(0);
    });
    
    it("Should estimate gas cost for voting", async function () {
        await dao.connect(owner).propose(
            "Test Proposal", 
            "This is a test proposal", 
            0
        );
    
        const tx = await dao.connect(owner).castVote(0, true);
        const receipt = await tx.wait();
    
        console.log("Gas used for voting:", receipt.gasUsed.toString());
        expect(Number(receipt.gasUsed)).to.be.greaterThan(0);
    });
});