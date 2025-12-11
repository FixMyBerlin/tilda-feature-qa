import type { GeoJSON } from 'geojson'
import { useEffect, useState } from 'react'
import { type EvaluationSource, evaluateFeature, type PropertyEvaluation } from '../lib/db'
import { useFeatureStore } from '../store/useFeatureStore'
import { PropertyEvaluationTable } from './PropertyEvaluation'
import { SourceSelector } from './SourceSelector'

type EvaluationButtonsProps = {
  feature: GeoJSON.Feature
  initialEvaluation?: {
    source?: EvaluationSource
    mapillaryId?: string
    propertyEvaluations?: Record<string, PropertyEvaluation>
  } | null
  onEvaluated: () => void
  onPrev?: () => void
  onNext?: () => void
  canNavigate?: boolean
  isEvaluated?: boolean
}

export function EvaluationButtons({
  feature,
  initialEvaluation,
  onEvaluated,
  onPrev,
  onNext,
  canNavigate = false,
  isEvaluated = false,
}: EvaluationButtonsProps) {
  const featureId = feature.properties?.id as string
  const [propertyEvaluations, setPropertyEvaluations] = useState<
    Record<string, PropertyEvaluation>
  >(initialEvaluation?.propertyEvaluations || {})
  const { selectedMapillaryId, setSelectedMapillaryId, source, setSource } = useFeatureStore()
  const [loading, setLoading] = useState(false)

  const propMapillaryId = feature.properties?.mapillary_id as string | undefined
  const mapillaryId = selectedMapillaryId || propMapillaryId || undefined

  // Update local state when initialEvaluation prop changes (from parent)
  useEffect(() => {
    if (initialEvaluation?.propertyEvaluations) {
      setPropertyEvaluations(initialEvaluation.propertyEvaluations)
    }
    if (initialEvaluation?.mapillaryId) {
      setSelectedMapillaryId(initialEvaluation.mapillaryId)
    }
    if (initialEvaluation?.source) {
      setSource(initialEvaluation.source)
    }
  }, [initialEvaluation, setSelectedMapillaryId, setSource])

  const handleSourceChange = (newSource: EvaluationSource, newMapillaryId?: string) => {
    setSource(newSource)
    if (newSource === 'mapillary' && newMapillaryId) {
      setSelectedMapillaryId(newMapillaryId)
    }
  }

  const handleSave = async () => {
    if (!featureId) return

    setLoading(true)
    try {
      const finalMapillaryId = source === 'mapillary' ? mapillaryId : undefined
      await evaluateFeature(featureId, source, propertyEvaluations, finalMapillaryId || undefined)
      onEvaluated()
    } catch (err) {
      console.error('Error evaluating feature:', err)
    } finally {
      setLoading(false)
    }
  }

  const hasEvaluations = Object.keys(propertyEvaluations).length > 0

  return (
    <div className="space-y-4 rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <SourceSelector
          featureId={featureId}
          currentSource={source}
          currentMapillaryId={mapillaryId}
          onSourceChange={handleSourceChange}
        />
        {isEvaluated && hasEvaluations ? (
          <span className="rounded bg-green-100 px-2 py-1 text-green-700 text-sm">Evaluated</span>
        ) : (
          <span className="rounded bg-gray-100 px-2 py-1 text-gray-600 text-sm">
            Not yet evaluated
          </span>
        )}
      </div>

      <PropertyEvaluationTable
        feature={feature}
        onPropertyEvaluationsChange={setPropertyEvaluations}
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="flex-1 rounded bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Evaluation
        </button>
        {canNavigate && onPrev && (
          <button
            type="button"
            onClick={onPrev}
            disabled={loading}
            className="rounded bg-gray-200 px-2 py-2 text-gray-700 text-xs transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Prev
          </button>
        )}
        {canNavigate && onNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={loading}
            className="rounded bg-gray-200 px-2 py-2 text-gray-700 text-xs transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        )}
      </div>

      <details className="rounded bg-gray-50">
        <summary className="cursor-pointer px-3 py-2 font-semibold text-gray-700 text-sm hover:bg-gray-100">
          All Properties
        </summary>
        <div className="max-h-96 overflow-y-auto p-3">
          <pre className="whitespace-pre-wrap text-gray-700 text-xs">
            {JSON.stringify(feature.properties, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  )
}
