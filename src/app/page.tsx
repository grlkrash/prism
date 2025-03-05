'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import dynamic from 'next/dynamic'

const Demo = dynamic(() => import('./components/Demo'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading...</div>
})

export default function Home() {
  return (
    <main className="min-h-screen">
      <Demo />
    </main>
  )
}
