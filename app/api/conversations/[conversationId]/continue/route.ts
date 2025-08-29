import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const body = await request.json()

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

    // Get Flask backend URL from environment
    const flaskUrl = process.env.FLASK_BACKEND_URL || "http://localhost:5000"
    
    // Forward request to Flask backend
    const response = await fetch(`${flaskUrl}/api/conversations/${conversationId}/continue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
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
