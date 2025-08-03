import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Mock response for demo purposes
    return NextResponse.json({
      capabilities: [
        {
          id: "financial_analysis",
          name: "Financial Analysis",
          description: "Analyze financial statements, ratios, and performance metrics",
        },
        {
          id: "market_research",
          name: "Market Research",
          description: "Research market trends, competitor analysis, and industry insights",
        },
        {
          id: "investment_advice",
          name: "Investment Advice",
          description: "Provide investment recommendations and portfolio analysis",
        },
        {
          id: "data_visualization",
          name: "Data Visualization",
          description: "Create charts and graphs to visualize financial data",
        },
      ],
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch capabilities" }, { status: 500 })
  }
}
