"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Nav } from "@/components/nav"

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

interface Photo {
  id: string
  url: string
  position: number
}

export default function ProfilePage() {
  const [personality, setPersonality] = useState<PersonalityData | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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

      // Load user info, personality, and photos in parallel
      const [userResult, profileResult, photosResult] = await Promise.all([
        supabase
          .from("users")
          .select("display_name")
          .eq("id", user.id)
          .single(),
        supabase
          .from("soul_profiles")
          .select("personality")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("user_photos")
          .select("*")
          .eq("user_id", user.id)
          .order("position"),
      ])

      setDisplayName(userResult.data?.display_name ?? null)

      if (profileResult.data?.personality) {
        setPersonality(profileResult.data.personality as PersonalityData)
      }

      setPhotos(photosResult.data ?? [])
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDeletePhoto(photoId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/photos/${photoId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }
    )

    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground animate-pulse">
          Loading profile...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">
          {displayName ?? "Your Profile"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your personality and photos
        </p>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Photos Section */}
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>
              {photos.length === 0
                ? "No photos uploaded yet"
                : `${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square">
                    <Image
                      src={photo.url}
                      alt={`Photo ${photo.position + 1}`}
                      fill
                      className="rounded-lg object-cover"
                      sizes="(max-width: 768px) 33vw, 200px"
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute right-1 top-1 hidden rounded-full bg-background/80 p-1 text-destructive backdrop-blur transition-colors hover:bg-background group-hover:block"
                      aria-label="Delete photo"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Upload photos from the onboarding flow to show up in swipes.
              </p>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Personality Summary */}
        {personality ? (
          <>
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
                  {personality.communication_style.directness} communicator,
                  handles conflict by{" "}
                  {personality.communication_style.conflict_approach}. Love
                  language: {personality.communication_style.love_language}.
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
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Personality Profile</CardTitle>
              <CardDescription>
                Complete the interview to create your digital twin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/onboarding">
                <Button>Start Interview</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Retake Interview */}
        {personality && (
          <div className="flex justify-center">
            <Link href="/onboarding">
              <Button variant="outline">Retake Interview</Button>
            </Link>
          </div>
        )}
      </main>

      <Nav />
    </div>
  )
}
