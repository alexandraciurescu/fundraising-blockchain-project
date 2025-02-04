// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./GovernanceToken.sol";
import "./HumanitarianFund.sol";

contract HumanitarianDAO {
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        uint256 campaignId;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
    }

    GovernanceToken public token;
    HumanitarianFund public fund;
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    uint256 public votingPeriod = 5 minutes;
    uint256 public votingDelay = 0 days;
    uint256 public quorumVotes;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 startTime,
        uint256 endTime
    );
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        bool support,
        uint256 votes
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);

    constructor(address _token, address _fund) {
        token = GovernanceToken(_token);
        fund = HumanitarianFund(_fund);
        quorumVotes = token.totalSupply() / 4;
    }

    modifier onlyTokenHolder() {
        require(token.balanceOf(msg.sender) > 0, "Must have governance tokens");
        _;
    }

    function propose(
        string memory title,
        string memory description,
        uint256 campaignId
    ) public onlyTokenHolder returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        
        // Verifică dacă campania există și dacă fondurile nu au fost deja eliberate
        (,,,,,, , bool fundsReleased, ) = fund.getCampaign(campaignId);

        require(!fundsReleased, "Funds already released for this campaign");
        
        uint256 proposalId = proposalCount++;
        Proposal storage newProposal = proposals[proposalId];
        
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.campaignId = campaignId;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + votingPeriod;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            newProposal.startTime,
            newProposal.endTime
        );

        return proposalId;
    }

    function castVote(uint256 proposalId, bool support) public onlyTokenHolder {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed && !proposal.canceled, "Proposal already executed or canceled");

        uint256 votes = token.balanceOf(msg.sender);
        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }

        proposal.hasVoted[msg.sender] = true;

        emit VoteCast(msg.sender, proposalId, support, votes);
    }

    function _hasReachedQuorum(uint256 totalVotes) private view returns (bool) {
       return totalVotes >= quorumVotes;
}

    function executeProposal(uint256 proposalId) public {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.executed && !proposal.canceled, "Proposal already executed or canceled");
        require(proposal.forVotes > proposal.againstVotes, "Proposal not passed");
        require(_hasReachedQuorum(proposal.forVotes + proposal.againstVotes), "Quorum not reached");

        // Verifică din nou dacă fondurile nu au fost deja eliberate
        (,,,,,, , bool fundsReleased, ) = fund.getCampaign(proposal.campaignId);
        require(!fundsReleased, "Funds already released for this campaign");

        proposal.executed = true;

        // Execută transferul fondurilor
        fund.releaseFunds(proposal.campaignId);

        emit ProposalExecuted(proposalId);
    }

    function cancelProposal(uint256 proposalId) public {
        Proposal storage proposal = proposals[proposalId];
        require(msg.sender == proposal.proposer, "Only proposer can cancel");
        require(!proposal.executed, "Cannot cancel executed proposal");
        require(block.timestamp < proposal.startTime, "Voting already started");

        proposal.canceled = true;
        emit ProposalCanceled(proposalId);
    }

    function getProposal(uint256 proposalId) public view returns (
        address proposer,
        string memory title,
        string memory description,
        uint256 campaignId,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 startTime,
        uint256 endTime,
        bool executed,
        bool canceled
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.campaignId,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.canceled
        );
    }

    function hasVoted(uint256 proposalId, address voter) public view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }

    // Funcție internal - verificare pentru starea propunerii
   function _isProposalActive(Proposal storage prop) internal view returns (bool) {
        return block.timestamp >= prop.startTime && 
           block.timestamp <= prop.endTime && 
           !prop.executed && 
           !prop.canceled;
}
}