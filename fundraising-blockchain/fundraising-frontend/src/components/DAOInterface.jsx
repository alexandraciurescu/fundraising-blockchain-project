import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { ethers } from 'ethers';
import { TOKEN_ADDRESS, DAO_ADDRESS, TOKEN_ABI, DAO_ABI, CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contractConfig';
import TokenManagement from './TokenManagement';

const DAOInterface = () => {
    const { account, provider } = useWallet();
    const [tokenBalance, setTokenBalance] = useState('0');
    const [quorumVotes, setQuorumVotes] = useState('0');
    const [proposals, setProposals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [votedProposals, setVotedProposals] = useState({});
    const [newProposal, setNewProposal] = useState({
        title: '',
        description: '',
        campaignId: ''
    });
    const [campaigns, setCampaigns] = useState([]);
    const [executingProposal, setExecutingProposal] = useState(null);

    const fetchCampaigns = async () => {
        try {
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
            const campaignCount = await contract.campaignCount();
            const campaignPromises = [];
            for (let i = 0; i < campaignCount; i++) {
                campaignPromises.push(contract.getCampaign(i));
            }
    
            const campaignDetails = await Promise.all(campaignPromises);
            console.log("Campaign Details în DAO:", campaignDetails);
            
            const formattedCampaigns = campaignDetails.map((campaign, index) => ({
                id: index,
                title: campaign.title,          // folosim proprietățile în loc de indexi
                description: campaign.description,
                goal: campaign.goal,
                raisedAmount: campaign.raisedAmount,
                beneficiary: campaign.beneficiary,
                active: campaign.active,
                deadline: campaign.deadline,
                fundsReleased: campaign.fundsReleased
            }));
    
            // Filtrăm doar campaniile care nu au fondurile eliberate
            const availableCampaigns = formattedCampaigns.filter(c => !c.fundsReleased);
            console.log("Campanii disponibile pentru propuneri:", availableCampaigns);
            
            setCampaigns(availableCampaigns);
        } catch (error) {
            console.error("Eroare la încărcarea campaniilor în DAO:", error);
            console.log("Detalii eroare:", error.stack);
        }
    };

    const fetchQuorum = async () => {
        if (!provider) return;
        try {
            const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
            const quorum = await daoContract.quorumVotes();
            setQuorumVotes(quorum);
        } catch (error) {
            console.error('Error fetching quorum:', error);
        }
    };

    const fetchTokenBalance = async () => {
        if (!account || !provider) return;
        try {
            const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
            const balance = await tokenContract.balanceOf(account);
            setTokenBalance(ethers.formatEther(balance));
        } catch (error) {
            console.error('Error fetching token balance:', error);
        }
    };

    const checkVotedProposals = async () => {
        if (!account || !provider) return;
        try {
            const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
            const votes = {};
            for (let i = 0; i < proposals.length; i++) {
                votes[i] = await daoContract.hasVoted(i, account);
            }
            setVotedProposals(votes);
        } catch (error) {
            console.error('Error checking voted proposals:', error);
        }
    };

    const fetchProposals = async () => {
        if (!provider) return;
        try {
            const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
            const proposalCount = await daoContract.proposalCount();
            const proposalPromises = [];
            for (let i = 0; i < proposalCount; i++) {
                proposalPromises.push(daoContract.getProposal(i));
            }
            const proposalDetails = await Promise.all(proposalPromises);
            setProposals(proposalDetails);
        } catch (error) {
            console.error('Error fetching proposals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const executeProposal = async (proposalId) => {
        if (!account) {
            alert('Te rugăm să te conectezi cu MetaMask');
            return;
        }

        setExecutingProposal(proposalId);
        try {
            const signer = await provider.getSigner();
            const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);
            const tx = await daoContract.executeProposal(proposalId);
            await tx.wait();
            
            alert('Propunere executată cu succes! Fondurile au fost eliberate.');
            fetchProposals();
            fetchCampaigns();
        } catch (error) {
            console.error('Error executing proposal:', error);
            alert('Eroare la executarea propunerii: ' + error.message);
        } finally {
            setExecutingProposal(null);
        }
    };

    const calculateProgress = (proposal) => {
        const totalVotes = Number(ethers.formatEther(proposal.forVotes)) + 
                          Number(ethers.formatEther(proposal.againstVotes));
        const quorumInEther = Number(ethers.formatEther(quorumVotes));
        
        if (totalVotes === 0) return { forPercentage: 0, quorumPercentage: 0 };
        
        return {
            forPercentage: (Number(ethers.formatEther(proposal.forVotes)) / totalVotes) * 100,
            quorumPercentage: Math.min((totalVotes / quorumInEther) * 100, 100) // limităm la 100%
        };
    };

    const isProposalValid = (proposal) => {
        const now = Math.floor(Date.now() / 1000);
        const campaign = campaigns.find(c => c.id === Number(proposal.campaignId));
        return (
            !proposal.executed &&
            !proposal.canceled &&
            now >= Number(proposal.startTime) &&
            now <= Number(proposal.endTime) &&
            campaign && !campaign.fundsReleased
        );
    };

    const getTimeRemaining = (proposal) => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = Number(proposal.endTime) - now;
        if (remaining <= 0) return "Votare încheiată";
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        return `${days}z ${hours}h rămase`;
    };

    const estimateGasCost = async (contract, method, args = [], value = 0) => {         
        const gasEstimate = await contract[method].estimateGas(...args, { value });         
        const feeData = await provider.getFeeData();         
        const gasCost = ethers.formatEther(gasEstimate * feeData.gasPrice);         
        return { gasEstimate, gasCost };      };

    const createProposal = async (e) => {
        e.preventDefault();
        if (!account) {
            alert('Te rugăm să te conectezi cu MetaMask');
            return;
        }
    
        try {
            // Verificăm dacă există deja o propunere activă pentru această campanie
            const hasActiveProposal = proposals.some(p => 
                Number(p.campaignId) === Number(newProposal.campaignId) && 
                !p.executed && 
                !p.canceled && 
                Date.now() / 1000 <= Number(p.endTime)
            );
    
            if (hasActiveProposal) {
                alert('Există deja o propunere activă pentru această campanie!');
                return;
            }
    
            const signer = await provider.getSigner();
            const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);
            
            const { gasEstimate, gasCost } = await estimateGasCost(
                daoContract,
                'propose',
                [
                    newProposal.title,
                    newProposal.description,
                    newProposal.campaignId
                ]
            );

            const confirmCreate = window.confirm(
                `Cost estimat gas: ${gasCost} ETH\n` +
                `Doriți să creați propunerea?`
            );
            
            if (!confirmCreate) return;

            const tx = await daoContract.propose(
                newProposal.title,
                newProposal.description,
                newProposal.campaignId
            );
    
            await tx.wait();
            alert('Propunere creată cu succes!');
            setNewProposal({ title: '', description: '', campaignId: '' });
            fetchProposals();
        } catch (error) {
            console.error('Error creating proposal:', error);
            alert('Eroare la crearea propunerii: ' + error.message);
        }
    };

    const castVote = async (proposalId, support) => {
        if (!account) {
            alert('Te rugăm să te conectezi cu MetaMask pentru a vota');
            return;
        }
        try {
            const signer = await provider.getSigner();
            const daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);
            
            const { gasEstimate, gasCost } = await estimateGasCost(
                daoContract,
                'castVote',
                [proposalId, support]
            );

            const confirmVote = window.confirm(
                `Cost estimat gas: ${gasCost} ETH\n` +
                `Doriți să votați?`
            );
            
            if (!confirmVote) return;

            if (votedProposals[proposalId]) {
                alert('Ai votat deja pentru această propunere');
                return;
            }

            const proposal = proposals[proposalId];
            const campaign = campaigns.find(c => c.id === Number(proposal.campaignId));
            if (campaign && campaign.fundsReleased) {
                alert('Fondurile pentru această campanie au fost deja eliberate');
                return;
            }

            if (!isProposalValid(proposals[proposalId])) {
                alert('Această propunere nu mai este activă');
                return;
            }

            const tx = await daoContract.castVote(proposalId, support);
            await tx.wait();
            alert('Vot înregistrat cu succes!');
            fetchProposals();
            checkVotedProposals();
        } catch (error) {
            console.error('Error casting vote:', error);
            alert('Eroare la votare: ' + error.message);
        }
    };

    useEffect(() => {
        if (provider) {
            fetchTokenBalance();
            fetchProposals();
            fetchCampaigns();
            fetchQuorum();
        }
    }, [provider, account]);

    useEffect(() => {
        if (proposals.length > 0 && account) {
            checkVotedProposals();
        }
    }, [proposals, account]);

    if (!account) {
        return (
            <div className="text-center p-6">
                <p>Te rugăm să te conectezi cu MetaMask pentru a accesa funcționalitățile DAO.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto mt-8 px-4">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4">DAO Dashboard</h2>
                <p className="mb-4">Token Balance: {tokenBalance} HDAO</p>
               {/* <TokenManagement /> */}

                <form onSubmit={createProposal} className="space-y-4 mb-6">
                    <div>
                        <input
                            type="text"
                            placeholder="Titlu propunere"
                            value={newProposal.title}
                            onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                        />
                    </div>
                    <div>
                        <textarea
                            placeholder="Descriere propunere"
                            value={newProposal.description}
                            onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md h-32"
                            required
                        />
                    </div>
                    <div>
                        <select
                            value={newProposal.campaignId}
                            onChange={(e) => setNewProposal({ ...newProposal, campaignId: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                        >
                            <option value="">Selectează o campanie</option>
                            {campaigns.map((campaign) => (
                                <option key={campaign.id} value={campaign.id}>
                                    {campaign.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                    >
                        Creează Propunere
                    </button>
                </form>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Propuneri Active</h3>
                    {isLoading ? (
                        <p>Se încarcă propunerile...</p>
                    ) : (
                        proposals.map((proposal, index) => (
                            <div key={index} className="border rounded-lg p-4">
                                <h4 className="font-bold">{proposal.title}</h4>
                                <p className="text-gray-600">{proposal.description}</p>
                                <p className="text-sm text-blue-600 mt-1">
                                    Campanie: {campaigns.find(c => c.id === Number(proposal.campaignId))?.title || 'Necunoscută'}
                                </p>

                                <div className="mt-4 space-y-2">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Progres voturi</p>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div 
                                                className="bg-blue-600 h-2.5 rounded-full"
                                                style={{ width: `${calculateProgress(proposal).forPercentage}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Progres quorum</p>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div 
                                                className="bg-green-600 h-2.5 rounded-full"
                                                style={{ width: `${calculateProgress(proposal).quorumPercentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p>Pentru: {ethers.formatEther(proposal.forVotes)} HDAO</p>
                                        <p>Împotrivă: {ethers.formatEther(proposal.againstVotes)} HDAO</p>
                                    </div>
                                    <div>
                                        <p>{getTimeRemaining(proposal)}</p>
                                    </div>
                                </div>

                                {isProposalValid(proposal) && !votedProposals[index] && (
                                    <div className="mt-4 flex space-x-2">
                                        <button
                                            onClick={() => castVote(index, true)}
                                            className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                                        >
                                            Pentru
                                        </button>
                                        <button
                                            onClick={() => castVote(index, false)}
                                            className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                                        >
                                            Împotrivă
                                        </button>
                                    </div>
                                )}

                                {votedProposals[index] && (
                                    <p className="mt-2 text-blue-600 text-sm">Ai votat deja</p>
                                )}

                                {!proposal.executed && 
                                 proposal.forVotes > proposal.againstVotes && 
                                 Date.now() / 1000 > Number(proposal.endTime) && (
                                    <button
                                        onClick={() => executeProposal(index)}
                                        disabled={executingProposal === index}
                                        className="mt-4 w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                                    >
                                        {executingProposal === index ? 'Se execută...' : 'Execută Propunere'}
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DAOInterface;