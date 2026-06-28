"use client"

import { useState } from "react"
import { WelcomeScreen } from "@/components/welcome-screen"
import { BookClubApp } from "@/components/book-club-app"

const STORAGE_KEY = "gang-of-wine-username"

export function ClientPage() {
  const [userName, setUserName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(STORAGE_KEY)
  })

  const handleJoin = (name: string) => {
    localStorage.setItem(STORAGE_KEY, name)
    setUserName(name)
  }

  const handleEditName = () => {
    setUserName(null)
  }

  if (!userName) {
    const savedName = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) ?? "" : ""
    return <WelcomeScreen onJoin={handleJoin} defaultName={savedName} />
  }

  return <BookClubApp userName={userName} onEditName={handleEditName} />
}
