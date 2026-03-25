"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface MatchCardProps {
  match: {
    id: string
    status: string
    similarity: number | null
    other_user: {
      display_name: string | null
      avatar_url: string | null
    }
    scores?: {
      overall: number
      analysis: string | null
    }
  }
}

export function MatchCard({ match }: MatchCardProps) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    conversing: "bg-blue-100 text-blue-800",
    scored: "bg-purple-100 text-purple-800",
    revealed: "bg-green-100 text-green-800",
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
              {(match.other_user.display_name || "?")[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-medium">{match.other_user.display_name || "Anonymous"}</h3>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[match.status] || "bg-gray-100 text-gray-800"}`}>
                {match.status}
              </span>
            </div>
          </div>
          {match.scores && (
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{Math.round(match.scores.overall)}%</span>
              <p className="text-xs text-muted-foreground">compatible</p>
            </div>
          )}
        </div>

        {match.scores?.analysis && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{match.scores.analysis}</p>
        )}

        <Link href={`/matches/${match.id}`}>
          <Button variant="outline" size="sm" className="w-full">
            {match.status === "pending" ? "Start Conversation" : "View Match"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
