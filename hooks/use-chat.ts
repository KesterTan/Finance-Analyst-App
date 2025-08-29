"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Message {
  role: "user" | "assistant"
  content: string
  agent?: string
  timestamp?: number
  isLoading?: boolean
  id?: string
  workflow_step?: string
  is_final?: boolean
}

interface WorkflowInfo {
  waiting_for: 'periods' | 'metrics' | null
  prompt: string
  step: string
}

interface ConversationStatus {
  conversation_id: string
  status: 'idle' | 'thinking' | 'waiting_for_input'
  is_thinking: boolean
  has_active_workflow: boolean
  workflow_info?: WorkflowInfo
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

export function useChat(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const fetchMessages = async () => {
    if (!conversationId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/conversations/${conversationId}/messages`)

      if (!response.ok) {
        const errorData = await response.json()
        
        if (response.status === 404) {
          toast({
            title: "Conversation Not Found",
            description: errorData.suggestion || "This conversation no longer exists. Redirecting to home.",
            variant: "destructive",
          })
          router.push("/")
          return
        }
        
        throw new Error(errorData.details || "Failed to fetch messages")
      }

      const data = await response.json()
      
      // Normalize messages from Flask API
      const normalizedMessages: Message[] = (data.messages || []).map((msg: any, index: number) => ({
        id: msg.id || `msg-${index}-${Date.now()}`,
        role: msg.role || "assistant",
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
        agent: msg.agent,
        timestamp: msg.timestamp || Date.now() / 1000,
        workflow_step: msg.workflow_step,
        is_final: msg.is_final
      }))
      
      setMessages(normalizedMessages)
    } catch (error) {
      console.error("Fetch messages error:", error)
      
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
          description: error instanceof Error ? error.message : "Failed to load conversation messages",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // New function to check conversation status
  const checkStatus = async () => {
    if (!conversationId) return

    try {
      const response = await fetch(`/api/conversations/${conversationId}/status`)
      
      if (response.ok) {
        const status: ConversationStatus = await response.json()
        setConversationStatus(status)
        return status
      }
    } catch (error) {
      console.error("Status check error:", error)
    }
    return null
  }

  // Function to continue workflow with user input
  const continueWorkflow = async (userInput: string) => {
    if (!conversationId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/conversations/${conversationId}/continue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_input: userInput }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to continue workflow")
      }

      // Refresh messages and status after continuing
      await fetchMessages()
      await checkStatus()
      
      return true
    } catch (error) {
      console.error("Continue workflow error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to continue workflow",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    // Only send message if we have a conversation ID
    if (!conversationId) {
      console.warn("Cannot send message: no conversation ID")
      return
    }

    // Declare message IDs in the function scope so they're available in catch block
    let userMessageId = ''
    let loadingMessageId = ''

    try {
      setLoading(true)

      // Add user message immediately (no optimistic AI response)
      userMessageId = `user-${Date.now()}-${Math.random()}`
      loadingMessageId = `loading-${Date.now()}-${Math.random()}`
      
      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content,
        timestamp: Date.now() / 1000,
      }

      // Add loading message for AI response
      const loadingMessage: Message = {
        id: loadingMessageId,
        role: "assistant",
        content: "...",
        isLoading: true,
        timestamp: Date.now() / 1000,
      }

      setMessages((prev) => [...prev, userMessage, loadingMessage])

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: content }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Remove loading message on error
        setMessages((prev) => prev.filter(msg => msg.id !== loadingMessageId))
        
        // Check for server connectivity issues first
        if (response.status >= 500 && response.status < 600) {
          toast({
            title: "Server Connection Error",
            description: "Unable to connect to the backend server. Please check if the server is running.",
            variant: "destructive",
          })
          // Remove user message too
          setMessages((prev) => prev.filter(msg => msg.id !== userMessageId))
          return
        }
        
        // Handle configuration errors - but only redirect if not configured locally
        if (response.status === 424 || errorData.flask_error?.includes('llm_config')) {
          if (!isConfiguredLocally()) {
            toast({
              title: "Configuration Required",
              description: errorData.suggestion || "Please configure OpenAI and Google settings first",
              variant: "destructive",
            })
            // Remove user message too
            setMessages((prev) => prev.filter(msg => msg.id !== userMessageId))
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
        
        throw new Error(errorData.details || "Failed to send message")
      }

      const data = await response.json()

      // Replace loading message with actual AI response
      if (data.response) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: data.response.role || "assistant",
          content: typeof data.response.content === "string" 
            ? data.response.content 
            : JSON.stringify(data.response.content),
          agent: data.response.agent,
          timestamp: data.response.timestamp || Date.now() / 1000,
          workflow_step: data.response.workflow_step,
          is_final: data.response.is_final
        }
        
        // Replace loading message with actual response
        setMessages((prev) => prev.map(msg => 
          msg.id === loadingMessageId ? assistantMessage : msg
        ))

        // Start polling if workflow is active
        if (data.response.workflow_step && !data.response.is_final) {
          setIsPolling(true)
        }
      } else {
        // If no response, remove loading message
        setMessages((prev) => prev.filter(msg => msg.id !== loadingMessageId))
      }

      return data
    } catch (error) {
      console.error("Send message error:", error)
      
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
          description: error instanceof Error ? error.message : "Failed to send message",
          variant: "destructive",
        })
      }

      // Remove any messages that were added during this attempt
      setMessages((prev) => prev.filter(msg => 
        msg.id !== userMessageId && msg.id !== loadingMessageId
      ))
    } finally {
      setLoading(false)
    }
  }

  // Status polling effect
  useEffect(() => {
    if (!conversationId || !isPolling) return

    const pollStatus = async () => {
      const status = await checkStatus()
      
      if (status?.status === 'thinking') {
        // Continue polling while thinking
        setTimeout(pollStatus, 2000)
      } else if (status?.status === 'waiting_for_input') {
        // Stop polling when waiting for input
        setIsPolling(false)
      } else if (status?.status === 'idle') {
        // Stop polling when idle
        setIsPolling(false)
        // Refresh messages in case there are new ones
        await fetchMessages()
      }
    }

    pollStatus()
  }, [conversationId, isPolling])

  useEffect(() => {
    if (conversationId) {
      fetchMessages()
      checkStatus()
    }
  }, [conversationId])

  return {
    messages,
    sendMessage,
    loading,
    conversationStatus,
    continueWorkflow,
    checkStatus,
    isPolling: isPolling || conversationStatus?.is_thinking || false
  }
}
