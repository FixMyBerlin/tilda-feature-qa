type MapillaryEmbedProps = {
  imageId: string
  className?: string
  width?: string
  height?: string
}

export function MapillaryEmbed({
  imageId,
  className = 'w-full h-full',
  width = '100%',
  height = '100%',
}: MapillaryEmbedProps) {
  return (
    <iframe
      src={`https://www.mapillary.com/embed?image_key=${imageId}&style=photo`}
      width={width}
      height={height}
      frameBorder="0"
      allowFullScreen
      className={className}
      title={`Mapillary image ${imageId}`}
    />
  )
}
