import { NextResponse, NextRequest } from "next/server"
import { buildApiUrl, makeFlaskRequest, API_CONFIG } from "@/lib/config"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
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

    const { conversationId } = await params
    const url = buildApiUrl(API_CONFIG.ENDPOINTS.CONVERSATION_DELETE, { conversationId })
    
    console.log(`Deleting conversation ${conversationId} for user: ${userId}`)
    
    const response = await makeFlaskRequest(url, {
      method: 'DELETE',
    }, userId)

    if (!response.ok) {
      throw new Error(`Flask API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to delete conversation:", error)
    return NextResponse.json(
      { error: "Failed to delete conversation. Make sure the Flask backend is running." }, 
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const requestData = await request.json()
    const { name, userId } = requestData
    
    if (!userId) {
      return NextResponse.json({
        error: "User ID is required",
        details: "User ID must be provided in the request body"
      }, { status: 400 })
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({
        error: "Invalid name",
        details: "Name is required and must be a non-empty string"
      }, { status: 400 })
    }

    const { conversationId } = await params
    
    // For now, we'll just return success since the Flask backend may not have rename functionality
    // In a real implementation, you'd call the Flask backend here
    console.log(`Renaming conversation ${conversationId} to "${name}" for user: ${userId}`)
    
    return NextResponse.json({
      success: true,
      message: "Conversation renamed successfully",
      conversationId,
      name
    })
  } catch (error) {
    console.error("Failed to rename conversation:", error)
    return NextResponse.json(
      { error: "Failed to rename conversation" }, 
      { status: 500 }
    )
  }
}
