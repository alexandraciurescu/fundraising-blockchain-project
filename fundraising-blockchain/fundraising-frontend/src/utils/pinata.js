import axios from 'axios';

const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
const pinataApiSecret = import.meta.env.VITE_PINATA_API_SECRET;

export async function uploadToPinata(file) {
    if (!file) return;
    
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios({
            method: 'post',
            url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
            data: formData,
            headers: {
                'Content-Type': `multipart/form-data;`,
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataApiSecret
            }
        });

        return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
        console.error('Error uploading to Pinata:', error);
        throw new Error('Failed to upload to Pinata');
    }
}