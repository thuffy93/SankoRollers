// src/components/WalletConnector.jsx
import React, { useState, useEffect } from 'react';
import BlockchainService from '../Blockchain/BlockchainService';

const WalletConnector = ({ onConnect, onDisconnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');
  const [tokenBalances, setTokenBalances] = useState({ dmt: 0, gold: 0 });
  
  // Blockchain service instance
  const blockchainService = new BlockchainService();
  
  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      const connected = blockchainService.isWalletConnected();
      
      if (connected) {
        const address = blockchainService.getWalletAddress();
        setIsConnected(true);
        setWalletAddress(address);
        
        try {
          const balances = await blockchainService.getTokenBalances();
          setTokenBalances(balances);
        } catch (error) {
          console.error('Error fetching token balances:', error);
        }
        
        if (onConnect) {
          onConnect({ address, balances: tokenBalances });
        }
      }
    };
    
    checkConnection();
  }, []);
  
  // Connect wallet
  const connectWallet = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      const result = await blockchainService.connectWallet();
      
      if (result.success) {
        setIsConnected(true);
        setWalletAddress(result.address);
        
        try {
          const balances = await blockchainService.getTokenBalances();
          setTokenBalances(balances);
          
          if (onConnect) {
            onConnect({ address: result.address, balances });
          }
        } catch (balanceError) {
          console.error('Error fetching token balances:', balanceError);
        }
      } else {
        setError(result.error || 'Failed to connect wallet');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Disconnect wallet
  const disconnectWallet = () => {
    try {
      blockchainService.disconnectWallet();
      setIsConnected(false);
      setWalletAddress('');
      setTokenBalances({ dmt: 0, gold: 0 });
      
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      setError(error.message || 'Failed to disconnect wallet');
    }
  };
  
  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  return (
    <div className="wallet-connector">
      {!isConnected ? (
        <button 
          className="connect-wallet-button"
          onClick={connectWallet}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="wallet-info">
          <div className="address-display">
            <span className="address">{formatAddress(walletAddress)}</span>
            <button 
              className="disconnect-button"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
          <div className="token-balances">
            <span className="dmt-balance">{tokenBalances.dmt} DMT</span>
            <span className="gold-balance">{tokenBalances.gold} GOLD</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="wallet-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default WalletConnector;