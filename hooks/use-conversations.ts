"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Conversation {
  conversation_id: string
  created_at: number
  message_count: number
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/conversations")
      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createConversation = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/conversations", {
        method: "POST",
      })
      const data = await response.json()

      if (data.conversation_id) {
        router.push(`/chat/${data.conversation_id}`)
        await fetchConversations()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create a new conversation",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      setLoading(true)
      await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      })

      setConversations(conversations.filter((conv) => conv.conversation_id !== conversationId))

      toast({
        title: "Success",
        description: "Conversation deleted",
      })

      router.push("/")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  return {
    conversations,
    createConversation,
    deleteConversation,
    fetchConversations,
    loading,
  }
}
