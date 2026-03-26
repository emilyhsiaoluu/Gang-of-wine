"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Wine, BookOpen } from "lucide-react"

interface WelcomeScreenProps {
  onJoin: (name: string) => void
}

export function WelcomeScreen({ onJoin }: WelcomeScreenProps) {
  const [name, setName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onJoin(name.trim())
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Logo/Icon */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Wine className="h-10 w-10 text-primary" />
          <BookOpen className="h-10 w-10 text-accent" />
        </div>

        {/* Title */}
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
          Welcome to Gang of Wine Moms Book Club
        </h1>
        
        <p className="text-muted-foreground text-lg mb-10">
          Where great books meet great company
        </p>

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter your first name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 text-lg text-center bg-card border-border focus:border-primary"
            />
          </div>
          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-14 text-lg font-medium"
            disabled={!name.trim()}
          >
            Join the Book Club
          </Button>
        </form>

        {/* Decorative element */}
        <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground">
          <div className="h-px w-12 bg-border" />
          <span className="text-sm italic">Est. 2026</span>
          <div className="h-px w-12 bg-border" />
        </div>
      </div>
    </div>
  )
}
