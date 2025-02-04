// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DAOObserver {
    // Structuri pentru stocarea activităților
    struct DonationActivity {
        uint256 campaignId;
        address donor;
        uint256 amount;
        uint256 tokens;
        uint256 timestamp;
    }

    struct ProposalActivity {
        uint256 proposalId;
        address proposer;
        string title;
        uint256 timestamp;
        bool isExecuted;
    }

    struct VoteActivity {
        uint256 proposalId;
        address voter;
        bool support;
        uint256 votes;
        uint256 timestamp;
    }

    // Mapări pentru stocarea activităților
    mapping(uint256 => DonationActivity[]) public campaignDonations;
    mapping(uint256 => ProposalActivity) public proposals;
    mapping(uint256 => VoteActivity[]) public proposalVotes;
    mapping(address => uint256[]) public userProposals;
    mapping(address => uint256[]) public userVotes;

    // Evenimente pentru observare
    event DonationObserved(uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 tokens);
    event ProposalObserved(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteObserved(uint256 indexed proposalId, address indexed voter, bool support, uint256 votes);
    event ProposalExecutionObserved(uint256 indexed proposalId);

    // Funcții pentru procesarea evenimentelor
    function onDonationMade(
        uint256 campaignId,
        address donor,
        uint256 amount,
        uint256 tokens
    ) external {
        DonationActivity memory activity = DonationActivity({
            campaignId: campaignId,
            donor: donor,
            amount: amount,
            tokens: tokens,
            timestamp: block.timestamp
        });

        campaignDonations[campaignId].push(activity);
        emit DonationObserved(campaignId, donor, amount, tokens);
    }

    function onProposalCreated(
        uint256 proposalId,
        address proposer,
        string memory title
    ) external {
        ProposalActivity memory activity = ProposalActivity({
            proposalId: proposalId,
            proposer: proposer,
            title: title,
            timestamp: block.timestamp,
            isExecuted: false
        });

        proposals[proposalId] = activity;
        userProposals[proposer].push(proposalId);
        emit ProposalObserved(proposalId, proposer, title);
    }

    function onVoteCast(
        uint256 proposalId,
        address voter,
        bool support,
        uint256 votes
    ) external {
        VoteActivity memory activity = VoteActivity({
            proposalId: proposalId,
            voter: voter,
            support: support,
            votes: votes,
            timestamp: block.timestamp
        });

        proposalVotes[proposalId].push(activity);
        userVotes[voter].push(proposalId);
        emit VoteObserved(proposalId, voter, support, votes);
    }

    function onProposalExecuted(uint256 proposalId) external {
        if (proposals[proposalId].proposalId == proposalId) {
            proposals[proposalId].isExecuted = true;
            emit ProposalExecutionObserved(proposalId);
        }
    }

    // Funcții de vizualizare
    function getCampaignDonations(uint256 campaignId) external view returns (DonationActivity[] memory) {
        return campaignDonations[campaignId];
    }

    function getProposalVotes(uint256 proposalId) external view returns (VoteActivity[] memory) {
        return proposalVotes[proposalId];
    }

    function getUserProposals(address user) external view returns (uint256[] memory) {
        return userProposals[user];
    }

    function getUserVotes(address user) external view returns (uint256[] memory) {
        return userVotes[user];
    }

    // Funcții utilitare pentru statistici
    function getCampaignDonationCount(uint256 campaignId) external view returns (uint256) {
        return campaignDonations[campaignId].length;
    }

    function getProposalVoteCount(uint256 proposalId) external view returns (uint256) {
        return proposalVotes[proposalId].length;
    }

    function getUserProposalCount(address user) external view returns (uint256) {
        return userProposals[user].length;
    }

    function getUserVoteCount(address user) external view returns (uint256) {
        return userVotes[user].length;
    }
}