"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PersonalityData {
  core_values: string[]
  communication_style: {
    directness: string
    conflict_approach: string
    love_language: string
  }
  lifestyle: {
    energy_level: string
    social_preference: string
    interests: string[]
    ideal_weekend: string
  }
  dealbreakers: string[]
  humor_style: string
  emotional_depth: string
  self_description: string
  partner_qualities: string[]
}

export default function ReviewPage() {
  const [personality, setPersonality] = useState<PersonalityData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth")
        return
      }

      const { data, error: fetchError } = await supabase
        .from("soul_profiles")
        .select("personality")
        .eq("user_id", user.id)
        .single()

      if (fetchError) {
        console.error("Failed to load personality:", fetchError)
        setError("Could not load your profile. Please try the interview again.")
        return
      }

      if (data?.personality) {
        setPersonality(data.personality as PersonalityData)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push("/onboarding")}>
          Retake Interview
        </Button>
      </div>
    )
  }

  if (!personality) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground animate-pulse">
          Loading your digital twin...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Meet Your Digital Twin</h1>
          <p className="text-muted-foreground">
            Here&apos;s who your AI will be in conversations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Core Values</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {personality.core_values.map((v) => (
              <Badge key={v} variant="secondary">
                {v}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interests</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {personality.lifestyle.interests.map((i) => (
              <Badge key={i}>{i}</Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Communication Style</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {personality.communication_style.directness} communicator, handles
              conflict by {personality.communication_style.conflict_approach}.
              Love language: {personality.communication_style.love_language}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About You</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {personality.self_description}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Looking For</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {personality.partner_qualities.map((q) => (
              <Badge key={q} variant="outline">
                {q}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dealbreakers</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {personality.dealbreakers.map((d) => (
              <Badge key={d} variant="destructive">
                {d}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-4 pt-2">
          <Button
            variant="outline"
            onClick={() => router.push("/onboarding")}
            className="flex-1"
          >
            Retake Interview
          </Button>
          <Button
            onClick={() => router.push("/dashboard")}
            className="flex-1"
          >
            Looks Good — Find Matches
          </Button>
        </div>
      </div>
    </div>
  )
}
