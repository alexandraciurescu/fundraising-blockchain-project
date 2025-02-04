import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { ethers } from 'ethers';
import { 
    CONTRACT_ADDRESS, 
    CONTRACT_ABI,
    TOKEN_ADDRESS,  
    TOKEN_ABI      
} from '../utils/contractConfig';

const CampaignList = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [donationAmount, setDonationAmount] = useState({});
    const { provider, account } = useWallet();

    const fetchCampaigns = async () => {
        try {
            const contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                CONTRACT_ABI,
                provider
            );
    
            const campaignCount = await contract.campaignCount();
            console.log("Număr total campanii:", campaignCount.toString());
    
            const campaignPromises = [];
            for (let i = 0; i < campaignCount; i++) {
                campaignPromises.push(contract.getCampaign(i));
            }
    
            const campaignDetails = await Promise.all(campaignPromises);
            console.log("Campaign Details Raw:", campaignDetails);
            
            // Să vedem exact ce primim
            console.log("Campaign Details Raw:", campaignDetails);
            console.log("Prima campanie:", campaignDetails[0]);
            
            // Accesăm datele folosind numele proprietăților
            const formattedCampaigns = campaignDetails.map((campaign, index) => ({
                id: index,
                title: campaign[0],
                description: campaign[1],
                goal: campaign[2],
                raisedAmount: campaign[3],
                beneficiary: campaign[4],
                active: campaign[5],
                deadline: campaign[6],
                fundsReleased: campaign[7] || false,
                ipfsDocuments: campaign[8] || []
            }));
    
            console.log("Campanii formatate:", formattedCampaigns);
            setCampaigns(formattedCampaigns);
        } catch (error) {
            console.error("Eroare completă:", error);
            console.error("Tip eroare:", error.constructor.name);
            console.error("Stack:", error.stack);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (provider) {
            fetchCampaigns();
            
        }
    }, [provider]);

    const formatDate = (timestamp) => {
        return new Date(Number(timestamp) * 1000).toLocaleDateString();
    };

    const calculateProgress = (raised, goal) => {
        const raisedEth = ethers.formatEther(raised);
        const goalEth = ethers.formatEther(goal);
        return (Number(raisedEth) / Number(goalEth)) * 100;
    };


    const estimateGasCost = async (contract, method, args = [], value = 0) => {
        const gasEstimate = await contract[method].estimateGas(...args, { value });
        const feeData = await provider.getFeeData();
        const gasCost = ethers.formatEther(gasEstimate * feeData.gasPrice);
        return { gasEstimate, gasCost };
      };

    const handleDonate = async (campaignId) => {
        if (!account) {
            alert('Te rugăm să te conectezi cu MetaMask pentru a dona!');
            return;
        }
        
        const amount = donationAmount[campaignId];
        if (!amount || amount <= 0) {
            alert('Te rugăm să introduci o sumă validă!');
            return;
        }
    
        try {
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            const amountInWei = ethers.parseEther(amount.toString());
            // Estimăm gas-ul înainte de tranzacție
            
            const { gasEstimate, gasCost } = await estimateGasCost(
                contract,
                'donate',
                [campaignId],
                amountInWei
            );
                            
             
             // Executăm tranzacția cu gas limit estimat
            const confirmDonation = window.confirm(
                `Cost estimat gas: ${gasCost} ETH\n` +
                `Doriți să continuați cu donația?`
            );
            
            if (!confirmDonation) return;

            // Verificăm și setăm minter role dacă e necesar
            const isMinter = await contract.checkMinterStatus();
            if (!isMinter) {
                await setupMinting();
            }
    
            const govToken = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
            const balanceBefore = await govToken.balanceOf(account);
            
            
    
            const tx = await contract.donate(campaignId, { 
                value: amountInWei,
                gasLimit: gasEstimate
            });
            await tx.wait();
    
            // Restul codului rămâne la fel
            await new Promise(resolve => setTimeout(resolve, 2000));
            const balanceAfter = await govToken.balanceOf(account);
            console.log("Balanța HDAO înainte:", ethers.formatEther(balanceBefore));
            console.log("Balanța HDAO după:", ethers.formatEther(balanceAfter));
    
            // Verificări suplimentare...
            const owner = await govToken.owner();
            console.log("Token owner:", owner);
    
            if (balanceAfter === balanceBefore) {
                console.error("Balance didn't change after donation!");
                const isMinterAfter = await contract.checkMinterStatus();
                console.log("Is still minter after donation?", isMinterAfter);
            }
    
            alert('Donație realizată cu succes!');
            setDonationAmount(prev => ({...prev, [campaignId]: ''}));
            fetchCampaigns();
    
        } catch (error) {
            console.error('Eroare la donare:', error);
            alert('A apărut o eroare la procesarea donației.');
        }
    };


    const setupMinting = async () => {
        try {
            const signer = await provider.getSigner();
            const govToken = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
            
            console.log("Se setează rolul de minter pentru:", CONTRACT_ADDRESS);
            const tx = await govToken.setMinter(CONTRACT_ADDRESS, true);
            await tx.wait();
            
            const isMinter = await govToken.minters(CONTRACT_ADDRESS);
            console.log("Rol de minter setat cu succes:", isMinter);
        } catch (error) {
            console.error("Eroare la setarea rolului de minter:", error);
        }
    };

    const handleDonationChange = (campaignId, value) => {
        setDonationAmount(prev => ({
            ...prev,
            [campaignId]: value
        }));
    };

    if (isLoading) {
        return (
            <div className="text-center p-6">
                <p>Se încarcă campaniile...</p>
            </div>
        );
    }

  

    return (

        
        <div className="max-w-6xl mx-auto mt-8 px-4">
            <h2 className="text-2xl font-bold mb-6">Campanii Active</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-xl font-semibold mb-2">{campaign.title}</h3>
                            <p className="text-gray-600 mb-4 line-clamp-3">{campaign.description}</p>
                            
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                <div 
                                    className="bg-blue-600 h-2.5 rounded-full"
                                    style={{ width: `${calculateProgress(campaign.raisedAmount, campaign.goal)}%` }}
                                ></div>
                            </div>
                            
                            <div className="flex justify-between text-sm mb-4">
                                <span>{ethers.formatEther(campaign.raisedAmount)} ETH strânși</span>
                                <span>din {ethers.formatEther(campaign.goal)} ETH</span>
                            </div>
                            
                            <div className="text-sm text-gray-500 mb-4">
                                <p>Termen limită: {formatDate(campaign.deadline)}</p>
                                <p>Beneficiar: {campaign.beneficiary.slice(0, 6)}...{campaign.beneficiary.slice(-4)}</p>
                                {campaign.fundsReleased && 
                                    <p className="text-green-600">Fonduri eliberate către beneficiar</p>
                                }
                            </div>

                          
                        <div className="mt-4">
                        <h4 className="text-sm font-medium">Documente:</h4>
                        {campaign.ipfsDocuments?.map((hash, index) => (
                            <a
                                key={index}
                                href={`https://gateway.pinata.cloud/ipfs/${hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline block">
                            
                                Document {index + 1}
                            </a>
                        ))}
                    </div>
                                                
                            {campaign.active && !campaign.fundsReleased && (
                                <div className="space-y-2">
                                    <div className="flex space-x-2">
                                        <input
                                            type="number"
                                            placeholder="Suma în ETH"
                                            value={donationAmount[campaign.id] || ''}
                                            onChange={(e) => handleDonationChange(campaign.id, e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                                            step="0.01"
                                            min="0"
                                        />


                                        <button 
                                            onClick={() => handleDonate(campaign.id)}
                                            disabled={!donationAmount[campaign.id]}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                                        >
                                            Donează
                                        </button>

                                         
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {campaigns.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    Nu există campanii active momentan.
                </div>
            )}
        </div>
    );
};

export default CampaignList;