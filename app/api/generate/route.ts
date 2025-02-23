import { NextResponse } from "next/server"
import OpenAI from "openai"

// Explicitly define allowed methods
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function generateWithDallE(prompt: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured")
  }

  try {
    console.log("Generating with DALL-E, prompt:", prompt)
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    })

    if (!response.data?.[0]?.b64_json) {
      throw new Error("No image data received from DALL-E")
    }

    return response.data[0].b64_json
  } catch (error: any) {
    console.error("DALL-E error:", error)
    throw new Error(error?.message || "DALL-E generation failed")
  }
}

// Define GET handler to test if route is accessible
export async function GET() {
  return NextResponse.json({ status: "API route is working" })
}

export async function POST(request: Request) {
  console.log("POST request received")

  try {
    const body = await request.json()
    const { city, issue } = body

    if (!city || !issue) {
      return NextResponse.json({ success: false, error: "City and issue are required" }, { status: 400 })
    }

    const basePrompt = `Create a climate change awareness image showing the impact of ${issue} in ${city}. Style: realistic, dramatic lighting, emotional impact`

    const images = []

    try {
      console.log("Attempting DALL-E generation...")
      const dalleImage = await generateWithDallE(basePrompt)
      images.push({
        url: `data:image/png;base64,${dalleImage}`,
        provider: "DALL-E",
      })
      console.log("DALL-E generation successful")
    } catch (error: any) {
      console.error("DALL-E generation failed:", error)
      images.push({
        url: "/placeholder.svg?height=1024&width=1024",
        provider: "DALL-E (Failed)",
        error: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      images,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("API route error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

