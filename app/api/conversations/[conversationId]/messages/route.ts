import { NextResponse } from "next/server"
import { buildApiUrl, makeFlaskRequest, API_CONFIG } from "@/lib/config"

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params
    
    // Validate conversation ID
    if (!conversationId || conversationId.trim() === '') {
      return NextResponse.json({
        error: "Invalid conversation ID",
        details: "Conversation ID is required and cannot be empty"
      }, { status: 400 })
    }
    
    const url = buildApiUrl(API_CONFIG.ENDPOINTS.CONVERSATION_MESSAGES, { conversationId })
    
    console.log(`Fetching messages for conversation ${conversationId} from:`, url)
    
    const response = await makeFlaskRequest(url)
    
    if (!response.ok) {
      let errorDetails = `Status: ${response.status}`
      let errorData: any = null
      
      try {
        errorData = await response.json()
        errorDetails += `, Error: ${errorData.error || errorData.message || 'Unknown error'}`
        
        // Check if it's a configuration error
        if (errorData.missing_configs || errorData.error?.includes('configuration')) {
          return NextResponse.json({
            error: "Flask backend is not properly configured",
            details: errorData.error || "Missing required configurations",
            missing_configs: errorData.missing_configs,
            suggestion: "Please configure OpenAI and Google settings first"
          }, { status: 424 }) // 424 Failed Dependency
        }
        
        // Handle 404 specifically - conversation not found
        if (response.status === 404) {
          return NextResponse.json({
            error: "Conversation not found",
            details: `Conversation with ID ${conversationId} does not exist in the Flask backend`,
            suggestion: "The conversation may have been deleted or never created. Try creating a new conversation.",
            conversationId
          }, { status: 404 })
        }
        
      } catch (parseError) {
        console.error("Could not parse Flask error response:", parseError)
        errorDetails += " (unparseable response)"
      }
      
      console.error(`Flask API error for conversation ${conversationId}:`, errorDetails)
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
        conversationId,
        suggestion: response.status === 404 
          ? "Conversation not found. Try creating a new conversation."
          : "Check Flask backend logs for more details."
      }, { status: response.status })
    }
    
    const data = await response.json()
    console.log(`Successfully fetched ${data.messages?.length || 0} messages for conversation ${conversationId}`)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to fetch messages:", error)
    
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
        error: "Failed to fetch messages", 
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Check if Flask backend is running and properly configured"
      }, 
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params
    const { message } = await request.json()

    // Validate inputs
    if (!conversationId || conversationId.trim() === '') {
      return NextResponse.json({
        error: "Invalid conversation ID",
        details: "Conversation ID is required and cannot be empty"
      }, { status: 400 })
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({
        error: "Invalid message",
        details: "Message is required and must be a non-empty string"
      }, { status: 400 })
    }

    console.log(`Sending message to conversation ${conversationId}:`, message.substring(0, 100) + (message.length > 100 ? '...' : ''))
    
    const url = buildApiUrl(API_CONFIG.ENDPOINTS.CONVERSATION_MESSAGES, { conversationId })
    const response = await makeFlaskRequest(url, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    
    if (!response.ok) {
      let errorDetails = `Status: ${response.status}`
      let errorData: any = null
      
      try {
        errorData = await response.json()
        errorDetails += `, Error: ${errorData.error || errorData.message || 'Unknown error'}`
        
        // Check if it's a configuration error
        if (errorData.missing_configs || errorData.error?.includes('configuration')) {
          return NextResponse.json({
            error: "Flask backend is not properly configured",
            details: errorData.error || "Missing required configurations",
            missing_configs: errorData.missing_configs,
            suggestion: "Please configure OpenAI and Google settings first"
          }, { status: 424 }) // 424 Failed Dependency
        }
        
        // Handle 404 specifically - conversation not found
        if (response.status === 404) {
          return NextResponse.json({
            error: "Conversation not found",
            details: `Conversation with ID ${conversationId} does not exist in the Flask backend`,
            suggestion: "The conversation may have been deleted. Try creating a new conversation.",
            conversationId
          }, { status: 404 })
        }
        
      } catch (parseError) {
        console.error("Could not parse Flask error response:", parseError)
        errorDetails += " (unparseable response)"
      }
      
      console.error(`Flask API error for sending message to ${conversationId}:`, errorDetails)
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
        conversationId,
        suggestion: response.status === 404 
          ? "Conversation not found. Try creating a new conversation."
          : "Check Flask backend logs for more details."
      }, { status: response.status })
    }
    
    const data = await response.json()
    console.log(data.response)
    console.log(`Successfully sent message to conversation ${conversationId}, received response from agent:`, data.response?.agent || 'unknown')
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to send message:", error)
    
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
        error: "Failed to send message", 
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Check if Flask backend is running and properly configured"
      }, 
      { status: 500 }
    )
  }
}
