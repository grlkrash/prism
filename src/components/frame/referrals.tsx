'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  points: number
}

interface LeaderboardEntry {
  id: string
  username: string
  avatar: string
  points: number
  rank: number
}

interface ReferralsProps {
  fid?: number
}

export function Referrals({ fid }: ReferralsProps) {
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    points: 0
  })
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadReferralData = async () => {
      if (!fid) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        // TODO: Implement referral data fetching from API
        // For now using mock data
        setStats({
          totalReferrals: 5,
          activeReferrals: 3,
          points: 150
        })
        
        setLeaderboard([
          {
            id: '1',
            username: 'alice',
            avatar: 'https://avatar.vercel.sh/alice',
            points: 500,
            rank: 1
          },
          {
            id: '2',
            username: 'bob',
            avatar: 'https://avatar.vercel.sh/bob',
            points: 350,
            rank: 2
          }
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load referral data')
        console.error('Error loading referral data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadReferralData()
  }, [fid])

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  if (isLoading) {
    return <div className="text-center">Loading referral data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Referral Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.totalReferrals}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeReferrals}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.points}</p>
              <p className="text-sm text-gray-500">Points</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Curators</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-4">
              {leaderboard.map((entry) => (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-6">{entry.rank}</span>
                    <Avatar>
                      <img src={entry.avatar} alt={entry.username} />
                    </Avatar>
                    <span className="font-medium">{entry.username}</span>
                  </div>
                  <span className="text-sm font-medium">{entry.points} pts</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 