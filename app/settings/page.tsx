"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useConfig } from "@/hooks/use-config"
import { CheckCircle, AlertCircle, Loader2, Home } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const { toast } = useToast()
  const { config, updateConfig, loading } = useConfig()
  const router = useRouter()

  const [openaiKey, setOpenaiKey] = useState("")
  const [googleCredentials, setGoogleCredentials] = useState("")
  const [llmModel, setLlmModel] = useState("gpt-4")
  const [llmTemperature, setLlmTemperature] = useState("0.1")
  const [llmTimeout, setLlmTimeout] = useState("120")

  const [xeroClientId, setXeroClientId] = useState("")
  const [xeroClientSecret, setXeroClientSecret] = useState("")
  const [xeroRedirectUri, setXeroRedirectUri] = useState("http://localhost:8080/callback")

  // Track Flask backend status
  const [flaskConfigSent, setFlaskConfigSent] = useState(false)
  const [sendingToFlask, setSendingToFlask] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Update state when config loads
  useEffect(() => {
    if (config !== null) { // Check if config has been loaded (even if empty)
      setOpenaiKey(config.OPENAI_API_KEY || "")
      
      // Safely handle Google credentials
      const googleCreds = config.GOOGLE_OAUTH_CREDENTIALS_JSON
      if (googleCreds && typeof googleCreds === 'object') {
        setGoogleCredentials(JSON.stringify(googleCreds, null, 2))
      } else {
        setGoogleCredentials("")
      }
      
      setLlmModel(config.LLM_MODEL || "gpt-4")
      setLlmTemperature(config.LLM_TEMPERATURE?.toString() || "0.1")
      setLlmTimeout(config.LLM_TIMEOUT?.toString() || "120")
      setXeroClientId(config.xero?.client_id || "")
      setXeroClientSecret(config.xero?.client_secret || "")
      setXeroRedirectUri(config.xero?.redirect_uri || "http://localhost:8080/callback")
      setInitialLoading(false)
    }
  }, [config])

  // Ensure loading state is cleared even if config fails to load
  useEffect(() => {
    if (!loading && config !== null) {
      setInitialLoading(false)
    }
  }, [loading, config])

  // Check Flask backend status on component mount
  useEffect(() => {
    // Load Flask status from localStorage first (for immediate UI feedback)
    const savedFlaskStatus = localStorage.getItem('flask_config_status')
    if (savedFlaskStatus) {
      setFlaskConfigSent(JSON.parse(savedFlaskStatus))
    }
    
    // Then check actual Flask status
    checkFlaskBackendStatus()
  }, [])

  // Function to check if Flask backend is configured
  const checkFlaskBackendStatus = async () => {
    try {
      // Add a shorter timeout for the initial check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/config/llm', {
        signal: controller.signal
      }); // This now calls /api/config/status on Flask
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json()
        // Check if both required configs are set (OpenAI and Google)
        const isConfigured = data.openai_configured && data.google_configured
        setFlaskConfigSent(isConfigured)
        
        // Save status to localStorage for persistence
        localStorage.setItem('flask_config_status', JSON.stringify(isConfigured))
      } else if (response.status >= 500 && response.status < 600) {
        // Server error - likely connectivity issue
        toast({
          title: "Server Connection Error",
          description: "Unable to connect to the backend server. Please check if the server is running.",
          variant: "destructive",
        })
        setFlaskConfigSent(false)
        localStorage.setItem('flask_config_status', JSON.stringify(false))
      } else {
        setFlaskConfigSent(false)
        localStorage.setItem('flask_config_status', JSON.stringify(false))
      }
    } catch (error) {
      console.log('Flask backend not available:', error)
      
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
      }
      
      setFlaskConfigSent(false)
      localStorage.setItem('flask_config_status', JSON.stringify(false))
    }
  }

  // Function to send OpenAI config to Flask backend
  const sendOpenAIConfigToFlask = async (configData: any) => {
    try {
      setSendingToFlask(true)
      const response = await fetch('/api/config/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openaiKey: configData.OPENAI_API_KEY,
          llmModel: configData.LLM_MODEL,
          llmTemperature: configData.LLM_TEMPERATURE,
          llmTimeout: configData.LLM_TIMEOUT,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send OpenAI config to Flask backend: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Flask OpenAI config updated:', result)
      
      // Check overall Flask status after successful config
      await checkFlaskBackendStatus()
    } catch (error) {
      console.error('Error sending OpenAI config to Flask:', error)
      setFlaskConfigSent(false)
      throw error
    } finally {
      setSendingToFlask(false)
    }
  }

  // Function to send Google config to Flask backend
  const sendGoogleConfigToFlask = async () => {
    try {
      setSendingToFlask(true)
      const parsedCredentials = JSON.parse(googleCredentials || '{}')
      
      const response = await fetch('/api/config/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleCredentials: parsedCredentials,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send Google config to Flask backend: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Flask Google config updated:', result)
      
      // Check overall Flask status after successful config
      await checkFlaskBackendStatus()
    } catch (error) {
      console.error('Error sending Google config to Flask:', error)
      setFlaskConfigSent(false)
      throw error
    } finally {
      setSendingToFlask(false)
    }
  }

  // Function to send Xero config to Flask backend
  const sendXeroConfigToFlask = async (xeroData: any) => {
    try {
      setSendingToFlask(true)
      const response = await fetch('/api/config/xero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: xeroData.client_id,
          clientSecret: xeroData.client_secret,
          redirectUri: xeroData.redirect_uri,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send Xero config to Flask backend: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Flask Xero config updated:', result)
    } catch (error) {
      console.error('Error sending Xero config to Flask:', error)
      throw error
    } finally {
      setSendingToFlask(false)
    }
  }

  const handleSaveOpenAI = async () => {
    try {
      // Save to local config
      await updateConfig({
        OPENAI_API_KEY: openaiKey,
        LLM_MODEL: llmModel,
        LLM_TEMPERATURE: Number.parseFloat(llmTemperature),
        LLM_TIMEOUT: Number.parseInt(llmTimeout),
      })

      // Send OpenAI config to Flask backend
      await sendOpenAIConfigToFlask({
        OPENAI_API_KEY: openaiKey,
        LLM_MODEL: llmModel,
        LLM_TEMPERATURE: Number.parseFloat(llmTemperature),
        LLM_TIMEOUT: Number.parseInt(llmTimeout),
      })

      toast({
        title: "Settings saved",
        description: "Your OpenAI settings have been updated and sent to the AI backend.",
      })
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your settings.",
        variant: "destructive",
      })
    }
  }

  const handleSaveGoogle = async () => {
    try {
      let parsedCredentials = {}
      try {
        parsedCredentials = JSON.parse(googleCredentials)
      } catch (e) {
        toast({
          title: "Invalid JSON",
          description: "Please enter valid JSON for Google credentials.",
          variant: "destructive",
        })
        return
      }

      // Save to local config
      await updateConfig({
        GOOGLE_OAUTH_CREDENTIALS_JSON: parsedCredentials,
      })

      // Send Google config to Flask backend
      await sendGoogleConfigToFlask()

      toast({
        title: "Settings saved",
        description: "Your Google credentials have been updated and sent to the AI backend.",
      })
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your settings.",
        variant: "destructive",
      })
    }
  }

  const handleSaveXero = async () => {
    try {
      const xeroConfig = {
        client_id: xeroClientId,
        client_secret: xeroClientSecret,
        redirect_uri: xeroRedirectUri,
      }

      // Save to local config
      await updateConfig({
        xero: xeroConfig,
      })

      // Send Xero config to Flask backend
      await sendXeroConfigToFlask(xeroConfig)

      toast({
        title: "Settings saved",
        description: "Your Xero settings have been updated and sent to the AI backend.",
      })
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your settings.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-zinc-900 dark:to-emerald-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button
          onClick={() => router.push('/')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Back to Chat
        </Button>
      </div>

      {initialLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading saved settings...</span>
        </div>
      )}

      {!initialLoading && (
      <Tabs defaultValue="google">
        <TabsList className="mb-6">
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="xero">Xero</TabsTrigger>
        </TabsList>

        <TabsContent value="google">
          <Card>
            <CardHeader>
              <CardTitle>Google OAuth Configuration</CardTitle>
              <CardDescription>Configure your Google OAuth credentials for API access.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="google-credentials">OAuth Credentials JSON</Label>
                <Textarea
                  id="google-credentials"
                  value={googleCredentials}
                  onChange={(e) => setGoogleCredentials(e.target.value)}
                  placeholder='{"installed": {"client_id": "..."}}'
                  className="font-mono h-64"
                />
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <Button
                onClick={handleSaveGoogle}
                disabled={loading || sendingToFlask}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {sendingToFlask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Google Settings
              </Button>
              
              {/* Flask Backend Status */}
              <div className="flex items-center gap-2 text-sm">
                {sendingToFlask ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                    <span className="text-yellow-600">Sending to AI Backend...</span>
                  </>
                ) : flaskConfigSent ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">AI Backend Configured</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-amber-600">AI Backend Not Configured</span>
                  </>
                )}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="openai">
          <Card>
            <CardHeader>
              <CardTitle>OpenAI Configuration</CardTitle>
              <CardDescription>Configure your OpenAI API key and model settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  disabled={loading || sendingToFlask}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="llm-model">Model</Label>
                <Input
                  id="llm-model"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder="gpt-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="llm-temperature">Temperature</Label>
                  <Input
                    id="llm-temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={llmTemperature}
                    onChange={(e) => setLlmTemperature(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="llm-timeout">Timeout (seconds)</Label>
                  <Input
                    id="llm-timeout"
                    type="number"
                    min="1"
                    value={llmTimeout}
                    onChange={(e) => setLlmTimeout(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <Button
                onClick={handleSaveOpenAI}
                disabled={loading || sendingToFlask}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {sendingToFlask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save OpenAI Settings
              </Button>
              
              {/* Flask Backend Status */}
              <div className="flex items-center gap-2 text-sm">
                {sendingToFlask ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                    <span className="text-yellow-600">Sending to AI Backend...</span>
                  </>
                ) : flaskConfigSent ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">AI Backend Configured</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-amber-600">AI Backend Not Configured</span>
                  </>
                )}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="xero">
          <Card>
            <CardHeader>
              <CardTitle>Xero Configuration</CardTitle>
              <CardDescription>Configure your Xero API credentials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="xero-client-id">Client ID</Label>
                <Input id="xero-client-id" value={xeroClientId} onChange={(e) => setXeroClientId(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="xero-client-secret">Client Secret</Label>
                <Input
                  id="xero-client-secret"
                  type="password"
                  value={xeroClientSecret}
                  onChange={(e) => setXeroClientSecret(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="xero-redirect-uri">Redirect URI</Label>
                <Input
                  id="xero-redirect-uri"
                  value={xeroRedirectUri}
                  onChange={(e) => setXeroRedirectUri(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSaveXero}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Save Xero Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  )
}
