import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { conversationId: string } }) {
  try {
    const { conversationId } = params

    // Mock response for demo purposes
    // In a real app, you'd call your Flask backend here
    return NextResponse.json({
      conversation_id: conversationId,
      messages: [
        {
          role: "user",
          content: "Get the latest income statement for Apple",
          timestamp: Date.now() / 1000 - 100,
        },
        {
          role: "assistant",
          content:
            "I'll help you get Apple's latest income statement. Let me fetch that data for you...\n\nHere's Apple Inc.'s latest quarterly income statement (in millions USD):\n\n**Revenue**: $81,797\n**Cost of Revenue**: $44,952\n**Gross Profit**: $36,845\n**Operating Expenses**: $13,479\n**Operating Income**: $23,366\n**Net Income**: $19,881\n**EPS (Basic)**: $1.27\n**EPS (Diluted)**: $1.26\n\nThis represents a 7.8% year-over-year increase in revenue and a 10.1% increase in net income. Would you like me to analyze any specific aspects of this statement?",
          agent: "finance_analyst",
          timestamp: Date.now() / 1000 - 50,
        },
      ],
      created_at: Date.now() / 1000 - 200,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { conversationId: string } }) {
  try {
    const { conversationId } = params
    const { message } = await request.json()

    // In a real app, you'd call your Flask backend here

    // Mock response for demo purposes
    return NextResponse.json({
      conversation_id: conversationId,
      response: {
        role: "assistant",
        content:
          "I'll analyze that for you. Based on the financial data, Apple's performance shows strong growth in the latest quarter. Their revenue increased by 7.8% year-over-year, reaching $81.8 billion, while net income grew by 10.1% to $19.9 billion. The gross margin is approximately 45%, which is excellent for a hardware-focused company. Would you like me to compare these results with industry benchmarks or previous quarters?",
        agent: "finance_analyst",
        timestamp: Date.now() / 1000,
      },
      all_responses: [],
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
