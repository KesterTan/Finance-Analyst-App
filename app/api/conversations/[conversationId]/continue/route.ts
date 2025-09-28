import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const body = await request.json()
    const { userId } = body

    // Validate required fields
    if (!body.user_input) {
      return NextResponse.json(
        { 
          error: "Bad request",
          details: "user_input is required"
        },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json({
        error: "User ID is required",
        details: "User ID must be provided in the request body"
      }, { status: 400 })
    }

    // Get Flask backend URL from environment
    const flaskUrl = process.env.FLASK_BACKEND_URL || "http://localhost:5000"
    
    // Forward request to Flask backend with userId as header
    const response = await fetch(`${flaskUrl}/api/conversations/${conversationId}/continue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({ user_input: body.user_input })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ details: 'Failed to continue workflow' }))
      return NextResponse.json(
        { 
          error: "Failed to continue workflow",
          details: errorData.details || response.statusText,
          flask_error: errorData
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error("Continue workflow error:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    )
  }
}
