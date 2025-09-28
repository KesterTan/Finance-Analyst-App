import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params

    // Get userId from query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({
        error: "User ID is required",
        details: "User ID must be provided as a query parameter"
      }, { status: 400 })
    }

    // Get Flask backend URL from environment
    const flaskUrl = process.env.FLASK_BACKEND_URL || "http://localhost:5000"
    
    // Forward request to Flask backend with userId as header
    const response = await fetch(`${flaskUrl}/api/conversations/${conversationId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ details: 'Failed to get conversation status' }))
      return NextResponse.json(
        { 
          error: "Failed to get conversation status",
          details: errorData.details || response.statusText,
          flask_error: errorData
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    )
  }
}
