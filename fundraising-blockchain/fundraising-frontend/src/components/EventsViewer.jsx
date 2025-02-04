import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { DAO_ADDRESS, DAO_ABI } from '../utils/contractConfig';

const EventsViewer = () => {
    const [proposalEvents, setProposalEvents] = useState([]);
    const [voteEvents, setVoteEvents] = useState([]);
    const { provider } = useWallet();

    useEffect(() => {
        if (!provider) return;

        const loadEvents = async () => {
            const contract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
            
            // Ascultă evenimente noi de propuneri
            contract.on("ProposalCreated", (proposalId, proposer, title, startTime, endTime) => {
                setProposalEvents(prev => [...prev, {
                    proposalId: proposalId.toString(),
                    proposer,
                    title,
                    startTime: new Date(Number(startTime) * 1000).toLocaleString(),
                    endTime: new Date(Number(endTime) * 1000).toLocaleString()
                }]);
            });

            // Ascultă evenimente noi de voturi
            contract.on("VoteCast", (voter, proposalId, support, votes) => {
                setVoteEvents(prev => [...prev, {
                    voter,
                    proposalId: proposalId.toString(),
                    support: support ? "Pentru" : "Împotrivă",
                    votes: ethers.formatEther(votes)
                }]);
            });

            // Încarcă istoric propuneri
            const proposalFilter = contract.filters.ProposalCreated();
            const proposalHistory = await contract.queryFilter(proposalFilter);
            const formattedProposals = proposalHistory.map(event => ({
                proposalId: event.args.proposalId.toString(),
                proposer: event.args.proposer,
                title: event.args.title,
                startTime: new Date(Number(event.args.startTime) * 1000).toLocaleString(),
                endTime: new Date(Number(event.args.endTime) * 1000).toLocaleString()
            }));
            setProposalEvents(formattedProposals);

            // Încarcă istoric voturi
            const voteFilter = contract.filters.VoteCast();
            const voteHistory = await contract.queryFilter(voteFilter);
            const formattedVotes = voteHistory.map(event => ({
                voter: event.args.voter,
                proposalId: event.args.proposalId.toString(),
                support: event.args.support ? "Pentru" : "Împotrivă",
                votes: ethers.formatEther(event.args.votes)
            }));
            setVoteEvents(formattedVotes);
        };

        loadEvents();

        // Cleanup la deconectare
        return () => {
            const contract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
            contract.removeAllListeners();
        };
    }, [provider]);

    return (
        <div className="max-w-6xl mx-auto mt-8 px-4">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-6">Istoric Evenimente DAO</h2>

                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Propuneri Create</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propunător</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titlu</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {proposalEvents.map((event, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap">{event.proposalId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{event.proposer}</td>
                                        <td className="px-6 py-4">{event.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{event.startTime}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{event.endTime}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold mb-4">Voturi Înregistrate</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votant</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Propunere</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vot</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Putere Vot</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {voteEvents.map((event, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap">{event.voter}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{event.proposalId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{event.support}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{event.votes} HDAO</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventsViewer;