import React, { createContext, useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractABI } from "../../../contracts/abi";
import { contractAddress } from "../../../contracts/address";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
    const [account, setAccount] = useState('');
    const [error, setError] = useState('');
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);

    const connectWallet = async () => {
        try {
            if (window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                
                const signer = await provider.getSigner();
                const contractInstance = new ethers.Contract(
                    contractAddress,
                    contractABI,
                    signer
                );

                setAccount(accounts[0]);
                setProvider(provider);
                setContract(contractInstance);
                setError('');
            } else {
                setError('Te rugăm să instalezi MetaMask!');
            }
        } catch (err) {
            setError('A apărut o eroare la conectarea cu MetaMask!');
            console.error(err);
        }
    };

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                } else {
                    setAccount('');
                    setContract(null);
                }
            });
        }
    }, []);

    return (
        <WalletContext.Provider value={{ account, error, provider, contract, connectWallet }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    return useContext(WalletContext);
};