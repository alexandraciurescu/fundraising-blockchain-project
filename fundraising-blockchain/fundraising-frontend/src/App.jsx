import React, { useState } from 'react';
import CreateCampaignForm from './components/CreateCampaignForm';
import CampaignList from './components/CampaignList';
import DAOInterface from './components/DAOInterface';
import WalletConnect from './components/WalletConnect';
import { WalletProvider } from './context/WalletContext';

function App() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' sau 'dao'

  return (
    <WalletProvider>
      <div className="min-h-screen bg-blue-100 py-6 flex flex-col">
        <WalletConnect />
        <h1 className="text-4xl font-bold text-center text-blue-600 mb-8">
          Platforma de Donații
        </h1>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-6 py-2 rounded-l-md ${
              activeTab === 'campaigns' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Campanii
          </button>
          <button
            onClick={() => setActiveTab('dao')}
            className={`px-6 py-2 rounded-r-md ${
              activeTab === 'dao' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            DAO
          </button>
        </div>

        {activeTab === 'campaigns' ? (
          <>
            <div className="flex justify-center mb-8">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                {showCreateForm ? 'Închide Formularul' : 'Creează o Campanie Nouă'}
              </button>
            </div>

            {showCreateForm && (
              <div className="relative py-3 sm:max-w-xl sm:mx-auto mb-8">
                <CreateCampaignForm />
              </div>
            )}

            <CampaignList />
          </>
        ) : (
          <DAOInterface />
        )}
      </div>
    </WalletProvider>
  );
}

export default App;