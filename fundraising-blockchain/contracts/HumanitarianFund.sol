// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GovernanceToken.sol";

contract HumanitarianFund {
    struct Campaign {
        string title;
        string description;
        uint256 goal;
        uint256 raisedAmount;
        address payable beneficiary;
        bool active;
        uint256 deadline;
        bool fundsReleased;
    }

    mapping(uint256 => Campaign) public campaigns;
    uint256 public campaignCount;
    address public admin;
    address public daoContract;
    
    GovernanceToken public governanceToken;
    uint256 public constant TOKENS_PER_ETH = 100;

    event CampaignCreated(
        uint256 indexed campaignId,
        string title,
        uint256 goal,
        address beneficiary
    );

    event DonationMade(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        uint256 tokens
    );

    event FundsReleased(
        uint256 indexed campaignId,
        address beneficiary,
        uint256 amount
    );

    /*constructor(address _governanceToken) {
        admin = msg.sender;
        governanceToken = GovernanceToken(_governanceToken);
    }*/
    constructor(address _governanceToken) {
        admin = msg.sender;
        governanceToken = GovernanceToken(_governanceToken);
        // Cerem automat drepturile de mint în constructor
        try governanceToken.setMinter(address(this), true) {
            // success
        } catch {
            // Dacă eșuează în constructor, vom încerca mai târziu prin setupMinterRole()
        }
    }
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyDAO() {
        require(msg.sender == daoContract, "Only DAO can call this function");
        _;
    }

    modifier campaignExists(uint256 _campaignId) {
        require(_campaignId < campaignCount, "Campaign does not exist");
        _;
    }

    function setupMinterRole() external onlyAdmin {
        governanceToken.setMinter(address(this), true);
    }

    function setDAOContract(address _daoContract) external onlyAdmin {
        daoContract = _daoContract;
    }

    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        address payable _beneficiary,
        uint256 _durationDays
    ) external onlyAdmin {
        Campaign memory newCampaign = Campaign({
            title: _title,
            description: _description,
            goal: _goal,
            raisedAmount: 0,
            beneficiary: _beneficiary,
            active: true,
            deadline: block.timestamp + (_durationDays * 1 days),
            fundsReleased: false
        });

        campaigns[campaignCount] = newCampaign;
        emit CampaignCreated(campaignCount, _title, _goal, _beneficiary);
        campaignCount++;
    }

    function checkMinterStatus() public view returns (bool) {
    return governanceToken.minters(address(this));
}

    function donate(uint256 _campaignId) external payable campaignExists(_campaignId) {
    Campaign storage campaign = campaigns[_campaignId];
    require(campaign.active, "Campaign is not active");
    require(block.timestamp < campaign.deadline, "Campaign has ended");
    require(!campaign.fundsReleased, "Funds have been released");

    uint256 tokensToMint = (msg.value * TOKENS_PER_ETH) / 1 ether;
    campaign.raisedAmount += msg.value;
    
    require(governanceToken.minters(address(this)), "Contract is not a minter");
    governanceToken.mint(msg.sender, tokensToMint);
    
    emit DonationMade(_campaignId, msg.sender, msg.value, tokensToMint);
    
    if (campaign.raisedAmount >= campaign.goal) {
        campaign.active = false;
    }
}

    function releaseFunds(uint256 _campaignId) external onlyDAO campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(!campaign.active, "Campaign must be completed");
        require(!campaign.fundsReleased, "Funds already released");
        require(campaign.raisedAmount > 0, "No funds to release");

        campaign.fundsReleased = true;
        campaign.beneficiary.transfer(campaign.raisedAmount);
        
        emit FundsReleased(_campaignId, campaign.beneficiary, campaign.raisedAmount);
    }

    function getCampaign(uint256 _campaignId) external view 
        campaignExists(_campaignId)
        returns (
            string memory title,
            string memory description,
            uint256 goal,
            uint256 raisedAmount,
            address beneficiary,
            bool active,
            uint256 deadline,
            bool fundsReleased
        )
    {
        Campaign memory campaign = campaigns[_campaignId];
        return (
            campaign.title,
            campaign.description,
            campaign.goal,
            campaign.raisedAmount,
            campaign.beneficiary,
            campaign.active,
            campaign.deadline,
            campaign.fundsReleased
        );
    }
}