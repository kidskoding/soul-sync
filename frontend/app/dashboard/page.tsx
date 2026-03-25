"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { MatchCard } from "@/components/match-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface MatchData {
  id: string
  user_a_id: string
  user_b_id: string
  similarity: number | null
  status: string
  other_user: {
    display_name: string | null
    avatar_url: string | null
  }
  scores?: {
    overall: number
    analysis: string | null
  }
}

export default function DashboardPage() {
  const [matches, setMatches] = useState<MatchData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadMatches()
  }, [])

  async function loadMatches() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get all matches involving this user
    const { data: matchesA } = await supabase
      .from("matches")
      .select("*")
      .eq("user_a_id", user.id)
    const { data: matchesB } = await supabase
      .from("matches")
      .select("*")
      .eq("user_b_id", user.id)

    const allMatches = [...(matchesA || []), ...(matchesB || [])]

    // Enrich with other user info and scores
    const enriched: MatchData[] = []
    for (const match of allMatches) {
      const otherId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id
      const { data: otherUser } = await supabase
        .from("users")
        .select("display_name, avatar_url")
        .eq("id", otherId)
        .single()

      const { data: scores } = await supabase
        .from("compatibility_scores")
        .select("overall, analysis")
        .eq("match_id", match.id)
        .single()

      enriched.push({
        ...match,
        other_user: otherUser || { display_name: null, avatar_url: null },
        scores: scores || undefined,
      })
    }

    // Sort: revealed first, then scored, then conversing, then pending
    const order = { revealed: 0, scored: 1, conversing: 2, pending: 3 }
    enriched.sort((a, b) => (order[a.status as keyof typeof order] ?? 4) - (order[b.status as keyof typeof order] ?? 4))

    setMatches(enriched)
    setLoading(false)
  }

  async function triggerMatching() {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/matching/run`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }
    )
    loadMatches()
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Loading matches...</div>

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{matches.length} matches</p>
        </div>
        <div className="flex gap-2">
          <Link href="/swipes"><Button variant="outline">Daily Swipes</Button></Link>
          <Button onClick={triggerMatching}>Find Matches</Button>
        </div>
      </header>

      <main className="p-6">
        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <h2 className="text-lg font-medium">No matches yet</h2>
            <p className="text-muted-foreground">Click &quot;Find Matches&quot; to start your AI twin&apos;s search</p>
            <Button onClick={triggerMatching}>Find Matches</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
