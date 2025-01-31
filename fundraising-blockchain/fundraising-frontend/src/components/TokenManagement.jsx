import React, { useState } from 'react';
import { ethers } from 'ethers';
import { TOKEN_ADDRESS, TOKEN_ABI } from '../utils/contractConfig';
import { useWallet } from '../context/WalletContext';

const TokenManagement = () => {
    const { account, provider } = useWallet();
    const [delegateAddress, setDelegateAddress] = useState('');
    const [loading, setLoading] = useState(false);

    const delegateVotes = async (e) => {
        e.preventDefault();
        if (!ethers.isAddress(delegateAddress)) {
            alert('Adresă invalidă');
            return;
        }

        try {
            setLoading(true);
            const signer = await provider.getSigner();
            const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

            const tx = await tokenContract.delegate(delegateAddress);
            await tx.wait();

            alert('Voturi delegate cu succes!');
            setDelegateAddress('');
        } catch (error) {
            console.error('Eroare la delegare:', error);
            alert('Eroare la delegarea voturilor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Management Token-uri</h3>
            
            {/* Formular de delegare */}
            <form onSubmit={delegateVotes} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delegare Voturi
                    </label>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="Adresa delegatului (0x...)"
                            value={delegateAddress}
                            onChange={(e) => setDelegateAddress(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-md"
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {loading ? 'Se procesează...' : 'Delegă'}
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Poți delega voturile tale către alt membru pentru a vota în numele tău
                    </p>
                </div>
            </form>

            {/* Info despre token-uri */}
            <div className="mt-6">
                <h4 className="font-semibold mb-2">Informații Token HDAO</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Fiecare token HDAO reprezintă un vot</li>
                    <li>• Token-urile sunt netransferabile pentru a păstra integritatea votului</li>
                    <li>• Poți delega voturile către alt membru</li>
                    <li>• Quorum-ul necesar este de 25% din totalul de token-uri</li>
                </ul>
            </div>
        </div>
    );
};

export default TokenManagement;