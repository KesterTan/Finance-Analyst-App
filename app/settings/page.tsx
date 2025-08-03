"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useConfig } from "@/hooks/use-config"

export default function SettingsPage() {
  const { toast } = useToast()
  const { config, updateConfig, loading } = useConfig()

  const [openaiKey, setOpenaiKey] = useState(config?.OPENAI_API_KEY || "")
  const [googleCredentials, setGoogleCredentials] = useState(
    JSON.stringify(config?.GOOGLE_OAUTH_CREDENTIALS_JSON || {}, null, 2),
  )
  const [llmModel, setLlmModel] = useState(config?.LLM_MODEL || "gpt-4")
  const [llmTemperature, setLlmTemperature] = useState(config?.LLM_TEMPERATURE?.toString() || "0.1")
  const [llmTimeout, setLlmTimeout] = useState(config?.LLM_TIMEOUT?.toString() || "120")

  const [xeroClientId, setXeroClientId] = useState(config?.xero?.client_id || "")
  const [xeroClientSecret, setXeroClientSecret] = useState(config?.xero?.client_secret || "")
  const [xeroRedirectUri, setXeroRedirectUri] = useState(config?.xero?.redirect_uri || "http://localhost:8080/callback")

  const handleSaveOpenAI = async () => {
    try {
      await updateConfig({
        OPENAI_API_KEY: openaiKey,
        LLM_MODEL: llmModel,
        LLM_TEMPERATURE: Number.parseFloat(llmTemperature),
        LLM_TIMEOUT: Number.parseInt(llmTimeout),
      })
      toast({
        title: "Settings saved",
        description: "Your OpenAI settings have been updated.",
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

      await updateConfig({
        GOOGLE_OAUTH_CREDENTIALS_JSON: parsedCredentials,
      })

      toast({
        title: "Settings saved",
        description: "Your Google credentials have been updated.",
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
      await updateConfig({
        xero: {
          client_id: xeroClientId,
          client_secret: xeroClientSecret,
          redirect_uri: xeroRedirectUri,
        },
      })

      toast({
        title: "Settings saved",
        description: "Your Xero settings have been updated.",
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
    <div className="container py-10 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-zinc-900 dark:to-emerald-950 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="openai">
        <TabsList className="mb-6">
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="xero">Xero</TabsTrigger>
        </TabsList>

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
            <CardFooter>
              <Button
                onClick={handleSaveOpenAI}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Save OpenAI Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

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
            <CardFooter>
              <Button
                onClick={handleSaveGoogle}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Save Google Settings
              </Button>
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
    </div>
  )
}
