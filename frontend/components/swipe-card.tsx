"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SwipeCardProps {
  profile: {
    id: string
    display_name: string | null
    birth_year: number | null
    photo_url: string | null
    interests: string[]
  }
  onSwipe: (direction: "right" | "left") => void
}

export function SwipeCard({ profile, onSwipe }: SwipeCardProps) {
  const age = profile.birth_year
    ? new Date().getFullYear() - profile.birth_year
    : null

  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden">
      <div className="aspect-[3/4] bg-muted relative">
        {profile.photo_url ? (
          <img
            src={profile.photo_url}
            alt={profile.display_name || "Profile"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground">
            {(profile.display_name || "?")[0]?.toUpperCase()}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <h3 className="text-white text-xl font-semibold">
            {profile.display_name || "Anonymous"}
            {age ? `, ${age}` : ""}
          </h3>
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap gap-1">
          {profile.interests.map((i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {i}
            </Badge>
          ))}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => onSwipe("left")}
          >
            Pass
          </Button>
          <Button className="flex-1" onClick={() => onSwipe("right")}>
            Like
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
