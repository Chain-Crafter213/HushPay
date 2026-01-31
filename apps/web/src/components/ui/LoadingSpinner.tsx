import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string
  fullScreen?: boolean
}

export function LoadingSpinner({ className, fullScreen }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-4">
          <div className={cn("animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent", className)} />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent", className)} />
  )
}
