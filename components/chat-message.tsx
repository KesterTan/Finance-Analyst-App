import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string | any
  agent?: string
  timestamp?: number
  name?: string
  isLoading?: boolean
  id?: string
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  
  // Ensure content is always a string
  const content = typeof message.content === "string" 
    ? message.content 
    : JSON.stringify(message.content)

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "rounded-lg p-4 max-w-[80%] shadow-sm",
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-emerald-100 dark:border-emerald-900/30",
        )}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm opacity-70">AI is thinking...</span>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{content}</div>
        )}
        {message.agent && !message.isLoading && (
          <div className="text-xs mt-2 opacity-70">Agent: {message.agent}</div>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-zinc-300 dark:bg-zinc-700">U</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
