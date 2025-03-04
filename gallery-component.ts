// app/components/TokenGallery.tsx
import React, { useState, useEffect } from 'react';
import { analyzeToken, getRecommendations } from '../utils/mbdAi';
import { Token } from '../utils/mbdAi';

interface TokenGalleryProps {
  initialTokens?: Token[];
  userPreferences?: string[];
  onTokenSelect?: (token: Token) => void;
}

const TokenGallery: React.FC<TokenGalleryProps> = ({
  initialTokens,
  userPreferences = [],
  onTokenSelect,
}) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tokenAnalysis, setTokenAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tokens based on user preferences
  useEffect(() => {
    const fetchTokens = async () => {
      setLoading(true);
      try {
        if (initialTokens && initialTokens.length > 0) {
          setTokens(initialTokens);
        } else {
          const recommendedTokens = await getRecommendations(userPreferences);
          setTokens(recommendedTokens);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching tokens:', err);
        setError('Failed to load tokens. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [initialTokens, userPreferences]);

  // Handle token selection
  const handleTokenSelect = async (token: Token) => {
    setSelectedToken(token);
    
    if (onTokenSelect) {
      onTokenSelect(token);
    }
    
    try {
      const analysis = await analyzeToken(token.id);
      setTokenAnalysis(analysis);
    } catch (err) {
      console.error('Error analyzing token:', err);
      setTokenAnalysis(null);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-pulse text-gray-500">Loading cultural tokens...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-700">
        <p className="font-medium">Error</p>
        <p>{error}</p>
        <button 
          className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {tokens.map((token) => (
          <div 
            key={token.id}
            className={`border rounded-lg overflow-hidden hover:shadow-md transition cursor-pointer ${
              selectedToken?.id === token.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleTokenSelect(token)}
          >
            <div className="h-48 bg-gray-200 overflow-hidden">
              <img 
                src={token.imageUrl} 
                alt={token.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">{token.name}</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{token.symbol}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{token.artistName}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {token.category.map((cat, idx) => (
                  <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Token Details */}
      {selectedToken && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="sm:flex gap-6">
            <div className="sm:w-1/3 mb-4 sm:mb-0">
              <img 
                src={selectedToken.imageUrl} 
                alt={selectedToken.name}
                className="w-full h-auto rounded-md"
              />
            </div>
            
            <div className="sm:w-2/3">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold">{selectedToken.name}</h2>
                <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                  {selectedToken.symbol}
                </span>
              </div>
              
              <p className="text-sm text-gray-500 mt-1">By {selectedToken.artistName}</p>
              
              <p className="mt-4">{selectedToken.description}</p>
              
              <div className="mt-4">
                <h3 className="font-medium">Categories</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedToken.category.map((cat, idx) => (
                    <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="font-medium">Connect</h3>
                <div className="flex gap-3 mt-1">
                  {selectedToken.socialLinks?.twitter && (
                    <a href="#" className="text-blue-500 hover:underline">
                      Twitter
                    </a>
                  )}
                  {selectedToken.socialLinks?.discord && (
                    <a href="#" className="text-indigo-500 hover:underline">
                      Discord
                    </a>
                  )}
                  {selectedToken.socialLinks?.website && (
                    <a href="#" className="text-green-500 hover:underline">
                      Website
                    </a>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
                  Collect Token
                </button>
              </div>
            </div>
          </div>
          
          {/* AI Analysis Section */}
          {tokenAnalysis && (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium">MBD AI Analysis</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium text-gray-800">Community Score</h4>
                  <div className="mt-2 text-2xl font-bold text-indigo-600">
                    {tokenAnalysis.analysis.communityScore}/100
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium text-gray-800">Growth Potential</h4>
                  <div className="mt-2 text-2xl font-bold text-indigo-600 capitalize">
                    {tokenAnalysis.analysis.growthPotential}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium text-gray-800">Artist Credibility</h4>
                  <div className="mt-2 text-2xl font-bold text-indigo-600 capitalize">
                    {tokenAnalysis.analysis.artistCredibility}
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-medium text-gray-800">Similar Tokens</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                  {tokenAnalysis.analysis.similarTokens.map((token: Token) => (
                    <div 
                      key={token.id}
                      className="border rounded-md overflow-hidden hover:shadow-sm cursor-pointer"
                      onClick={() => handleTokenSelect(token)}
                    >
                      <div className="h-24 bg-gray-200">
                        <img 
                          src={token.imageUrl} 
                          alt={token.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2">
                        <h5 className="font-medium">{token.name}</h5>
                        <p className="text-xs text-gray-500">{token.artistName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenGallery;
