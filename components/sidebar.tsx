"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle, Settings, MessageSquare, Trash2 } from "lucide-react"
import { useConversations } from "@/hooks/use-conversations"

export function Sidebar() {
  const { conversations, createConversation, deleteConversation, loading } = useConversations()

  return (
    <div className="w-64 border-r border-emerald-100 dark:border-emerald-900/30 h-full flex flex-col bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
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
          <Link
            key={conversation.conversation_id}
            href={`/chat/${conversation.conversation_id}`}
            className="flex items-center justify-between p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 mb-1 group"
          >
            <div className="flex items-center gap-2 truncate">
              <MessageSquare size={16} />
              <span className="truncate text-sm">
                {`Chat ${conversation.message_count > 0 ? conversation.message_count : "New"}`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                deleteConversation(conversation.conversation_id)
              }}
            >
              <Trash2 size={14} />
            </Button>
          </Link>
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
    </div>
  )
}
