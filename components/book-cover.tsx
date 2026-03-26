"use client"

import { useState } from "react"
import { BookOpen } from "lucide-react"

interface BookCoverProps {
  title: string
  author: string
  coverUrl?: string
  size?: "sm" | "md" | "lg"
}

export function BookCover({ title, author, coverUrl, size = "md" }: BookCoverProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: "w-16 h-24",
    md: "w-20 h-28",
    lg: "w-28 h-40",
  }

  const textSizeClasses = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs",
  }

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
  }

  if (!coverUrl || imageError) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-border flex flex-col items-center justify-center p-2 shadow-sm`}
      >
        <BookOpen className={`${iconSizeClasses[size]} text-primary/60 mb-1`} />
        <p className={`${textSizeClasses[size]} font-medium text-center text-foreground/80 leading-tight line-clamp-2`}>
          {title}
        </p>
        <p className={`${textSizeClasses[size]} text-muted-foreground text-center leading-tight line-clamp-1`}>
          {author}
        </p>
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} relative rounded-lg overflow-hidden shadow-md border border-border/50`}>
      <img
        src={coverUrl}
        alt={`${title} by ${author}`}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  )
}
