"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { useConversations } from "@/hooks/use-conversations"

export default function Home() {
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)
  const [isIframeActive, setIsIframeActive] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(true)
  const { conversations, getOrCreateConversation, loading } = useConversations()
  const router = useRouter()
  const hasAttemptedRedirection = useRef(false)

  // Clear any stale flags on component mount
  useEffect(() => {
    sessionStorage.removeItem('home_page_redirecting')
    localStorage.removeItem('creating_conversation')
  }, [])

  const handleToggleSidebar = () => {
    setIsSidebarMinimized(!isSidebarMinimized)
  }

  const handleIframeStateChange = (isActive: boolean) => {
    setIsIframeActive(isActive)
    // Auto-minimize sidebar when iframe is active
    if (isActive && !isSidebarMinimized) {
      setIsSidebarMinimized(true)
    }
  }

  // Auto-redirect to an existing conversation or create a new one
  useEffect(() => {
    // Only proceed if conversations have loaded and we haven't attempted redirection yet
    if (loading || hasAttemptedRedirection.current) return

    const handleRedirection = async () => {
      // Double-check that we haven't already started this process
      const redirectionKey = 'home_page_redirecting'
      const isAlreadyRedirecting = sessionStorage.getItem(redirectionKey)
      
      if (isAlreadyRedirecting === 'true') {
        console.log('Already redirecting, skipping...')
        return
      }

      hasAttemptedRedirection.current = true
      sessionStorage.setItem(redirectionKey, 'true')
      
      try {
        // Use the new function that checks for existing conversations first
        console.log('Getting or creating conversation...')
        const conversationId = await getOrCreateConversation()
        if (conversationId) {
          console.log('Redirecting to conversation:', conversationId)
          router.push(`/chat/${conversationId}`)
        } else {
          // If conversation creation failed, stop redirecting and show the interface
          console.error('Failed to get or create conversation')
          setIsRedirecting(false)
          sessionStorage.removeItem(redirectionKey)
        }
      } catch (error) {
        console.error('Failed to handle redirection:', error)
        setIsRedirecting(false)
        sessionStorage.removeItem(redirectionKey)
      }
    }

    // Add a small delay to let React settle
    const timeoutId = setTimeout(handleRedirection, 100)

    // Cleanup function to reset the flag when component unmounts
    return () => {
      clearTimeout(timeoutId)
      hasAttemptedRedirection.current = false
      sessionStorage.removeItem('home_page_redirecting')
    }
  }, [conversations, loading]) // Only depend on conversations and loading state

  // Show loading state while redirecting
  if (isRedirecting || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-zinc-900 dark:to-emerald-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-600 dark:text-emerald-400">
            {loading ? "Loading conversations..." : "Setting up your chat..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-zinc-900 dark:to-emerald-950">
      <Sidebar 
        isMinimized={isSidebarMinimized}
        onToggleMinimized={handleToggleSidebar}
      />
      <main className="flex-1 overflow-hidden">
        <ChatInterface onIframeStateChange={handleIframeStateChange} />
      </main>
    </div>
  )
}
