import { NextResponse } from "next/server"
import { buildApiUrl, makeFlaskRequest, API_CONFIG } from "@/lib/config"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { clientId, clientSecret, redirectUri } = data

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Xero client ID and secret are required" }, { status: 400 })
    }

    // Format the Xero config for the Flask backend
    const xeroConfig = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri || "http://localhost:8080/callback"
    }

    // Send to Flask backend
    const flaskUrl = buildApiUrl(API_CONFIG.ENDPOINTS.CONFIG_XERO)
    const response = await makeFlaskRequest(flaskUrl, {
      method: 'POST',
      body: JSON.stringify(xeroConfig),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Flask API error: ${response.status} - ${errorData.error || response.statusText}`)
    }

    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: "Xero configuration sent to Flask backend successfully",
      flaskResponse: result
    })
  } catch (error) {
    console.error("Failed to send Xero config to Flask:", error)
    return NextResponse.json(
      { 
        error: "Failed to send Xero configuration to Flask backend", 
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Make sure the Flask backend is running on the configured URL"
      }, 
      { status: 500 }
    )
  }
}
