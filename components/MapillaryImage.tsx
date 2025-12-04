import { useEffect, useState } from 'react'
import { MAPILLARY_ACCESS_TOKEN } from '../lib/constants'

type MapillaryImageProps = {
  imageId: string
  className?: string
}

type MapillaryImageData = {
  thumb_1024_url?: string
  thumb_2048_url?: string
  thumb_original_url?: string
}

export function MapillaryImage({ imageId, className = 'w-full' }: MapillaryImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchImageUrl = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `https://graph.mapillary.com/${imageId}?access_token=${MAPILLARY_ACCESS_TOKEN}&fields=thumb_1024_url,thumb_2048_url,thumb_original_url`,
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`)
        }

        const data: MapillaryImageData = await response.json()

        if (cancelled) return

        // Prefer 2048, fallback to 1024, then original
        const url = data.thumb_2048_url || data.thumb_1024_url || data.thumb_original_url

        if (!url) {
          throw new Error('No image URL available')
        }

        setImageUrl(url)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load image')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchImageUrl()

    return () => {
      cancelled = true
    }
  }, [imageId])

  if (loading) {
    return (
      <div className={`flex min-h-[400px] items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-gray-600">Loading image...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex min-h-[400px] items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    )
  }

  if (!imageUrl) {
    return null
  }

  return (
    <img
      src={imageUrl}
      alt={`Mapillary image ${imageId}`}
      className={`max-h-[600px] object-contain ${className}`}
    />
  )
}
