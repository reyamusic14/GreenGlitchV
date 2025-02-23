'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, Facebook, Instagram, Twitter } from 'lucide-react'
import Image from "next/image"
import { toast } from "@/components/ui/use-toast"

const climateIssues = {
  "New York": ["Sea Level Rise", "Urban Heat Island", "Air Pollution"],
  London: ["Flooding", "Air Quality", "Heat Waves"],
  Tokyo: ["Typhoons", "Urban Flooding", "Heat Stress"],
  Mumbai: ["Monsoon Flooding", "Coastal Erosion", "Air Pollution"],
}

interface GeneratedImage {
  url: string
  provider: string
  error?: string
}

export default function GreenGitch() {
  const [selectedCity, setSelectedCity] = useState("")
  const [selectedIssue, setSelectedIssue] = useState("")
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerateImages = async () => {
    setIsLoading(true)
    setGeneratedImages([])

    try {
      console.log('Starting image generation...')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: selectedCity,
          issue: selectedIssue,
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Server error response:', errorText)
        throw new Error('Failed to generate images')
      }

      let data
      try {
        data = await response.json()
      } catch (e) {
        console.error('Failed to parse response:', e)
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate images')
      }

      console.log('Received images:', data.images)
      setGeneratedImages(data.images)

      const successfulImages = data.images.filter((img: GeneratedImage) => !img.error)
      if (successfulImages.length > 0) {
        toast({
          title: "Success",
          description: `Generated ${successfulImages.length} image(s) successfully.`,
        })
      } else {
        toast({
          title: "Warning",
          description: "Could not generate any images. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('Error during image generation:', error)
      if (error.name === 'AbortError') {
        toast({
          title: "Timeout",
          description: "Request took too long. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to generate images",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (imageUrl: string) => {
    if (imageUrl.includes('placeholder.svg')) {
      toast({
        title: "Cannot Download",
        description: "This is a placeholder image.",
        variant: "destructive",
      })
      return
    }

    try {
      // For base64 images
      if (imageUrl.startsWith('data:image')) {
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = `climate-awareness-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // For regular URLs
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `climate-awareness-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
      }

      toast({
        title: "Success",
        description: "Image downloaded successfully.",
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Error",
        description: "Failed to download image.",
        variant: "destructive",
      })
    }
  }

  const handleShare = (platform: string, imageUrl: string) => {
    if (imageUrl.includes('placeholder.svg')) {
      toast({
        title: "Cannot Share",
        description: "This is a placeholder image.",
        variant: "destructive",
      })
      return
    }

    const text = `Check out this climate change awareness image for ${selectedCity}'s ${selectedIssue} issue!`
    const url = encodeURIComponent(window.location.href)

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      instagram: `https://instagram.com`,
    }

    window.open(shareUrls[platform as keyof typeof shareUrls], '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 p-4">
      <Card className="max-w-md mx-auto bg-white/80 backdrop-blur">
        <CardContent className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-center text-green-800 mb-6">GreenGitch</h1>

          <div className="space-y-4">
            <Select
              onValueChange={(value) => {
                setSelectedCity(value)
                setSelectedIssue("")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a city" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(climateIssues).map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              onValueChange={setSelectedIssue} 
              disabled={!selectedCity}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select climate issue" />
              </SelectTrigger>
              <SelectContent>
                {selectedCity && climateIssues[selectedCity as keyof typeof climateIssues].map((issue) => (
                  <SelectItem key={issue} value={issue}>{issue}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleGenerateImages}
              disabled={!selectedCity || !selectedIssue || isLoading}
            >
              {isLoading ? "Generating..." : "Generate Awareness Images"}
            </Button>
          </div>

          <div className="space-y-6">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="w-full h-[300px] rounded-lg" />
              ))
            ) : (
              generatedImages.map((image, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden">
                    <Image
                      src={image.url || "/placeholder.svg"}
                      alt={`Climate awareness image by ${image.provider}`}
                      width={400}
                      height={300}
                      className="w-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {image.provider}
                    </div>
                    {image.error && (
                      <div className="absolute bottom-2 right-2 bg-red-500/50 text-white px-2 py-1 rounded text-sm">
                        {image.error}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(image.url)}
                      disabled={image.url.includes('placeholder.svg')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleShare('twitter', image.url)}
                      disabled={image.url.includes('placeholder.svg')}
                    >
                      <Twitter className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleShare('facebook', image.url)}
                      disabled={image.url.includes('placeholder.svg')}
                    >
                      <Facebook className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleShare('instagram', image.url)}
                      disabled={image.url.includes('placeholder.svg')}
                    >
                      <Instagram className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
