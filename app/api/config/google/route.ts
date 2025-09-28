import { NextResponse, NextRequest } from "next/server"
import { buildApiUrl, makeFlaskRequest, API_CONFIG } from "@/lib/config"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { googleCredentials, userId } = data

    // Validate userId is provided
    if (!userId) {
      return NextResponse.json({
        error: "User ID is required",
        details: "User ID must be provided in the request body"
      }, { status: 400 })
    }

    if (!googleCredentials || typeof googleCredentials !== 'object') {
      return NextResponse.json({ error: "Google OAuth credentials are required" }, { status: 400 })
    }

    // Validate that the credentials have the expected structure
    if (!googleCredentials.client_id && !googleCredentials.installed?.client_id) {
      return NextResponse.json({ 
        error: "Google OAuth credentials must contain client_id (either at root level or under 'installed')" 
      }, { status: 400 })
    }

    if (!googleCredentials.client_secret && !googleCredentials.installed?.client_secret) {
      return NextResponse.json({ 
        error: "Google OAuth credentials must contain client_secret (either at root level or under 'installed')" 
      }, { status: 400 })
    }

    // Format the Google config for the Flask backend
    // Flask expects the credentials as 'credentials_json' or 'GOOGLE_OAUTH_CREDENTIALS_JSON'
    let normalizedCredentials = googleCredentials
    if (googleCredentials.installed) {
      normalizedCredentials = googleCredentials.installed
    }

    const googleConfig = {
      credentials_json: normalizedCredentials,
      GOOGLE_OAUTH_CREDENTIALS_JSON: normalizedCredentials
    }

    console.log('Sending Google config to Flask for user:', userId, {
      url: buildApiUrl(API_CONFIG.ENDPOINTS.CONFIG_GOOGLE),
      payload: googleConfig
    })

    // Send to Flask backend
    const flaskUrl = buildApiUrl(API_CONFIG.ENDPOINTS.CONFIG_GOOGLE)
    const response = await makeFlaskRequest(flaskUrl, {
      method: 'POST',
      body: JSON.stringify(googleConfig),
    }, userId)

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch (parseError) {
        errorData = { error: 'Unknown error - could not parse response' }
      }
      
      console.error('Flask API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      })
      
      throw new Error(`Flask API error: ${response.status} - ${errorData.error || errorData.message || response.statusText}`)
    }

    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: "Google configuration sent to Flask backend successfully",
      flaskResponse: result
    })
  } catch (error) {
    console.error("Failed to send Google config to Flask:", error)
    
    // Provide more specific error messages based on the error type
    let errorMessage = "Failed to send Google configuration to Flask backend"
    let suggestion = "Make sure the Flask backend is running on the configured URL"
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorMessage = "Cannot connect to Flask backend"
        suggestion = "Check if Flask server is running on http://localhost:5000"
      } else if (error.message.includes('JSON')) {
        errorMessage = "Invalid response from Flask backend"
        suggestion = "Check Flask server logs for configuration errors"
      } else if (error.message.includes('Flask API error')) {
        errorMessage = error.message
        suggestion = "Check the Google OAuth credentials format and Flask server logs"
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion
      }, 
      { status: 500 }
    )
  }
}
