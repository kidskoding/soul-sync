"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Nav } from "@/components/nav"

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("")
  const [originalName, setOriginalName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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

      const { data } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .single()

      const name = data?.display_name ?? ""
      setDisplayName(name)
      setOriginalName(name)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from("users")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id)

    setOriginalName(displayName.trim())
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading settings...</p>
      </div>
    )
  }

  const nameChanged = displayName.trim() !== originalName

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </header>

      <main className="mx-auto max-w-lg space-y-6 p-6">
        {/* Display Name */}
        <Card>
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
            <CardDescription>
              This is the name other users will see
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                setSaved(false)
              }}
              placeholder="Enter your display name"
              maxLength={50}
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={!nameChanged || saving}
                size="sm"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              {saved && (
                <span className="text-sm text-muted-foreground">Saved</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Retake Interview */}
        <Card>
          <CardHeader>
            <CardTitle>AI Twin</CardTitle>
            <CardDescription>
              Retake the personality interview to update your digital twin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/onboarding">
              <Button variant="outline">Retake Interview</Button>
            </Link>
          </CardContent>
        </Card>

        <Separator />

        {/* Sign Out */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>

      <Nav />
    </div>
  )
}
