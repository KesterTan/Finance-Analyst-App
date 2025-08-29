"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Conversation {
  conversation_id: string
  created_at: number
  message_count: number
  name?: string
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
      
      if (!response.ok && response.status >= 500 && response.status < 600) {
        toast({
          title: "Server Connection Error",
          description: "Unable to connect to the backend server. Please check if the server is running.",
          variant: "destructive",
        })
        return
      }
      
      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (error) {
      // Check for network connectivity errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast({
          title: "Server Connection Error",
          description: "Unable to connect to the backend server. Please check if the server is running.",
          variant: "destructive",
        })
      } else if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Server Timeout",
          description: "The server is taking too long to respond. Please check your connection.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive",
        })
      }
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
        await fetchConversations()
        return data.conversation_id
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

  const renameConversation = async (conversationId: string, newName: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      })

      if (!response.ok) {
        throw new Error("Failed to rename conversation")
      }

      // Update local state
      setConversations(conversations.map(conv => 
        conv.conversation_id === conversationId 
          ? { ...conv, name: newName }
          : conv
      ))

      toast({
        title: "Success",
        description: "Conversation renamed",
      })
    } catch (error) {
      // Check for network connectivity errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast({
          title: "Server Connection Error",
          description: "Unable to connect to the backend server. Please check if the server is running.",
          variant: "destructive",
        })
      } else if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Server Timeout",
          description: "The server is taking too long to respond. Please check your connection.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to rename conversation",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Function specifically for home page - gets existing conversation or creates one only if none exist
  const getOrCreateConversation = async () => {
    try {
      // Check if we're already in the process of creating a conversation
      const isCreating = localStorage.getItem('creating_conversation')
      if (isCreating === 'true') {
        console.log('Already creating a conversation, waiting...')
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 500))
        // Fetch latest conversations to see if one was created
        await fetchConversations()
        if (conversations.length > 0) {
          const mostRecentConversation = conversations.sort((a, b) => b.created_at - a.created_at)[0]
          return mostRecentConversation.conversation_id
        }
      }

      // If conversations already exist, return the most recent one
      if (conversations.length > 0) {
        console.log(`Found ${conversations.length} existing conversations, returning most recent`)
        const mostRecentConversation = conversations.sort((a, b) => b.created_at - a.created_at)[0]
        return mostRecentConversation.conversation_id
      }
      
      // Set flag to indicate we're creating a conversation
      localStorage.setItem('creating_conversation', 'true')
      
      try {
        // Only create a new conversation if none exist
        console.log('No conversations found, creating first conversation...')
        const newConversationId = await createConversation()
        
        // Clear the flag
        localStorage.removeItem('creating_conversation')
        
        return newConversationId
      } catch (error) {
        // Make sure to clear the flag on error
        localStorage.removeItem('creating_conversation')
        throw error
      }
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error)
      localStorage.removeItem('creating_conversation')
      return null
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  return {
    conversations,
    createConversation,
    getOrCreateConversation,
    deleteConversation,
    renameConversation,
    fetchConversations,
    loading,
  }
}
