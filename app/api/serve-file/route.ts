import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      )
    }

    // Extract relative path from ai-finance-analyst onwards
    let relativePath = filePath
    if (filePath.includes('ai-finance-analyst/')) {
      relativePath = filePath.split('ai-finance-analyst/')[1]
    }

    // Construct full path from repository root
    const repositoryRoot = process.cwd()
    const fullPath = path.join(repositoryRoot, relativePath)

    // Security check: ensure the resolved path is within the repository
    const resolvedPath = path.resolve(fullPath)
    const resolvedRoot = path.resolve(repositoryRoot)
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Validate that the file exists and is accessible
    if (!existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: `File not found: ${relativePath}` },
        { status: 404 }
      )
    }

    // Read the file
    const fileContent = await readFile(resolvedPath, 'utf8')
    
    // For HTML files, serve them directly as HTML pages
    if (path.extname(resolvedPath).toLowerCase() === '.html') {
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        }
      })
    }

    // For other file types, determine content type
    const ext = path.extname(resolvedPath).toLowerCase()
    let contentType = 'text/plain'
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf'
        break
      case '.json':
        contentType = 'application/json'
        break
      case '.css':
        contentType = 'text/css'
        break
      case '.js':
        contentType = 'application/javascript'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.svg':
        contentType = 'image/svg+xml'
        break
    }

    const fileBuffer = await readFile(resolvedPath)
    return new NextResponse(fileBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error("File serve error:", error)
    return NextResponse.json(
      { 
        error: "Failed to serve file",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
