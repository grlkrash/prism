'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import dynamic from 'next/dynamic'

const Demo = dynamic(() => import('./components/Demo'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading...</div>
})

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Prism - Cultural Token Discovery</h1>
        </div>
      </header>
      
      <main className="container mx-auto p-4">
        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="agent">AI Agent</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>
          
          <TabsContent value="discover">
            <Demo />
          </TabsContent>
          
          <TabsContent value="agent">
            <div className="flex flex-col space-y-4">
              <h2 className="text-xl font-semibold">AI Agent</h2>
              {/* Agent content will be loaded separately */}
            </div>
          </TabsContent>
          
          <TabsContent value="social">
            <div className="flex flex-col space-y-4">
              <h2 className="text-xl font-semibold">Social Activity</h2>
              {/* Social content will be loaded separately */}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
