import { NextResponse } from "next/server"
import { buildApiUrl, makeFlaskRequest, API_CONFIG } from "@/lib/config"

export async function GET() {
  try {
    const url = buildApiUrl(API_CONFIG.ENDPOINTS.HEALTH)
    const response = await makeFlaskRequest(url)
    
    if (!response.ok) {
      throw new Error(`Flask API responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json({
      status: "healthy",
      message: "Next.js API is running and Flask backend is accessible",
      flask_status: data,
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      { 
        status: "unhealthy", 
        message: "Flask backend is not accessible",
        error: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 503 }
    )
  }
}
