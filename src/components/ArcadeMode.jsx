// src/components/ArcadeMode.jsx
import React, { useState, useEffect } from 'react';
import BlockchainService from '../Blockchain/BlockchainService';
import GameUI from './GameUI';

const ArcadeMode = ({ onBack, walletInfo }) => {
  // State
  const [isEntering, setIsEntering] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [entryToken, setEntryToken] = useState('dmt');
  const [entryAmount, setEntryAmount] = useState(50); // Default 50 DMT
  const [entryError, setEntryError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameSettings, setGameSettings] = useState({
    difficulty: 'arcade',
    totalHoles: 9,
    isArcadeMode: true
  });
  
  // Blockchain service instance
  const blockchainService = new BlockchainService();
  
  // Load leaderboard data
  useEffect(() => {
    // Mock leaderboard data for demonstration
    const mockLeaderboard = [
      { rank: 1, address: '0x1234...5678', score: 28, prize: 120 },
      { rank: 2, address: '0x2345...6789', score: 31, prize: 80 },
      { rank: 3, address: '0x3456...7890', score: 34, prize: 50 },
      { rank: 4, address: '0x4567...8901', score: 36, prize: 30 },
      { rank: 5, address: '0x5678...9012', score: 39, prize: 20 },
      { rank: 6, address: '0x6789...0123', score: 42, prize: 10 },
      { rank: 7, address: '0x7890...1234', score: 45, prize: 5 },
      { rank: 8, address: '0x8901...2345', score: 47, prize: 3 },
      { rank: 9, address: '0x9012...3456', score: 50, prize: 2 },
      { rank: 10, address: '0x0123...4567', score: 52, prize: 1 }
    ];
    
    setLeaderboard(mockLeaderboard);
  }, []);
  
  // Enter arcade mode
  const enterArcade = async () => {
    if (!walletInfo || !walletInfo.address) {
      setEntryError('Please connect your wallet first');
      return;
    }
    
    setIsEntering(true);
    setEntryError('');
    
    try {
      let result;
      
      if (entryToken === 'dmt') {
        // Check if user has enough DMT
        if (walletInfo.balances.dmt < entryAmount) {
          throw new Error('Insufficient DMT balance');
        }
        
        result = await blockchainService.enterArcadeWithDMT(entryAmount);
      } else {
        // Check if user has enough Gold
        if (walletInfo.balances.gold < entryAmount) {
          throw new Error('Insufficient Gold balance');
        }
        
        result = await blockchainService.enterArcadeWithGold(entryAmount);
      }
      
      if (result.success) {
        setHasEntered(true);
      } else {
        setEntryError(result.error || 'Failed to enter arcade');
      }
    } catch (error) {
      console.error('Error entering arcade:', error);
      setEntryError(error.message || 'Failed to enter arcade');
    } finally {
      setIsEntering(false);
    }
  };
  
  // Handle game completion
  const handleGameCompleted = (gameData) => {
    // Add player to leaderboard with their score
    const newLeaderboardEntry = {
      rank: '?',
      address: walletInfo.address,
      score: gameData.totalStrokes,
      prize: '?'
    };
    
    // Insert into leaderboard based on score (lower is better)
    const newLeaderboard = [...leaderboard];
    
    // Find position
    let insertIndex = 0;
    while (insertIndex < newLeaderboard.length && 
           newLeaderboard[insertIndex].score < newLeaderboardEntry.score) {
      insertIndex++;
    }
    
    // Insert at position
    newLeaderboard.splice(insertIndex, 0, newLeaderboardEntry);
    
    // Update ranks
    newLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    // Keep only top 10
    if (newLeaderboard.length > 10) {
      newLeaderboard.splice(10);
    }
    
    // Update leaderboard
    setLeaderboard(newLeaderboard);
    
    // Reset arcade state
    setHasEntered(false);
  };
  
  // Change entry token type
  const handleTokenChange = (e) => {
    const newToken = e.target.value;
    setEntryToken(newToken);
    
    // Update default entry amount
    if (newToken === 'dmt') {
      setEntryAmount(50);
    } else {
      setEntryAmount(10);
    }
  };
  
  // Render entry form
  const renderEntryForm = () => {
    return (
      <div className="arcade-entry-form">
        <h2>Enter Daily Arcade Tournament</h2>
        
        <div className="entry-description">
          <p>
            Compete for prizes in the daily arcade tournament! Top 10% of players 
            split the prize pool. Your best score will be recorded on the leaderboard.
          </p>
        </div>
        
        <div className="token-selection">
          <div className="form-group">
            <label>Entry Token:</label>
            <select value={entryToken} onChange={handleTokenChange}>
              <option value="dmt">DMT Token</option>
              <option value="gold">Gold Token</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Entry Amount:</label>
            <div className="amount-display">
              {entryAmount} {entryToken.toUpperCase()}
            </div>
          </div>
        </div>
        
        <div className="token-distribution">
          <h3>Token Distribution</h3>
          {entryToken === 'dmt' ? (
            <ul>
              <li>70% to Prize Pool</li>
              <li>25% to Liquidity Pool</li>
              <li>5% to Developer Fee</li>
            </ul>
          ) : (
            <ul>
              <li>90% to Prize Pool</li>
              <li>10% Burned</li>
            </ul>
          )}
        </div>
        
        <div className="balance-info">
          <p>
            Your Balance: {entryToken === 'dmt' 
              ? `${walletInfo?.balances?.dmt || 0} DMT` 
              : `${walletInfo?.balances?.gold || 0} GOLD`
            }
          </p>
        </div>
        
        {entryError && (
          <div className="entry-error">
            {entryError}
          </div>
        )}
        
        <div className="entry-actions">
          <button 
            className="back-button"
            onClick={onBack}
          >
            Back
          </button>
          
          <button 
            className="enter-button"
            onClick={enterArcade}
            disabled={isEntering || !walletInfo || !walletInfo.address}
          >
            {isEntering ? 'Processing...' : 'Enter Tournament'}
          </button>
        </div>
      </div>
    );
  };
  
  // Render leaderboard
  const renderLeaderboard = () => {
    return (
      <div className="arcade-leaderboard">
        <h2>Daily Leaderboard</h2>
        
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
              <th>Prize</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={index} className={entry.address === walletInfo?.address ? 'highlighted-row' : ''}>
                <td>{entry.rank}</td>
                <td>{entry.address === walletInfo?.address ? 'You' : entry.address}</td>
                <td>{entry.score}</td>
                <td>{entry.prize} {entryToken === 'dmt' ? 'GOLD' : 'GOLD'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="arcade-mode-container">
      {hasEntered ? (
        <GameUI 
          gameSettings={gameSettings} 
          onGameCompleted={handleGameCompleted}
        />
      ) : (
        <div className="arcade-lobby">
          <div className="arcade-header">
            <h1>Arcade Mode</h1>
          </div>
          
          <div className="arcade-content">
            {renderEntryForm()}
            {renderLeaderboard()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArcadeMode;