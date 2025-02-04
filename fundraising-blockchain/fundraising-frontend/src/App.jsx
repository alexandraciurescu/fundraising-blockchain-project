import React, { useState } from 'react';
import CreateCampaignForm from './components/CreateCampaignForm';
import CampaignList from './components/CampaignList';
import DAOInterface from './components/DAOInterface';
import WalletConnect from './components/WalletConnect';
import { WalletProvider } from './context/WalletContext';
import EventsViewer from './components/EventsViewer';

function App() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Modificăm starea pentru a include și 'events'
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns', 'dao' sau 'events'

  return (
    <WalletProvider>
      <div className="min-h-screen bg-blue-100 py-6 flex flex-col">
        <WalletConnect />
        <h1 className="text-4xl font-bold text-center text-blue-600 mb-8">
          Platforma de Donații
        </h1>

        {/* Tab Switcher modificat pentru 3 butoane */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-6 py-2 ${
              activeTab === 'campaigns'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            } rounded-l-md`}
          >
            Campanii
          </button>
          <button
            onClick={() => setActiveTab('dao')}
            className={`px-6 py-2 ${
              activeTab === 'dao'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            DAO
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-6 py-2 ${
              activeTab === 'events'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            } rounded-r-md`}
          >
            Evenimente
          </button>
        </div>

        {/* Condiții pentru afișarea conținutului */}
        {activeTab === 'campaigns' && (
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
        )}
        
        {activeTab === 'dao' && <DAOInterface />}
        {activeTab === 'events' && <EventsViewer />}
      </div>
    </WalletProvider>
  );
}

export default App;