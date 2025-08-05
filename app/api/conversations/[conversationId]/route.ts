import { NextResponse } from "next/server"
import { buildApiUrl, makeFlaskRequest, API_CONFIG } from "@/lib/config"

export async function DELETE(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params
    const url = buildApiUrl(API_CONFIG.ENDPOINTS.CONVERSATION_DELETE, { conversationId })
    
    const response = await makeFlaskRequest(url, {
      method: 'DELETE',
    })

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
