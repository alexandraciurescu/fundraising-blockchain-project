const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Humanitarian Ecosystem", function () {
  let governanceToken, humanitarianFund, humanitarianDAO;
  let owner, admin, beneficiary, voter1, voter2;

  beforeEach(async function () {
    // Get signers
    [owner, admin, beneficiary, voter1, voter2] = await ethers.getSigners();

    // Deploy GovernanceToken
    const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceTokenFactory.deploy();
    await governanceToken.waitForDeployment();

    // Deploy HumanitarianFund
    const HumanitarianFundFactory = await ethers.getContractFactory("HumanitarianFund");
    humanitarianFund = await HumanitarianFundFactory.connect(admin).deploy(await governanceToken.getAddress());
    await humanitarianFund.waitForDeployment();

    // Deploy HumanitarianDAO
    const HumanitarianDAOFactory = await ethers.getContractFactory("HumanitarianDAO");
    humanitarianDAO = await HumanitarianDAOFactory.deploy(
      await governanceToken.getAddress(), 
      await humanitarianFund.getAddress()
    );
    await humanitarianDAO.waitForDeployment();

    // Set DAO contract in Fund
    await humanitarianFund.connect(admin).setDAOContract(await humanitarianDAO.getAddress());
  });

  describe("Campaign Creation", function () {
    it("Should allow admin to create a campaign", async function () {
      const createTx = await humanitarianFund.connect(admin).createCampaign(
        "Emergency Relief",
        "Flood victims support",
        ethers.parseEther("10"),
        beneficiary.address,
        30
      );

      const receipt = await createTx.wait();
      const campaignCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "CampaignCreated"
      );

      expect(campaignCreatedEvent).to.exist;
      expect(campaignCreatedEvent.args[2]).to.equal(ethers.parseEther("10"));

      const campaignCount = await humanitarianFund.campaignCount();
      expect(campaignCount).to.equal(1);
    });

    it("Should prevent non-admin from creating campaigns", async function () {
      await expect(
        humanitarianFund.connect(voter1).createCampaign(
          "Emergency Relief",
          "Flood victims support",
          ethers.parseEther("10"),
          beneficiary.address,
          30
        )
      ).to.be.revertedWith("Only admin can call this function");
    });
  });

  describe("DAO Proposal Workflow", function () {
    let campaignId;

    beforeEach(async function () {
      // Create a campaign first
      // await governanceToken.connect(owner).mint(voter1.address, ethers.parseEther("1000"));
      
      const createTx = await humanitarianFund.connect(admin).createCampaign(
        "Emergency Relief",
        "Flood victims support",
        ethers.parseEther("10"),
        beneficiary.address,
        30
      );
      campaignId = 0;
    });

    // it("Should allow token holders to create proposals", async function () {
    //   const proposeTx = await humanitarianDAO.connect(voter1).propose(
    //     "Release Campaign Funds",
    //     "Vote to release funds for emergency relief",
    //     campaignId
    //   );

    //   const receipt = await proposeTx.wait();
    //   const proposalCreatedEvent = receipt.logs.find(
    //     log => log.fragment && log.fragment.name === "ProposalCreated"
    //   );

    //   expect(proposalCreatedEvent).to.exist;
    // });

    it("Should prevent non-token holders from creating proposals", async function () {
      await expect(
        humanitarianDAO.connect(voter2).propose(
          "Release Campaign Funds",
          "Vote to release funds for emergency relief",
          campaignId
        )
      ).to.be.revertedWith("Must have governance tokens");
    });
  });

  describe("Campaign Retrieval", function () {
    it("Should retrieve campaign details correctly", async function () {
      await humanitarianFund.connect(admin).createCampaign(
        "Emergency Relief",
        "Flood victims support",
        ethers.parseEther("10"),
        beneficiary.address,
        30
      );

      const campaign = await humanitarianFund.getCampaign(0);
      
      expect(campaign.title).to.equal("Emergency Relief");
      expect(campaign.description).to.equal("Flood victims support");
      expect(campaign.goal).to.equal(ethers.parseEther("10"));
      expect(campaign.beneficiary).to.equal(beneficiary.address);
      expect(campaign.active).to.be.true;
    });
  });
});

