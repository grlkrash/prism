import { TokenGallery } from '../components/TokenGallery'

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="flex flex-col gap-8 items-center">
        <h1 className="text-4xl font-bold">Prism</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Discover and collect digital art
        </p>
        <TokenGallery />
      </main>
    </div>
  )
}
