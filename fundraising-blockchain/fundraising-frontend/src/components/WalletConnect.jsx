import React from 'react';
import { useWallet } from '../context/WalletContext';

const WalletConnect = () => {
    const { account, error, connectWallet } = useWallet();

    return (
        <div className="absolute top-4 right-4">
            {error && (
                <div className="text-red-500 mb-2 text-sm">
                    {error}
                </div>
            )}
            
            {!account ? (
                <button
                    onClick={connectWallet}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                    Conectează Wallet
                </button>
            ) : (
                <div className="bg-gray-100 px-4 py-2 rounded-md">
                    {account.slice(0, 6)}...{account.slice(-4)}
                </div>
            )}
        </div>
    );
};

export default WalletConnect;