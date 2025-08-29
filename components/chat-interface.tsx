"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, X, ExternalLink, Maximize2, Minimize2, Menu } from "lucide-react"
import { ChatMessage } from "@/components/chat-message"
import { useChat } from "@/hooks/use-chat"
import { useToast } from "@/hooks/use-toast"
import { useConversations } from "@/hooks/use-conversations"
import { extractAllLinks, isEmbeddableUrl, getEmbeddableUrl, isFilePath, isApiEndpoint } from "@/lib/link-utils"
import { cn } from "@/lib/utils"

interface ChatInterfaceProps {
  onIframeStateChange?: (isActive: boolean) => void
}

export function ChatInterface({ onIframeStateChange }: ChatInterfaceProps) {
  const { conversationId } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { createConversation } = useConversations()
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // iframe state
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [iframeError, setIframeError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [chatMinimized, setChatMinimized] = useState(false)

  const { messages, sendMessage, loading } = useChat(conversationId as string)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input
    setInput("")

    await sendMessage(userMessage)
  }

  const handleLinkClick = (url: string) => {
    console.log(`Link clicked: ${url}`)
    console.log(`Is file path: ${isFilePath(url)}`)
    console.log(`Is API endpoint: ${isApiEndpoint(url)}`)
    console.log(`Is embeddable: ${isEmbeddableUrl(url)}`)
    
    if (isEmbeddableUrl(url)) {
      console.log(`Original URL: ${url}`)
      // Use API endpoints directly, convert file paths if needed
      let iframeUrl = url;
      
      if (isApiEndpoint(url)) {
        // For API endpoints, use the backend server URL
        const backendUrl = process.env.NEXT_PUBLIC_FLASK_BACKEND_URL || "http://localhost:5000";
        iframeUrl = `${backendUrl}${url}`;
        console.log(`Using backend API endpoint: ${iframeUrl}`)
      } else if (isFilePath(url)) {
        // For file paths, you might want to convert to API endpoint
        // For now, using original URL
        console.log(`Using file path as-is: ${url}`)
        iframeUrl = url;
      } else {
        // For other URLs (Google Sheets, etc.), use getEmbeddableUrl
        iframeUrl = getEmbeddableUrl(url);
        console.log(`Converted to embeddable URL: ${iframeUrl}`)
      }
      
      console.log(`Setting activeUrl to: ${iframeUrl}`)
      setActiveUrl("http://localhost:5000/api/reports/financial_analysis_20250828_012138")
      setIframeError(false)
    } else {
      console.log(`Opening in new tab: ${url}`)
      // Open in new tab for non-embeddable URLs
      window.open(url, '_blank')
    }
  }

  const handleCloseIframe = () => {
    setActiveUrl(null)
    setIframeError(false)
    setIsFullscreen(false)
    setChatMinimized(false)
    // The useEffect will handle notifying the parent
  }

  const handleIframeError = () => {
    setIframeError(true)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const toggleChatMinimized = () => {
    setChatMinimized(!chatMinimized)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Debug effect for activeUrl changes
  useEffect(() => {
    console.log(`activeUrl changed to: ${activeUrl}`)
  }, [activeUrl])

  // Notify parent about iframe state changes
  useEffect(() => {
    if (onIframeStateChange) {
      onIframeStateChange(!!activeUrl)
    }
  }, [activeUrl, onIframeStateChange])

  // Handle pending message after navigation
  useEffect(() => {
    if (conversationId) {
      const pendingMessage = sessionStorage.getItem('pendingMessage')
      if (pendingMessage) {
        sessionStorage.removeItem('pendingMessage')
        setInput(pendingMessage)
        // Auto-send the pending message
        setTimeout(() => {
          sendMessage(pendingMessage)
        }, 100)
      }
    }
  }, [conversationId, sendMessage])

  return (
    <div className="flex h-full">
      {/* Chat Panel */}
      <div className={cn(
        "flex flex-col transition-all duration-300",
        activeUrl 
          ? (isFullscreen 
              ? "w-0" 
              : (chatMinimized ? "w-12" : "w-1/3")
            ) 
          : "w-full"
      )}>
        {/* Hamburger Menu when iframe is active and chat is minimized */}
        {activeUrl && chatMinimized && (
          <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleChatMinimized}
              className="h-8 w-8 p-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Chat Header when iframe is active and chat is not minimized */}
        {activeUrl && !chatMinimized && (
          <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
            <h3 className="text-sm font-medium">Chat</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleChatMinimized}
              className="h-6 w-6 p-0"
            >
              <Menu className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Chat Content - hide when minimized */}
        <div className={cn(
          "flex-1 overflow-y-auto transition-all duration-300",
          chatMinimized ? "hidden" : "block p-4 space-y-6"
        )}>
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
              return (
                <ChatMessage 
                  key={normalizedMessage.id} 
                  message={normalizedMessage} 
                  onLinkClick={handleLinkClick}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input - hide when minimized */}
        <div className={cn(
          "border-t border-zinc-200 dark:border-zinc-800 transition-all duration-300",
          chatMinimized ? "hidden" : "block p-4"
        )}>
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

      {/* iframe Panel */}
      {activeUrl && (
        <div className={cn(
          "border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300 relative",
          isFullscreen 
            ? "w-full" 
            : (chatMinimized ? "w-[calc(100%-3rem)]" : "w-2/3")
        )}>
          {/* iframe Header */}
          <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate ml-2">
                {activeUrl}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Show expand chat button when chat is minimized */}
              {chatMinimized && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleChatMinimized}
                  className="h-6 w-6 p-0"
                  title="Show Chat"
                >
                  <Menu className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(activeUrl, '_blank')}
                className="h-6 w-6 p-0"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="h-6 w-6 p-0"
              >
                {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseIframe}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* iframe Content */}
          <div className="relative h-full">
            {iframeError ? (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div className="text-zinc-500 dark:text-zinc-400 mb-4">
                    This page cannot be embedded
                  </div>
                  <Button
                    onClick={() => window.open(activeUrl, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            ) : (
              <iframe
                src="http://localhost:5000/api/reports/financial_analysis_20250828_012138"
                className="w-full h-full border-0"
                // onError={handleIframeError}
                // sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                // title="Embedded Content"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
