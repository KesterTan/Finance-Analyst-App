"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Message {
  role: "user" | "assistant"
  content: string
  agent?: string
  timestamp?: number
  isLoading?: boolean // Add loading state for messages
  id?: string // Add unique ID for messages
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
            // Configuration exists locally but backend isn't synced - try to sync it
            toast({
              title: "Backend Configuration Issue",
              description: "Your settings may not be synced with the backend. Please check Settings page.",
              variant: "destructive",
            })
            return
          }
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
        
        // Handle conversation not found - create new conversation
        if (response.status === 404) {
          console.log("Conversation not found, creating new conversation...")
          // Remove both messages first
          setMessages((prev) => prev.filter(msg => msg.id !== userMessageId && msg.id !== loadingMessageId))
          
          try {
            const createResponse = await fetch("/api/conversations", {
              method: "POST",
            })
            
            if (!createResponse.ok) {
              const createErrorData = await createResponse.json()
              
              // Check for server connectivity issues first
              if (createResponse.status >= 500 && createResponse.status < 600) {
                toast({
                  title: "Server Connection Error",
                  description: "Unable to connect to the backend server. Please check if the server is running.",
                  variant: "destructive",
                })
                return
              }
              
              if (createResponse.status === 424 || createErrorData.flask_error?.includes('llm_config')) {
                if (!isConfiguredLocally()) {
                  toast({
                    title: "Configuration Required",
                    description: createErrorData.suggestion || "Please configure OpenAI and Google settings first",
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
              
              throw new Error(createErrorData.details || "Failed to create conversation")
            }
            
            const createData = await createResponse.json()
            if (createData.conversation_id) {
              // Don't redirect with message - just redirect to the conversation
              // The message will be sent in the current flow
              router.push(`/chat/${createData.conversation_id}`)
              return
            }
          } catch (createError) {
            toast({
              title: "Error",
              description: "Failed to create new conversation",
              variant: "destructive",
            })
            return
          }
        }
        
        // Handle Flask internal server errors (like JSON serialization issues)
        if (response.status === 500) {
          const errorMessage: Message = {
            id: `error-${Date.now()}-${Math.random()}`,
            role: "assistant",
            content: errorData.error?.includes('JSON serializable') 
              ? "I encountered an error processing your request. The response couldn't be formatted properly. Please try rephrasing your question or try again."
              : "Something went wrong while processing your request. Please try again or contact support if the issue persists.",
            timestamp: Date.now() / 1000,
          }
          
          // Replace loading message with error message
          setMessages((prev) => prev.map(msg => 
            msg.id === loadingMessageId ? errorMessage : msg
          ))
          
          return
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
        }
        
        // Replace loading message with actual response
        setMessages((prev) => prev.map(msg => 
          msg.id === loadingMessageId ? assistantMessage : msg
        ))
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
