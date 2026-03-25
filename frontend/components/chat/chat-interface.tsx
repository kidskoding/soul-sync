"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChatMessage } from "./chat-message"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatInterfaceProps {
  onComplete: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function ChatInterface({ onComplete }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  const sendMessage = useCallback(
    async (userMessage: string) => {
      setLoading(true)
      const newMessages: Message[] = [
        ...messages,
        { role: "user", content: userMessage },
      ]
      setMessages(newMessages)
      setInput("")

      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const res = await fetch(`${API_URL}/api/interview/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({
            messages: newMessages.slice(0, -1).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            user_message: userMessage,
          }),
        })

        if (!res.ok) {
          const error = await res.json().catch(() => ({ detail: res.statusText }))
          throw new Error(error.detail || "Interview request failed")
        }

        const data = await res.json()
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ])

        if (data.is_complete) {
          setTimeout(onComplete, 2000)
        }
      } catch (err) {
        console.error("Interview error:", err)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, something went wrong. Please try sending your message again.",
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [messages, onComplete]
  )

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      sendMessage("Hi, I'm ready to create my profile!")
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm">
              <span className="animate-pulse">Typing...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </ScrollArea>

      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (input.trim() && !loading) sendMessage(input.trim())
          }}
          className="flex gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer..."
            className="min-h-[44px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (input.trim() && !loading) sendMessage(input.trim())
              }
            }}
          />
          <Button type="submit" disabled={!input.trim() || loading}>
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}
