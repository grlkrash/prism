'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TokenItem } from '@/types/token'

interface FriendActivity {
  id: string
  username: string
  avatar: string
  action: 'bought' | 'shared' | 'liked'
  token: TokenItem
  timestamp: number
}

interface FriendActivityProps {
  fid?: number
}

export function FriendActivity({ fid }: FriendActivityProps) {
  const [activities, setActivities] = useState<FriendActivity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFriendActivity = async () => {
      if (!fid) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        // TODO: Implement friend activity fetching from Farcaster API
        // For now using mock data
        const mockActivities: FriendActivity[] = [
          {
            id: '1',
            username: 'alice',
            avatar: 'https://avatar.vercel.sh/alice',
            action: 'bought',
            token: {
              id: '1',
              name: 'Cultural Token #1',
              symbol: 'CULT1',
              description: 'A cultural token',
              price: 0.001,
              image: 'https://picsum.photos/200',
              category: 'cultural',
              social: { website: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS }
            },
            timestamp: Date.now()
          }
        ]
        
        setActivities(mockActivities)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load friend activity')
        console.error('Error loading friend activity:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadFriendActivity()
  }, [fid])

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  if (isLoading) {
    return <div className="text-center">Loading friend activity...</div>
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-4">
        {activities.map((activity) => (
          <Card key={activity.id}>
            <CardHeader className="flex flex-row items-center gap-4 p-4">
              <Avatar>
                <img src={activity.avatar} alt={activity.username} />
              </Avatar>
              <div>
                <CardTitle className="text-sm font-medium">
                  {activity.username}
                </CardTitle>
                <p className="text-xs text-gray-500">
                  {activity.action} {activity.token.name}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-4">
                <img 
                  src={activity.token.image} 
                  alt={activity.token.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm font-medium">{activity.token.name}</p>
                  <p className="text-xs text-gray-500">{activity.token.symbol}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
} 