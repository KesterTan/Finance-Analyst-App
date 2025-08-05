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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load conversation messages",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    try {
      setLoading(true)

      // If no conversation ID, create a new conversation first and redirect
      if (!conversationId) {
        console.log("No conversation ID, creating new conversation...")
        const createResponse = await fetch("/api/conversations", {
          method: "POST",
        })
        
        if (!createResponse.ok) {
          const errorData = await createResponse.json()
          
          if (createResponse.status === 424 || errorData.flask_error?.includes('llm_config')) {
            if (!isConfiguredLocally()) {
              toast({
                title: "Configuration Required",
                description: errorData.suggestion || "Please configure OpenAI and Google settings first",
                variant: "destructive",
              })
              router.push("/settings")
              return
            } else {
              toast({
                title: "Backend Configuration Issue",
                description: "Your settings may not be synced with the backend. Please check Settings page.",
                variant: "destructive",
              })
              return
            }
          }
          
          throw new Error(errorData.details || "Failed to create conversation")
        }
        
        const createData = await createResponse.json()
        if (createData.conversation_id) {
          // Store the message in localStorage temporarily and redirect
          localStorage.setItem('pending_message', content)
          router.push(`/chat/${createData.conversation_id}`)
          return
        }
      }

      // Check if there's a pending message from localStorage (from conversation creation)
      const pendingMsg = localStorage.getItem('pending_message')
      let messageToSend = content
      if (pendingMsg && conversationId) {
        localStorage.removeItem('pending_message')
        messageToSend = pendingMsg
      }

      // Send message to existing conversation
      const userMessageId = `user-${Date.now()}-${Math.random()}`
      const loadingMessageId = `loading-${Date.now()}-${Math.random()}`
      
      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        content: messageToSend,
        timestamp: Date.now() / 1000,
      }

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
        body: JSON.stringify({ message: messageToSend }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Remove loading message on error
        setMessages((prev) => prev.filter(msg => msg.id !== loadingMessageId))
        
        // Handle configuration errors
        if (response.status === 424 || errorData.flask_error?.includes('llm_config')) {
          if (!isConfiguredLocally()) {
            toast({
              title: "Configuration Required",
              description: errorData.suggestion || "Please configure OpenAI and Google settings first",
              variant: "destructive",
            })
            setMessages((prev) => prev.filter(msg => msg.id !== userMessageId))
            router.push("/settings")
            return
          } else {
            toast({
              title: "Backend Configuration Issue",
              description: "Your settings may not be synced with the backend. Please check Settings page.",
              variant: "destructive",
            })
            return
          }
        }
        
        // Handle 404 - conversation not found, try creating new one
        if (response.status === 404) {
          console.log("Conversation not found, creating new conversation...")
          setMessages((prev) => prev.filter(msg => msg.id !== userMessageId && msg.id !== loadingMessageId))
          
          const createResponse = await fetch("/api/conversations", {
            method: "POST",
          })
          
          if (createResponse.ok) {
            const createData = await createResponse.json()
            if (createData.conversation_id) {
              localStorage.setItem('pending_message', messageToSend)
              router.push(`/chat/${createData.conversation_id}`)
              return
            }
          }
          
          toast({
            title: "Error",
            description: "Conversation not found and couldn't create a new one.",
            variant: "destructive",
          })
          return
        }
        
        // Handle 500 errors with graceful error message in chat
        if (response.status === 500) {
          const errorMessage: Message = {
            id: `error-${Date.now()}-${Math.random()}`,
            role: "assistant",
            content: errorData.error?.includes('JSON serializable') 
              ? "I encountered an error processing your request. The response couldn't be formatted properly. Please try rephrasing your question or try again."
              : "Something went wrong while processing your request. Please try again or contact support if the issue persists.",
            timestamp: Date.now() / 1000,
          }
          
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
        
        setMessages((prev) => prev.map(msg => 
          msg.id === loadingMessageId ? assistantMessage : msg
        ))
      } else {
        setMessages((prev) => prev.filter(msg => msg.id !== loadingMessageId))
      }

      return data
    } catch (error) {
      console.error("Send message error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      })
      
      // Clean up any messages added during this attempt
      setMessages((prev) => prev.filter(msg => 
        !msg.id?.startsWith('user-') && !msg.id?.startsWith('loading-')
      ))
    } finally {
      setLoading(false)
    }
  }

  // Check for pending messages when conversation loads
  useEffect(() => {
    if (conversationId) {
      fetchMessages()
      
      // If there's a pending message, send it after messages are loaded
      const pendingMsg = localStorage.getItem('pending_message')
      if (pendingMsg) {
        // Small delay to ensure messages are loaded first
        setTimeout(() => {
          const messageToSend = localStorage.getItem('pending_message')
          if (messageToSend) {
            localStorage.removeItem('pending_message')
            sendMessage(messageToSend)
          }
        }, 500)
      }
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
