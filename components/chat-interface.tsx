"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"
import { ChatMessage } from "@/components/chat-message"
import { useChat } from "@/hooks/use-chat"

export function ChatInterface() {
  const { conversationId } = useParams()
  const router = useRouter()
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, loading } = useChat(conversationId as string)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input
    setInput("")
    await sendMessage(userMessage)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Finance AI Assistant</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                {conversationId 
                  ? "Ask me about financial data, reports, or analysis."
                  : "Start a new conversation by asking about financial data, reports, or analysis."
                }
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            // Ensure message has the correct structure
            const normalizedMessage = {
              id: message.id || `msg-${index}`,
              role: message.role || "assistant",
              content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
              agent: message.agent,
              timestamp: message.timestamp,
              isLoading: message.isLoading
            };
            return <ChatMessage key={normalizedMessage.id} message={normalizedMessage} />;
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={conversationId ? "Message Finance AI..." : "Start a new conversation..."}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[60px] w-[60px] rounded-full bg-emerald-600 hover:bg-emerald-700 transition-colors"
            disabled={loading || !input.trim()}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
