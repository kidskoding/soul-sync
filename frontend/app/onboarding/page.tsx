"use client"

import { useRouter } from "next/navigation"
import { ChatInterface } from "@/components/chat/chat-interface"
import { createClient } from "@/lib/supabase/client"
import { api } from "@/lib/api"

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Create Your Digital Twin</h1>
        <p className="text-sm text-muted-foreground">
          Answer a few questions so we can build your AI personality
        </p>
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatInterface
          onComplete={async () => {
            try {
              const supabase = createClient()
              const {
                data: { session },
              } = await supabase.auth.getSession()

              await api("/api/profile/generate", {
                method: "POST",
                token: session?.access_token,
              })

              router.push("/onboarding/review")
            } catch (err) {
              console.error("Profile generation error:", err)
              // Still navigate — the review page can handle missing data
              router.push("/onboarding/review")
            }
          }}
        />
      </div>
    </div>
  )
}
