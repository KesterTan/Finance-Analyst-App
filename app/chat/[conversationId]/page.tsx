"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ChatInterface } from "@/components/chat-interface"

export default function ChatPage() {
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)
  const [isIframeActive, setIsIframeActive] = useState(false)

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
