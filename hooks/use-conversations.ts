"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useUser } from '@auth0/nextjs-auth0'

interface Conversation {
  conversation_id: string
  id?: string // Backend sometimes uses 'id' instead of 'conversation_id'
  created_at: number
  message_count: number
  name?: string
  title?: string // Backend sometimes uses 'title' instead of 'name'
  status?: string
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
  const { user } = useUser()

  const fetchConversations = async () => {
    if (!user?.sub) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/conversations?userId=${user.sub}`)
      
      if (!response.ok && response.status >= 500 && response.status < 600) {
        toast({
          title: "Server Connection Error",
          description: "Unable to connect to the backend server. Please check if the server is running.",
          variant: "destructive",
        })
        return
      }
      
      const data = await response.json()
      console.log("Fetched conversations:", data)
      const fetchedConversations = (data.conversations || [])
        .map((conv: any) => {
          // Get name, but ignore generic titles
          let name = conv.name
          if (!name || name === 'New Conversation') {
            name = conv.title && conv.title !== 'New Conversation' ? conv.title : null
          }
          
          return {
            // Normalize the conversation object - use 'id' if 'conversation_id' is not available
            conversation_id: conv.conversation_id || conv.id,
            created_at: conv.created_at,
            message_count: conv.message_count || 0,
            name: name,
            status: conv.status
          }
        })
        .filter((conv: Conversation) => {
          const id = conv.conversation_id
          return id && id !== 'undefined' && typeof id === 'string' && id.length > 0
        })
      
      console.log("Processed conversations:", fetchedConversations)
      setConversations(fetchedConversations)
      return fetchedConversations
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
        console.log("Finished fetching conversations")
        setLoading(false)
      }
      
      // Return empty array if fetch failed
      return []
  }

  const createConversation = async () => {
    try {
      setLoading(true)
      
      // Check if user is authenticated
      if (!user?.sub) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to create a conversation.",
          variant: "destructive",
        })
        return null
      }
      
      // First, check if backend is configured by checking health/capabilities
      try {
        const healthResponse = await fetch("/api/health")
        if (!healthResponse.ok) {
          toast({
            title: "Backend Unavailable",
            description: "Cannot connect to the Flask backend. Make sure it's running.",
            variant: "destructive",
          })
          return null
        }
        
        const capabilitiesResponse = await fetch(`/api/capabilities?userId=${user?.sub}`)
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
              return null
            } else {
              // Configuration exists locally but backend isn't synced
              toast({
                title: "Backend Configuration Issue",
                description: "Your settings may not be synced with the backend. Please check Settings page.",
                variant: "destructive",
              })
              return null
            }
          }
        }
      } catch (healthError) {
        toast({
          title: "Backend Unavailable",
          description: "Cannot connect to the Flask backend. Make sure it's running.",
          variant: "destructive",
        })
        return null
      }
      
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.sub,
        }),
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
            return null
          } else {
            // Configuration exists locally but backend isn't synced
            toast({
              title: "Backend Configuration Issue",
              description: "Your settings may not be synced with the backend. Please check Settings page.",
              variant: "destructive",
            })
            return null
          }
        }
        
        // Handle other errors
        toast({
          title: "Error",
          description: errorData.details || "Failed to create conversation",
          variant: "destructive",
        })
        return null
      }
      
      const data = await response.json()
      console.log("Create conversation response:", data)

      // Normalize conversation ID - use 'id' if 'conversation_id' is not available
      const conversationId = data.conversation_id || data.id
      
      if (conversationId && conversationId !== 'undefined' && typeof conversationId === 'string') {
        await fetchConversations()
        return conversationId
      } else {
        console.error("Invalid conversation ID received:", { data, conversationId })
        return null
      }
    } catch (error) {
      console.error("Create conversation error:", error)
      toast({
        title: "Connection Error",
        description: "Cannot connect to the backend. Make sure the Flask server is running.",
        variant: "destructive",
      })
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      setLoading(true)
      
      if (!user?.sub) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to delete a conversation.",
          variant: "destructive",
        })
        return
      }
      
      await fetch(`/api/conversations/${conversationId}?userId=${user.sub}`, {
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
      
      if (!user?.sub) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to rename a conversation.",
          variant: "destructive",
        })
        return
      }
      
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name: newName,
          userId: user.sub
        }),
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
      // Check if user is authenticated
      if (!user?.sub) {
        console.log('User not authenticated, cannot get or create conversation')
        return null
      }
      
      // Check if we're already in the process of creating a conversation
      const isCreating = localStorage.getItem('creating_conversation')
      if (isCreating === 'true') {
        console.log('Already creating a conversation, waiting...')
        // Wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 500))
        // Fetch latest conversations to see if one was created
        const freshConversations = await fetchConversations()
        if (freshConversations.length > 0) {
          const mostRecentConversation = freshConversations.sort((a: Conversation, b: Conversation) => b.created_at - a.created_at)[0]
          if (mostRecentConversation.conversation_id && mostRecentConversation.conversation_id !== 'undefined') {
            return mostRecentConversation.conversation_id
          }
        }
      }

      // Get fresh conversations data
      const currentConversations = await fetchConversations()
      
      // If conversations already exist, return the most recent one
      if (currentConversations.length > 0) {
        console.log(`Found ${currentConversations.length} existing conversations, returning most recent`)
        const mostRecentConversation = currentConversations.sort((a: Conversation, b: Conversation) => b.created_at - a.created_at)[0]
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
        
        // Check if conversation creation was successful
        if (newConversationId) {
          return newConversationId
        } else {
          // Creation failed but was handled gracefully (user was notified)
          return null
        }
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
