import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const apiPath = path.join('/')
    
    // Get Flask backend URL from environment
    const flaskUrl = process.env.FLASK_BACKEND_URL || "http://localhost:5000"
    const targetUrl = `${flaskUrl}/api/${apiPath}`
    
    console.log(`Proxying request to: ${targetUrl}`)
    
    // Forward request to Flask backend
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; iframe-proxy)',
      }
    })

    if (!response.ok) {
      console.error(`Flask backend error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { 
          error: "Failed to fetch from backend",
          details: `Backend returned ${response.status}`,
          target_url: targetUrl
        },
        { status: response.status }
      )
    }

    // Get the content from Flask
    const content = await response.text()
    const contentType = response.headers.get('content-type') || 'text/html'
    
    // Return with iframe-friendly headers
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        // Allow iframe embedding from same origin and localhost:3001
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "frame-ancestors 'self' http://localhost:3001 http://localhost:3000"
      }
    })

  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json(
      { 
        error: "Proxy failed",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    )
  }
}
