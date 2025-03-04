// app/components/CuratorLeaderboard.tsx
import React, { useEffect, useState } from 'react';

// Sample data for the leaderboard
const initialLeaderboardData = [
  { id: '1', username: 'artexplorer', points: 427, discoveries: 12 },
  { id: '2', username: 'token_curator', points: 385, discoveries: 9 },
  { id: '3', username: 'digital_collector', points: 312, discoveries: 7 },
  { id: '4', username: 'culture_hunter', points: 256, discoveries: 6 },
  { id: '5', username: 'artDAO_founder', points: 201, discoveries: 5 },
];

export interface CuratorData {
  id: string;
  username: string;
  points: number;
  discoveries: number;
}

interface CuratorLeaderboardProps {
  userId?: string; // Current user's ID, if authenticated
  onCollect?: (tokenId: string) => void;
}

const CuratorLeaderboard: React.FC<CuratorLeaderboardProps> = ({
  userId,
  onCollect,
}) => {
  const [leaderboardData, setLeaderboardData] = useState<CuratorData[]>(initialLeaderboardData);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loadingRank, setLoadingRank] = useState<boolean>(false);

  // Simulate fetching user rank in a real implementation
  useEffect(() => {
    if (userId) {
      setLoadingRank(true);
      // Simulate API call delay
      const timer = setTimeout(() => {
        // Example: if userId is "2", find their position in the leaderboard
        const rank = leaderboardData.findIndex(entry => entry.id === userId) + 1;
        setUserRank(rank > 0 ? rank : null);
        setLoadingRank(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [userId, leaderboardData]);

  // Simulate collecting a token and earning points
  const handleCollectToken = (tokenId: string) => {
    if (onCollect) {
      onCollect(tokenId);
    }
    
    // In a real implementation, this would update the user's points on the server
    // For demo purposes, we'll just show a simulated point increase
    if (userId) {
      setLeaderboardData(prevData => 
        prevData.map(entry => 
          entry.id === userId 
            ? { 
                ...entry, 
                points: entry.points + 25, 
                discoveries: entry.discoveries + 1 
              } 
            : entry
        ).sort((a, b) => b.points - a.points) // Resort after point update
      );
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">Top Cultural Curators</h2>
      
      {/* User's current rank */}
      {userId && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <h3 className="font-medium text-blue-800">Your Curation Stats</h3>
          {loadingRank ? (
            <p className="text-gray-500">Loading your rank...</p>
          ) : userRank ? (
            <div>
              <p className="text-sm text-gray-600">Rank: #{userRank}</p>
              <p className="text-sm text-gray-600">Points: {leaderboardData.find(entry => entry.id === userId)?.points || 0}</p>
              <p className="text-sm text-gray-600">Discoveries: {leaderboardData.find(entry => entry.id === userId)?.discoveries || 0}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Start collecting tokens to earn curator points!</p>
          )}
        </div>
      )}
      
      {/* Leaderboard */}
      <div className="divide-y">
        {leaderboardData.map((curator, index) => (
          <div 
            key={curator.id} 
            className={`py-3 flex items-center justify-between ${curator.id === userId ? 'bg-blue-50' : ''}`}
          >
            <div className="flex items-center">
              <span className="font-bold text-gray-700 w-6">{index + 1}.</span>
              <div>
                <span className="font-medium">{curator.username}</span>
                <p className="text-xs text-gray-500">{curator.discoveries} discoveries</p>
              </div>
            </div>
            <span className="font-bold text-indigo-600">{curator.points} pts</span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Earn points by discovering tokens before they become popular</p>
        <button 
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          onClick={() => handleCollectToken('1')} // Simulate collecting token ID 1
        >
          Collect Featured Token (+25 pts)
        </button>
      </div>
    </div>
  );
};

export default CuratorLeaderboard;
