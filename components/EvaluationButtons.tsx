import { useEffect, useState } from 'react'
import { type EvaluationSource, evaluateFeature } from '../lib/db'
import { statusTranslation } from '../lib/translations'
import { useFeatureStore } from '../store/useFeatureStore'
import { SourceSelector } from './SourceSelector'

type EvaluationButtonsProps = {
  featureId: string
  featureProperties?: Record<string, unknown>
  initialEvaluation?: {
    status: 'good' | 'bad'
    comment?: string
    source?: EvaluationSource
    mapillaryId?: string
  } | null
  onEvaluated: () => void
}

export function EvaluationButtons({
  featureId,
  featureProperties,
  initialEvaluation,
  onEvaluated,
}: EvaluationButtonsProps) {
  const [comment, setComment] = useState(initialEvaluation?.comment || '')
  const [currentEvaluation, setCurrentEvaluation] = useState(initialEvaluation || null)
  const { selectedMapillaryId, setSelectedMapillaryId, source, setSource } = useFeatureStore()
  const [loading, setLoading] = useState(false)
  const [hasText, setHasText] = useState(!!initialEvaluation?.comment)

  const propMapillaryId = featureProperties?.mapillary_id as string | undefined
  const mapillaryId = selectedMapillaryId || propMapillaryId || undefined

  // Update local state when initialEvaluation prop changes (from parent)
  useEffect(() => {
    setCurrentEvaluation(initialEvaluation || null)
    setComment(initialEvaluation?.comment || '')
    setHasText(!!initialEvaluation?.comment)
    if (initialEvaluation?.mapillaryId) {
      setSelectedMapillaryId(initialEvaluation.mapillaryId)
    }
  }, [initialEvaluation, setSelectedMapillaryId])

  const handleSourceChange = (newSource: EvaluationSource, newMapillaryId?: string) => {
    setSource(newSource)
    if (newSource === 'mapillary' && newMapillaryId) {
      setSelectedMapillaryId(newMapillaryId)
    }
  }

  const handleEvaluate = async (status: 'good' | 'bad') => {
    setLoading(true)
    try {
      const finalMapillaryId = source === 'mapillary' ? mapillaryId : undefined
      await evaluateFeature(
        featureId,
        status,
        comment || undefined,
        source,
        finalMapillaryId || undefined,
      )
      setCurrentEvaluation({
        status,
        comment: comment || undefined,
        source,
        mapillaryId: finalMapillaryId || undefined,
      })
      onEvaluated()
    } catch (err) {
      console.error('Error evaluating feature:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setComment(value)
    if (value.length > 0 && !hasText) {
      setHasText(true)
    } else if (value.length === 0) {
      setHasText(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg bg-white p-4 shadow">
      {currentEvaluation && (
        <div
          className={`rounded p-2 text-sm ${
            currentEvaluation.status === 'good'
              ? 'border border-green-200 bg-green-50'
              : 'border border-red-200 bg-red-50'
          }`}
        >
          <span className="font-semibold">Current: </span>
          <span className={currentEvaluation.status === 'good' ? 'text-green-700' : 'text-red-700'}>
            {statusTranslation[currentEvaluation.status]}
          </span>
          {currentEvaluation.comment && (
            <div className="mt-1 text-gray-700">{currentEvaluation.comment}</div>
          )}
        </div>
      )}

      <SourceSelector
        featureId={featureId}
        currentSource={source}
        currentMapillaryId={mapillaryId}
        onSourceChange={handleSourceChange}
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleEvaluate('good')}
          disabled={loading}
          className={`flex-1 rounded px-4 py-2 font-semibold transition-colors ${
            currentEvaluation?.status === 'good'
              ? 'bg-green-600 text-white'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          } disabled:opacity-50`}
        >
          ✓ {statusTranslation.good}
        </button>
        <button
          type="button"
          onClick={() => handleEvaluate('bad')}
          disabled={loading}
          className={`flex-1 rounded px-4 py-2 font-semibold transition-colors ${
            currentEvaluation?.status === 'bad'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          } disabled:opacity-50`}
        >
          ✗ {statusTranslation.bad}
        </button>
      </div>

      <div className="mt-3">
        <textarea
          value={comment}
          onChange={handleCommentChange}
          placeholder="Comment (optional)..."
          className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          rows={hasText ? 10 : 1}
        />
      </div>
    </div>
  )
}
