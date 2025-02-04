const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Humanitarian Ecosystem", function () {
  let governanceToken, humanitarianFund, humanitarianDAO;
  let owner, admin, beneficiary, voter1, voter2;

  beforeEach(async function () {
    [owner, admin, beneficiary, voter1, voter2] = await ethers.getSigners();

    const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceTokenFactory.deploy();
    await governanceToken.waitForDeployment();

    const HumanitarianFundFactory = await ethers.getContractFactory("HumanitarianFund");
    humanitarianFund = await HumanitarianFundFactory.connect(admin).deploy(await governanceToken.getAddress());
    await humanitarianFund.waitForDeployment();

    const HumanitarianDAOFactory = await ethers.getContractFactory("HumanitarianDAO");
    humanitarianDAO = await HumanitarianDAOFactory.deploy(
      await governanceToken.getAddress(), 
      await humanitarianFund.getAddress()
    );
    await humanitarianDAO.waitForDeployment();

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
      expect(await humanitarianFund.campaignCount()).to.equal(1);
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

  describe("Voting Mechanism", function () {
    beforeEach(async function () {
      // Create campaign and set up voter
      await humanitarianFund.connect(admin).createCampaign(
        "Emergency Relief",
        "Flood victims support",
        ethers.parseEther("1"),
        beneficiary.address,
        30
      );

      // Set up minter role for HumanitarianFund
      await governanceToken.setMinter(await humanitarianFund.getAddress(), true);
      
      // Donor makes a small donation to get voting tokens
      await humanitarianFund.connect(voter1).donate(0, { value: ethers.parseEther("0.1") });
    });

    it("Should allow token holders to vote", async function () {
      // Create proposal
      await humanitarianDAO.connect(voter1).propose(
        "Release Funds",
        "Release emergency funds",
        0
      );

      // Cast vote
      const voteTx = await humanitarianDAO.connect(voter1).castVote(0, true);
      const voteReceipt = await voteTx.wait();

      const voteEvent = voteReceipt.logs.find(
        log => log.fragment && log.fragment.name === "VoteCast"
      );

      expect(voteEvent).to.exist;
      expect(voteEvent.args.support).to.be.true;
    });

    it("Should prevent voting after voting period ends", async function () {
      await humanitarianDAO.connect(voter1).propose(
        "Release Funds",
        "Release emergency funds",
        0
      );

      await time.increase(time.duration.minutes(6));

      await expect(
        humanitarianDAO.connect(voter1).castVote(0, true)
      ).to.be.revertedWith("Voting ended");
    });

    it("Should prevent double voting", async function () {
      await humanitarianDAO.connect(voter1).propose(
        "Release Funds",
        "Release emergency funds",
        0
      );

      await humanitarianDAO.connect(voter1).castVote(0, true);

      await expect(
        humanitarianDAO.connect(voter1).castVote(0, true)
      ).to.be.revertedWith("Already voted");
    });
  });
});