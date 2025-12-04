import type { EvaluationSource } from '../lib/db'
import { useFeatureStore } from '../store/useFeatureStore'

type SourceSelectorProps = {
  featureId: string
  currentSource?: EvaluationSource
  currentMapillaryId?: string
  onSourceChange: (source: EvaluationSource, mapillaryId?: string) => void
}

export function SourceSelector({
  featureId,
  currentSource = 'aerial_imagery',
  currentMapillaryId,
  onSourceChange,
}: SourceSelectorProps) {
  const { selectedMapillaryId } = useFeatureStore()
  const mapillaryId = selectedMapillaryId || currentMapillaryId
  const hasMapillaryId = !!mapillaryId

  const handleSourceChange = (newSource: EvaluationSource) => {
    if (newSource === 'mapillary') {
      onSourceChange(newSource, mapillaryId)
    } else {
      onSourceChange(newSource)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <span className="font-medium text-gray-700 text-sm">Source:</span>
      <div className="flex gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={`source-${featureId}`}
            value="aerial_imagery"
            checked={currentSource === 'aerial_imagery'}
            onChange={() => handleSourceChange('aerial_imagery')}
            className="size-4 text-blue-600"
          />
          <span className="text-sm">Aerial Imagery</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={`source-${featureId}`}
            value="mapillary"
            checked={currentSource === 'mapillary'}
            onChange={() => handleSourceChange('mapillary')}
            disabled={!hasMapillaryId}
            className="size-4 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="text-sm">
            Mapillary
            {hasMapillaryId && (
              <span className="whitespace-nowrap text-gray-500"> ({mapillaryId})</span>
            )}
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={`source-${featureId}`}
            value="other"
            checked={currentSource === 'other'}
            onChange={() => handleSourceChange('other')}
            className="size-4 text-blue-600"
          />
          <span className="text-sm">Other</span>
        </label>
      </div>
    </div>
  )
}
