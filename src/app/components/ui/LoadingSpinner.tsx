export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-900 border-t-transparent" />
    </div>
  )
} 