const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Humanitarian Ecosystem", function () {
  let governanceToken, humanitarianFund, humanitarianDAO, daoObserver;
  let owner, admin, beneficiary, voter1, voter2;

  beforeEach(async function () {
    [owner, admin, beneficiary, voter1, voter2] = await ethers.getSigners();

    // Deploy GovernanceToken
    const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceTokenFactory.connect(owner).deploy();
    await governanceToken.waitForDeployment();

    // Deploy DAOObserver
    const DAOObserverFactory = await ethers.getContractFactory("DAOObserver");
    daoObserver = await DAOObserverFactory.deploy();
    await daoObserver.waitForDeployment();

    // Deploy HumanitarianFund
    const HumanitarianFundFactory = await ethers.getContractFactory("HumanitarianFund");
    humanitarianFund = await HumanitarianFundFactory.connect(admin).deploy(
      await governanceToken.getAddress(),
      await daoObserver.getAddress()
    );
    await humanitarianFund.waitForDeployment();

    // Deploy HumanitarianDAO
    const HumanitarianDAOFactory = await ethers.getContractFactory("HumanitarianDAO");
    humanitarianDAO = await HumanitarianDAOFactory.deploy(
      await governanceToken.getAddress(), 
      await humanitarianFund.getAddress(),
      await daoObserver.getAddress()
    );
    await humanitarianDAO.waitForDeployment();

    await humanitarianFund.connect(admin).setDAOContract(await humanitarianDAO.getAddress());
    await governanceToken.connect(owner).setMinter(await humanitarianFund.getAddress(), true);
  });

  // Restul testelor rămân neschimbate deoarece modificarea este doar la nivel de setup
  describe("GovernanceToken", function () {
    it("Should mint initial supply to owner", async function () {
      const ownerBalance = await governanceToken.balanceOf(owner.address);
      expect(ownerBalance).to.be.gt(0);
    });

    it("Should handle delegation correctly", async function () {
      await governanceToken.connect(voter1).delegate(voter2.address);
      expect(await governanceToken.getDelegate(voter1.address)).to.equal(voter2.address);
      
      await governanceToken.connect(voter1).delegate(voter1.address);
      expect(await governanceToken.getDelegate(voter1.address)).to.equal(voter1.address);
    });
  });

  describe("HumanitarianFund", function () {
    it("Should create campaign with correct parameters", async function () {
      const ipfsHashes = ["QmHash1", "QmHash2"];
      await humanitarianFund.connect(admin).createCampaign(
        "Emergency Relief",
        "Description",
        ethers.parseEther("10"),
        beneficiary.address,
        30,
        ipfsHashes
      );

      const campaign = await humanitarianFund.getCampaign(0);
      expect(campaign.title).to.equal("Emergency Relief");
      expect(campaign.goal).to.equal(ethers.parseEther("10"));
      expect(campaign.ipfsDocuments).to.deep.equal(ipfsHashes);
    });

    it("Should process donations correctly", async function () {
      await humanitarianFund.connect(admin).createCampaign(
        "Campaign",
        "Description",
        ethers.parseEther("10"),
        beneficiary.address,
        30,
        []
      );

      const donationAmount = ethers.parseEther("1");
      await humanitarianFund.connect(voter1).donate(0, { value: donationAmount });
      
      const campaign = await humanitarianFund.getCampaign(0);
      expect(campaign.raisedAmount).to.equal(donationAmount);
    });

    it("Should mark campaign inactive when goal reached", async function () {
      await humanitarianFund.connect(admin).createCampaign(
        "Campaign",
        "Description",
        ethers.parseEther("1"),
        beneficiary.address,
        30,
        []
      );

      await humanitarianFund.connect(voter1).donate(0, { value: ethers.parseEther("1") });
      
      const campaign = await humanitarianFund.getCampaign(0);
      expect(campaign.active).to.be.false;
    });
  });

  describe("HumanitarianDAO", function () {
    beforeEach(async function () {
      await humanitarianFund.connect(admin).createCampaign(
        "Campaign",
        "Description",
        ethers.parseEther("1"),
        beneficiary.address,
        30,
        []
      );
    });

    it("Should create proposal with correct parameters", async function () {
      await governanceToken.connect(owner).transfer(voter1.address, ethers.parseEther("100"));
      const proposalTx = await humanitarianDAO.connect(voter1).propose(
        "Test Proposal",
        "Description",
        0
      );

      const receipt = await proposalTx.wait();
      const event = receipt.logs.find(x => x.fragment?.name === 'ProposalCreated');
      expect(event).to.exist;
      
      const proposal = await humanitarianDAO.getProposal(0);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.campaignId).to.equal(0);
    });
  });
});