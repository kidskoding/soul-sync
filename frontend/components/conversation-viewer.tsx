"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { ChatMessage } from "@/components/chat/chat-message"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface Message {
  id: string
  match_id: string
  speaker: "twin_a" | "twin_b"
  message: string
  message_index: number
  created_at: string
}

interface ConversationViewerProps {
  matchId: string
  userAName?: string
  userBName?: string
}

export function ConversationViewer({
  matchId,
  userAName = "Twin A",
  userBName = "Twin B",
}: ConversationViewerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLive, setIsLive] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load existing messages
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("match_id", matchId)
        .order("message_index", { ascending: true })

      if (data) setMessages(data)
    }
    load()
  }, [matchId])

  // Subscribe to new messages via Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates (message may already exist from initial load)
            if (prev.some((m) => m.id === payload.new.id)) return prev
            return [...prev, payload.new as Message]
          })
          setIsLive(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Conversation</span>
          {isLive && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Live
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {messages.length} messages
        </span>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Waiting for conversation to start...
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}>
            <span className="mb-1 block text-xs text-muted-foreground">
              {msg.speaker === "twin_a" ? userAName : userBName}
            </span>
            <ChatMessage
              role={msg.speaker === "twin_a" ? "assistant" : "user"}
              content={msg.message}
            />
          </div>
        ))}
        <div ref={scrollRef} />
      </ScrollArea>
    </div>
  )
}
