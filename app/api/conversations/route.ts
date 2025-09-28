import { NextResponse, NextRequest } from "next/server"
import { buildApiUrl, makeFlaskRequest, API_CONFIG } from "@/lib/config"

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

    const url = buildApiUrl(API_CONFIG.ENDPOINTS.CONVERSATIONS)
    console.log(`Fetching conversations from: ${url} for user: ${userId}`)
    
    const response = await makeFlaskRequest(url, {}, userId)
    
    if (!response.ok) {
      throw new Error(`Flask API responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to fetch conversations:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversations. Make sure the Flask backend is running." }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    const { userId } = requestData
    
    if (!userId) {
      return NextResponse.json({
        error: "User ID is required",
        details: "User ID must be provided in the request body"
      }, { status: 400 })
    }

    const url = buildApiUrl(API_CONFIG.ENDPOINTS.CONVERSATIONS)
    console.log("Creating new conversation via:", url, "for user:", userId)
    
    const response = await makeFlaskRequest(url, {
      method: 'POST',
    }, userId)
    
    if (!response.ok) {
      let errorDetails = `Status: ${response.status}`
      let errorData: any = null
      
      try {
        errorData = await response.json()
        errorDetails += `, Error: ${errorData.error || errorData.message || 'Unknown error'}`
        
        // Check if it's a configuration error - Flask backend returns 500 when config is missing
        if (errorData.missing_configs || 
            errorData.error?.includes('configuration') ||
            errorData.error?.includes('llm_config') ||
            errorData.error?.includes('NoneType') ||
            (response.status === 500 && errorData.error?.includes('attribute'))) {
          return NextResponse.json({
            error: "Flask backend is not properly configured",
            details: errorData.error || "Missing required configurations (OpenAI/Google)",
            missing_configs: errorData.missing_configs,
            suggestion: "Please configure OpenAI and Google settings in Settings page first",
            flask_error: errorData.error
          }, { status: 424 }) // 424 Failed Dependency
        }
        
      } catch (parseError) {
        console.error("Could not parse Flask error response:", parseError)
        errorDetails += " (unparseable response)"
      }
      
      console.error("Flask API error creating conversation:", errorDetails)
      console.error("Full Flask response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      })
      
      return NextResponse.json({
        error: `Flask API error`,
        details: errorData?.error || errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        suggestion: response.status === 500 && errorData?.error?.includes('llm_config') 
          ? "Backend configuration missing. Please configure OpenAI and Google settings in Settings page."
          : "Check Flask backend logs for more details.",
        flask_error: errorData?.error
      }, { status: response.status === 500 ? 424 : response.status }) // Convert 500 config errors to 424
    }
    
    const data = await response.json()
    console.log("Successfully created conversation:", data.conversation_id)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to create conversation:", error)
    
    // Provide specific error messages based on error type
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: "Cannot connect to Flask backend", 
          details: "Make sure the Flask server is running on http://localhost:5000",
          suggestion: "Start the Flask backend and configure it with OpenAI/Google credentials"
        }, 
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create conversation", 
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Check if Flask backend is running and properly configured with OpenAI/Google settings"
      }, 
      { status: 500 }
    )
  }
}
