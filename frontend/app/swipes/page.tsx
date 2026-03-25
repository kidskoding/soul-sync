"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SwipeCard } from "@/components/swipe-card"

interface SwipeProfile {
  id: string
  display_name: string | null
  birth_year: number | null
  photo_url: string | null
  interests: string[]
}

export default function SwipesPage() {
  const [profiles, setProfiles] = useState<SwipeProfile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadFeed()
  }, [])

  async function loadFeed() {
    setLoading(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/swipes/feed`,
      { headers: { Authorization: `Bearer ${session?.access_token}` } }
    )
    const data = await res.json()
    setProfiles(data)
    setCurrentIndex(0)
    setLoading(false)
  }

  async function handleSwipe(direction: "right" | "left") {
    const profile = profiles[currentIndex]
    const {
      data: { session },
    } = await supabase.auth.getSession()

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/swipes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ target_id: profile.id, direction }),
      }
    )

    setCurrentIndex((i) => i + 1)
  }

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        Loading profiles...
      </div>
    )

  if (currentIndex >= profiles.length) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">All caught up!</h2>
        <p className="text-muted-foreground">
          Check back tomorrow for more profiles
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-6 text-lg font-semibold text-muted-foreground">
        Daily Discovery
      </h1>
      <SwipeCard profile={profiles[currentIndex]} onSwipe={handleSwipe} />
      <p className="mt-4 text-sm text-muted-foreground">
        {currentIndex + 1} of {profiles.length}
      </p>
    </div>
  )
}
