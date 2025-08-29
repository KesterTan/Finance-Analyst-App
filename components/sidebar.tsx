"use client"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, Settings, MessageSquare, Trash2, Edit2, Check, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useConversations } from "@/hooks/use-conversations"
import { cn } from "@/lib/utils"

interface SidebarProps {
  isMinimized?: boolean
  onToggleMinimized?: () => void
}

export function Sidebar({ isMinimized = false, onToggleMinimized }: SidebarProps) {
  const { conversations, createConversation, deleteConversation, renameConversation, loading } = useConversations()
  const [editingConversation, setEditingConversation] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const handleEditStart = (conversation: any) => {
    setEditingConversation(conversation.conversation_id)
    setEditingName(conversation.name || `Chat ${conversation.message_count > 0 ? conversation.message_count : "New"}`)
  }

  const handleEditSave = async (conversationId: string) => {
    if (editingName.trim()) {
      await renameConversation(conversationId, editingName.trim())
    }
    setEditingConversation(null)
    setEditingName("")
  }

  const handleEditCancel = () => {
    setEditingConversation(null)
    setEditingName("")
  }

  return (
    <div className={cn(
      "border-r border-emerald-100 dark:border-emerald-900/30 h-full flex flex-col bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm transition-all duration-300",
      isMinimized ? "w-12" : "w-64"
    )}>
      {/* Toggle Button */}
      {onToggleMinimized && (
        <div className="p-2 border-b border-emerald-100 dark:border-emerald-900/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimized}
            className="h-8 w-8 p-0"
          >
            {isMinimized ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {!isMinimized && (
        <>
          <div className="p-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
              onClick={createConversation}
              disabled={loading}
            >
              <PlusCircle size={16} />
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {conversations.map((conversation) => (
              <div key={conversation.conversation_id} className="mb-1">
                {editingConversation === conversation.conversation_id ? (
                  // Edit mode
                  <div className="flex items-center gap-2 p-2 rounded-md bg-zinc-100 dark:bg-zinc-800">
                    <MessageSquare size={16} />
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-6 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEditSave(conversation.conversation_id)
                        } else if (e.key === "Escape") {
                          handleEditCancel()
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleEditSave(conversation.conversation_id)}
                    >
                      <Check size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleEditCancel}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ) : (
                  // View mode
                  <Link
                    href={`/chat/${conversation.conversation_id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare size={16} />
                      <span className="truncate text-sm">
                        {conversation.name || `Chat ${conversation.message_count > 0 ? conversation.message_count : "New"}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleEditStart(conversation)
                        }}
                      >
                        <Edit2 size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteConversation(conversation.conversation_id)
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-emerald-100 dark:border-emerald-900/30">
            <Link href="/settings">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              >
                <Settings size={16} />
                Settings
              </Button>
            </Link>
          </div>
        </>
      )}

      {/* Minimized state - just show icons */}
      {isMinimized && (
        <div className="flex flex-col items-center gap-2 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={createConversation}
            disabled={loading}
            className="h-8 w-8 p-0"
            title="New Chat"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
          
          {/* Show recent conversations as dots or simplified icons */}
          <div className="flex flex-col gap-1 max-h-32 overflow-hidden">
            {conversations.slice(0, 3).map((conversation) => (
              <Link
                key={conversation.conversation_id}
                href={`/chat/${conversation.conversation_id}`}
                title={conversation.name || `Chat ${conversation.message_count > 0 ? conversation.message_count : "New"}`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
              </Link>
            ))}
          </div>
          
          <div className="mt-auto">
            <Link href="/settings">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
