"use client"

import { createClient } from "@/lib/supabase/client"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AuthPage() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/onboarding")
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8">
        <h1 className="mb-8 text-center text-3xl font-bold">SoulSync</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`}
        />
      </div>
    </div>
  )
}
