"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

interface XeroConfig {
  client_id: string
  client_secret: string
  redirect_uri: string
}

interface Config {
  OPENAI_API_KEY?: string
  GOOGLE_OAUTH_CREDENTIALS_JSON?: Record<string, any>
  LLM_MODEL?: string
  LLM_TEMPERATURE?: number
  LLM_TIMEOUT?: number
  xero?: XeroConfig
}

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchConfig = async () => {
    try {
      setLoading(true)

      // In a real app, you'd fetch this from your backend
      // For demo purposes, we'll use localStorage
      const storedConfig = localStorage.getItem("app_config")
      if (storedConfig) {
        setConfig(JSON.parse(storedConfig))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load configuration",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (newConfig: Partial<Config>) => {
    try {
      setLoading(true)

      // Merge with existing config
      const updatedConfig = {
        ...config,
        ...newConfig,
      }

      // In a real app, you'd send this to your backend
      // For demo purposes, we'll use localStorage
      localStorage.setItem("app_config", JSON.stringify(updatedConfig))

      setConfig(updatedConfig)
      return true
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return {
    config,
    updateConfig,
    loading,
  }
}
