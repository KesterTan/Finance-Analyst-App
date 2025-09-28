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

    const url = buildApiUrl(API_CONFIG.ENDPOINTS.CAPABILITIES)
    console.log("Fetching capabilities from:", url, "for user:", userId)
    
    const response = await makeFlaskRequest(url, {}, userId)
    
    if (!response.ok) {
      let errorDetails = `Status: ${response.status}`
      let errorData: any = null
      
      try {
        errorData = await response.json()
        errorDetails += `, Error: ${errorData.error || errorData.message || 'Unknown error'}`
        
        // Check if it's a configuration error
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
      
      console.error("Flask API error fetching capabilities:", errorDetails)
      
      return NextResponse.json({
        error: `Flask API error`,
        details: errorData?.error || errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        suggestion: response.status === 500 && errorData?.error?.includes('llm_config') 
          ? "Backend configuration missing. Please configure OpenAI and Google settings."
          : "Check Flask backend logs for more details."
      }, { status: response.status === 500 ? 424 : response.status })
    }
    
    const data = await response.json()
    console.log("Successfully fetched capabilities")
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to fetch capabilities:", error)
    
    // Provide specific error messages based on error type
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: "Cannot connect to Flask backend", 
          details: "Make sure the Flask server is running on http://localhost:5000",
          suggestion: "Start the Flask backend and ensure it's configured with OpenAI/Google credentials"
        }, 
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Failed to fetch capabilities", 
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Check if Flask backend is running and properly configured"
      }, 
      { status: 500 }
    )
  }
}
