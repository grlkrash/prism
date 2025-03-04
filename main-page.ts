// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import TokenGallery from './components/TokenGallery';
import CuratorLeaderboard from './components/CuratorLeaderboard';
import { getRecommendations, analyzeTokenTrends } from './utils/mbdAi';
import { Token } from './utils/mbdAi';

export default function Home() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [trendingData, setTrendingData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userPreferences, setUserPreferences] = useState<string[]>(['digital art', 'music']);
  const [showFrame, setShowFrame] = useState<boolean>(false);
  // Using a mock user ID for the demo
  const mockUserId = '2'; // This would come from authentication in a real app

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch recommended tokens
        const recommendedTokens = await getRecommendations(userPreferences);
        setTokens(recommendedTokens);
        
        // Fetch trending data
        const trends = await analyzeTokenTrends();
        setTrendingData(trends);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleTokenCollected = (tokenId: string) => {
    // In a real app, this would trigger a blockchain transaction
    console.log(`Token collected: ${tokenId}`);
    // Show a success message
    alert('Token collected! You earned 25 curator points.');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-indigo-800 mb-2">Prism</h1>
          <p className="text-xl text-gray-600">Discover and curate cultural tokens</p>
        </header>

        {/* Toggle between app view and frame demo */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white p-2 rounded-lg shadow-sm inline-flex">
            <button 
              className={`px-4 py-2 rounded ${!showFrame ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}
              onClick={() => setShowFrame(false)}
            >
              App View
            </button>
            <button 
              className={`px-4 py-2 rounded ${showFrame ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}
              onClick={() => setShowFrame(true)}
            >
              Frame Demo
            </button>
          </div>
        </div>

        {showFrame ? (
          // Frame Demo View
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Farcaster Frame Preview</h2>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-900 text-white p-2 flex justify-between items-center">
                <span>Farcaster Frame</span>
                <span className="text-xs">{window.location.origin}/api/frame</span>
              </div>
              <div className="aspect-w-1 aspect-h-1 relative">
                <iframe 
                  src="/api/frame" 
                  className="w-full h-96"
                  title="Prism Frame"
                ></iframe>
              </div>
              <div className="bg-gray-100 p-3">
                <div className="grid grid-cols-4 gap-2">
                  <button className="py-2 px-3 bg-gray-200 rounded text-sm">Previous</button>
                  <button className="py-2 px-3 bg-gray-200 rounded text-sm">Next</button>
                  <button className="py-2 px-3 bg-gray-200 rounded text-sm">Collect</button>
                  <button className="py-2 px-3 bg-gray-200 rounded text-sm">Ask Agent</button>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 mb-2">
                In a real Farcaster client, this Frame would be interactive.
              </p>
              <a 
                href="/api/frame" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Open Frame in new tab
              </a>
            </div>
          </div>
        ) : (
          // Main App UI
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content area */}
            <div className="lg:col-span-2">
              {/* Trending Categories */}
              {trendingData && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                  <h2 className="text-xl font-bold mb-4">Trending Categories</h2>
                  <div className="flex flex-wrap gap-3">
                    {trendingData.trendingCategories.map((category: string, index: number) => (
                      <button
                        key={index}
                        className={`px-4 py-2 rounded-full text-sm ${
                          userPreferences.includes(category)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                        onClick={() => {
                          if (userPreferences.includes(category)) {
                            setUserPreferences(userPreferences.filter(p => p !== category));
                          } else {
                            setUserPreferences([...userPreferences, category]);
                          }
                        }}
                      >
                        {category}
                        {trendingData.communityGrowth[category] && (
                          <span className="ml-1 text-xs">+{trendingData.communityGrowth[category]}%</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Token Gallery */}
              <TokenGallery 
                initialTokens={tokens} 
                userPreferences={userPreferences}
                onTokenSelect={(token) => console.log('Selected token:', token)}
              />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Agent Section */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-bold mb-4">Prism Agent</h2>
                <p className="text-gray-600 mb-4">
                  Ask our AI-powered agent to help you discover cultural tokens based on your interests.
                </p>
                <div className="bg-indigo-50 rounded-lg p-4 flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                      <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-indigo-800">
                      Hi! I'm your cultural token assistant. I can help you discover new tokens based on your tastes and interests.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                    <input
                      type="text"
                      placeholder="Ask about tokens or artists..."
                      className="flex-1 px-4 py-2 border rounded-md"
                    />
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                      Ask
                    </button>
                  </form>
                </div>
              </div>

              {/* Curator Leaderboard */}
              <CuratorLeaderboard 
                userId={mockUserId}
                onCollect={handleTokenCollected}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
