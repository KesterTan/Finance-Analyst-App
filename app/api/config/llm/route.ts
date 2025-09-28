import { NextResponse, NextRequest } from "next/server"
import { buildApiUrl, makeFlaskRequest, API_CONFIG } from "@/lib/config"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { openaiKey, llmModel, llmTemperature, llmTimeout, userId } = data

    // Validate userId is provided
    if (!userId) {
      return NextResponse.json({
        error: "User ID is required",
        details: "User ID must be provided in the request body"
      }, { status: 400 })
    }

    if (!openaiKey) {
      return NextResponse.json({ error: "OpenAI API key is required" }, { status: 400 })
    }

    // Format the OpenAI config for the Flask backend
    const openaiConfig = {
      api_key: openaiKey,
      model: llmModel || "gpt-4",
      temperature: llmTemperature || 0.1,
      timeout: llmTimeout || 120,
    }

    // Send to Flask backend
    const flaskUrl = buildApiUrl(API_CONFIG.ENDPOINTS.CONFIG_OPENAI)
    console.log(`Sending OpenAI config for user: ${userId}`)
    
    const response = await makeFlaskRequest(flaskUrl, {
      method: 'POST',
      body: JSON.stringify(openaiConfig),
    }, userId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Flask API error: ${response.status} - ${errorData.error || response.statusText}`)
    }

    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: "OpenAI configuration sent to Flask backend successfully",
      flaskResponse: result
    })
  } catch (error) {
    console.error("Failed to send OpenAI config to Flask:", error)
    return NextResponse.json(
      { 
        error: "Failed to send OpenAI configuration to Flask backend", 
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Make sure the Flask backend is running on the configured URL"
      }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get userId from query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({
        error: "User ID is required",
        details: "User ID must be provided as a query parameter"
      }, { status: 400 })
    }

    // Get current config status from Flask backend
    const flaskUrl = buildApiUrl(API_CONFIG.ENDPOINTS.CONFIG_STATUS)
    console.log(`Getting config status for user: ${userId}`)
    
    const response = await makeFlaskRequest(flaskUrl, {}, userId)

    if (!response.ok) {
      throw new Error(`Flask API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to get config status from Flask:", error)
    return NextResponse.json(
      { error: "Failed to get configuration status from Flask backend" }, 
      { status: 500 }
    )
  }
}
