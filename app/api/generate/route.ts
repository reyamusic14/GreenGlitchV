import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 300 // 5 minutes

// Initialize OpenAI with runtime config
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  return new OpenAI({ apiKey })
}

async function generateWithStabilityAI(prompt: string) {
  if (!process.env.STABILITY_API_KEY) {
    throw new Error('STABILITY_API_KEY is not configured')
  }

  try {
    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt, weight: 1 }],
          cfg_scale: 7,
          steps: 30,
          width: 1024,
          height: 1024,
          samples: 1,
        }),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error('Stability AI error response:', text)
      throw new Error(`Stability AI error: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.artifacts?.[0]?.base64) {
      throw new Error('No image data received from Stability AI')
    }
    return data.artifacts[0].base64
  } catch (error: any) {
    console.error('Stability AI error:', error)
    throw new Error(error.message || 'Stability AI generation failed')
  }
}

async function generateWithDallE(prompt: string) {
  try {
    const openai = getOpenAIClient()
    console.log('Generating with DALL-E, prompt:', prompt)

    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    })

    console.log('DALL-E response received')

    if (!response.data?.[0]?.b64_json) {
      throw new Error('No image data received from DALL-E')
    }

    return response.data[0].b64_json
  } catch (error: any) {
    console.error('DALL-E error:', error)
    throw new Error(error.message || 'DALL-E generation failed')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { city, issue } = body

    if (!city || !issue) {
      return NextResponse.json(
        { 
          success: false,
          error: 'City and issue are required' 
        },
        { status: 400 }
      )
    }

    console.log('Generating images for:', { city, issue })

    const basePrompt = `Create a climate change awareness image showing the impact of ${issue} in ${city}. Style: realistic, dramatic lighting, emotional impact`

    let images = []

    // Try DALL-E first (since we know we have an OpenAI key)
    try {
      console.log('Attempting DALL-E generation...')
      const dalleImage = await generateWithDallE(basePrompt)
      images.push({
        url: `data:image/png;base64,${dalleImage}`,
        provider: 'DALL-E'
      })
      console.log('DALL-E generation successful')
    } catch (error: any) {
      console.error('DALL-E generation failed:', error)
      images.push({
        url: '/placeholder.svg?height=1024&width=1024',
        provider: 'DALL-E (Failed)',
        error: error.message
      })
    }

    // Then try Stability AI
    try {
      console.log('Attempting Stability AI generation...')
      const stabilityImage = await generateWithStabilityAI(basePrompt)
      images.push({
        url: `data:image/png;base64,${stabilityImage}`,
        provider: 'Stability AI'
      })
      console.log('Stability AI generation successful')
    } catch (error: any) {
      console.error('Stability AI generation failed:', error)
      images.push({
        url: '/placeholder.svg?height=1024&width=1024',
        provider: 'Stability AI (Failed)',
        error: error.message
      })
    }

    // Add placeholder for future provider
    images.push({
      url: '/placeholder.svg?height=1024&width=1024',
      provider: 'Future Provider'
    })

    console.log('Returning response with images:', images.length)

    return NextResponse.json({ 
      success: true,
      images,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
