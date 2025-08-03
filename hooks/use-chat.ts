"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Message {
  role: "user" | "assistant"
  content: string
  agent?: string
  timestamp?: number
}

export function useChat(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const fetchMessages = async () => {
    if (!conversationId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/conversations/${conversationId}/messages`)

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/")
          return
        }
        throw new Error("Failed to fetch messages")
      }

      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load conversation messages",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (content: string) => {
    if (!conversationId || !content.trim()) return

    try {
      setLoading(true)

      // Optimistically add user message
      const userMessage: Message = {
        role: "user",
        content,
        timestamp: Date.now() / 1000,
      }

      setMessages((prev) => [...prev, userMessage])

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: content }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const data = await response.json()

      // Add AI response
      if (data.response) {
        setMessages((prev) => [...prev, data.response])
      }

      return data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })

      // Remove optimistically added message on error
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (conversationId) {
      fetchMessages()
    } else {
      setMessages([])
    }
  }, [conversationId])

  return {
    messages,
    sendMessage,
    loading,
    fetchMessages,
  }
}
