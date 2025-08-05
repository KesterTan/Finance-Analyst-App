"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Conversation {
  conversation_id: string
  created_at: number
  message_count: number
}

// Helper function to check if configuration is present locally
function isConfiguredLocally(): boolean {
  try {
    const storedConfig = localStorage.getItem("app_config")
    if (!storedConfig) return false
    
    const config = JSON.parse(storedConfig)
    return !!(config.OPENAI_API_KEY && config.GOOGLE_OAUTH_CREDENTIALS_JSON)
  } catch {
    return false
  }
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
      
      // First, check if backend is configured by checking health/capabilities
      try {
        const healthResponse = await fetch("/api/health")
        if (!healthResponse.ok) {
          toast({
            title: "Backend Unavailable",
            description: "Cannot connect to the Flask backend. Make sure it's running.",
            variant: "destructive",
          })
          return
        }
        
        const capabilitiesResponse = await fetch("/api/capabilities")
        if (!capabilitiesResponse.ok) {
          if (capabilitiesResponse.status === 424) {
            const errorData = await capabilitiesResponse.json()
            if (!isConfiguredLocally()) {
              toast({
                title: "Configuration Required",
                description: errorData.suggestion || "Please configure OpenAI and Google settings first",
                variant: "destructive",
              })
              router.push("/settings")
              return
            } else {
              // Configuration exists locally but backend isn't synced
              toast({
                title: "Backend Configuration Issue",
                description: "Your settings may not be synced with the backend. Please check Settings page.",
                variant: "destructive",
              })
              return
            }
          }
        }
      } catch (healthError) {
        toast({
          title: "Backend Unavailable",
          description: "Cannot connect to the Flask backend. Make sure it's running.",
          variant: "destructive",
        })
        return
      }
      
      const response = await fetch("/api/conversations", {
        method: "POST",
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle configuration errors - but only redirect if not configured locally
        if (response.status === 424 || errorData.flask_error?.includes('llm_config')) {
          if (!isConfiguredLocally()) {
            toast({
              title: "Configuration Required",
              description: errorData.suggestion || "Please configure OpenAI and Google settings first",
              variant: "destructive",
            })
            router.push("/settings")
            return
          } else {
            // Configuration exists locally but backend isn't synced
            toast({
              title: "Backend Configuration Issue",
              description: "Your settings may not be synced with the backend. Please check Settings page.",
              variant: "destructive",
            })
            return
          }
        }
        
        // Handle other errors
        toast({
          title: "Error",
          description: errorData.details || "Failed to create conversation",
          variant: "destructive",
        })
        return
      }
      
      const data = await response.json()

      if (data.conversation_id) {
        router.push(`/chat/${data.conversation_id}`)
        await fetchConversations()
      }
    } catch (error) {
      console.error("Create conversation error:", error)
      toast({
        title: "Connection Error",
        description: "Cannot connect to the backend. Make sure the Flask server is running.",
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
