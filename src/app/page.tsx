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
        <Demo />
      </main>
    </div>
  )
}
