"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ConversationViewer } from "@/components/conversation-viewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MatchData {
  id: string
  user_a_id: string
  user_b_id: string
  similarity: number | null
  status: string
}

interface ScoreData {
  values_alignment: number
  communication_style: number
  humor_compatibility: number
  lifestyle_fit: number
  emotional_depth: number
  overall: number
  analysis: string | null
}

interface SessionData {
  id: string
  match_id: string
  status: string
  current_turn: number
  max_turns: number
}

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const matchId = params.id
  const supabase = createClient()

  const [match, setMatch] = useState<MatchData | null>(null)
  const [scores, setScores] = useState<ScoreData | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)

  useEffect(() => {
    if (!matchId) return

    async function load() {
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single()
      setMatch(matchData)

      const { data: scoreData } = await supabase
        .from("compatibility_scores")
        .select("*")
        .eq("match_id", matchId)
        .single()
      if (scoreData) setScores(scoreData)

      const { data: sessionData } = await supabase
        .from("conversation_sessions")
        .select("*")
        .eq("match_id", matchId)
        .single()
      setSession(sessionData)
    }
    load()
  }, [matchId])

  async function startConversation() {
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession()
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/conversations/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({ match_id: matchId }),
      }
    )
    // Reload session after starting conversation
    const { data } = await supabase
      .from("conversation_sessions")
      .select("*")
      .eq("match_id", matchId)
      .single()
    setSession(data)
  }

  if (!match)
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    )

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Match Detail</h1>
          <p className="text-sm text-muted-foreground">
            Status: {match.status}
            {match.similarity
              ? ` \u2022 ${Math.round(match.similarity * 100)}% similar`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {!session && match.status === "pending" && (
            <Button onClick={startConversation}>Start Conversation</Button>
          )}
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 border-r">
          <ConversationViewer matchId={matchId} />
        </div>

        {scores && (
          <div className="w-80 space-y-4 overflow-y-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Compatibility: {Math.round(scores.overall)}%
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Values", value: scores.values_alignment },
                  {
                    label: "Communication",
                    value: scores.communication_style,
                  },
                  { label: "Humor", value: scores.humor_compatibility },
                  { label: "Lifestyle", value: scores.lifestyle_fit },
                  {
                    label: "Emotional Depth",
                    value: scores.emotional_depth,
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm">
                      <span>{label}</span>
                      <span>{Math.round(value)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            {scores.analysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {scores.analysis}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
