import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contractConfig';
import { create } from 'ipfs-http-client';
import axios from 'axios';
import { PINATA_CONFIG } from '../config/pinata';


// Configurare Pinata
//const pinataApiKey = process.env.VITE_PINATA_API_KEY;
//const pinataApiSecret = process.env.VITE_PINATA_API_SECRET;

/*const ipfs = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https'
  });*/

console.log("Pinata Key:", import.meta.env.VITE_PINATA_API_KEY);
console.log("Pinata Secret exists:", !!import.meta.env.VITE_PINATA_API_SECRET);

const CreateCampaignForm = () => {
    const { account, provider } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        goal: '',
        duration: '',
        beneficiary: ''
    });

    const [files, setFiles] = useState([]);

    const uploadToPinata = async (file) => {
        if (!file) return;
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('Starting upload with Pinata config...');

            const response = await axios({
                method: 'post',
                url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
                data: formData,
                headers: {
                    'Content-Type': `multipart/form-data;`,
                    pinata_api_key: PINATA_CONFIG.apiKey,
                    pinata_secret_api_key: PINATA_CONFIG.apiSecret
                }
            });

            console.log('Upload successful:', response.data);

            return response.data.IpfsHash;
        } catch (error) {
            console.error('Error uploading to Pinata:', error);
            throw new Error('Failed to upload to Pinata');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!account) {
            alert('Te rugăm să te conectezi cu MetaMask pentru a crea o campanie!');
            return;
        }

        try {
            setIsLoading(true);
            const ipfsHashes = await Promise.all(
                files.map(file => uploadToPinata(file))
              );
            const goalInWei = ethers.parseEther(formData.goal.toString());
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                CONTRACT_ABI,
                signer
            );

            const beneficiary = formData.beneficiary || account;

            // Verificăm dacă adresa beneficiarului este validă
            if (!ethers.isAddress(beneficiary)) {
                throw new Error('Adresa beneficiarului nu este validă');
            }

            const tx = await contract.createCampaign(
                formData.title,
                formData.description,
                goalInWei,
                beneficiary,
                parseInt(formData.duration),
                ipfsHashes
            );

            await tx.wait();
            alert('Campanie creată cu succes!');
            
            setFormData({
                title: '',
                description: '',
                goal: '',
                duration: '',
                beneficiary: ''
            });
            setFiles([]);

        } catch (error) {
            console.error('Eroare la crearea campaniei:', error);
            alert('A apărut o eroare la crearea campaniei: ' + (error.message || 'Eroare necunoscută'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!account) {
        return (
            <div className="text-center p-6 bg-white rounded-lg shadow-md">
                <p className="text-gray-600">
                    Te rugăm să te conectezi cu MetaMask pentru a crea o campanie.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto mt-10 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-center mb-6">Creează o Campanie Nouă</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titlu Campanie
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Ex: Ajutor pentru spitalul..."
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descriere
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Descrie scopul campaniei și cum vor fi folosiți banii..."
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Suma țintă (ETH)
                    </label>
                    <input
                        type="number"
                        name="goal"
                        value={formData.goal}
                        onChange={handleChange}
                        placeholder="1.5"
                        step="0.01"
                        min="0"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Durată (zile)
                    </label>
                    <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        placeholder="30"
                        min="1"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adresă Beneficiar (opțional)
                    </label>
                    <input
                        type="text"
                        name="beneficiary"
                        value={formData.beneficiary}
                        onChange={handleChange}
                        placeholder="0x... (lasă gol pentru a folosi adresa ta)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                    />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documente Support (IPFS)
                </label>
                <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400"
                    disabled={isLoading}
                >
                    {isLoading ? 'Se creează...' : 'Creează Campanie'}
                </button>
            </form>
        </div>
    );
};

export default CreateCampaignForm;