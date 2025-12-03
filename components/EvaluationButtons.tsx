import { useEffect, useState } from 'react'
import { evaluateFeature, getEvaluation, type EvaluationSource } from '../lib/db'
import { statusTranslation } from '../lib/translations'
import { useFeatureStore } from '../store/useFeatureStore'
import { SourceSelector } from './SourceSelector'

type EvaluationButtonsProps = {
  featureId: string
  featureProperties?: Record<string, unknown>
  onEvaluated: () => void
}

export function EvaluationButtons({
  featureId,
  featureProperties,
  onEvaluated,
}: EvaluationButtonsProps) {
  const [comment, setComment] = useState('')
  const [currentEvaluation, setCurrentEvaluation] = useState<{
    status: 'good' | 'bad'
    comment?: string
    source?: EvaluationSource
    mapillaryId?: string
  } | null>(null)
  const { selectedMapillaryId, setSelectedMapillaryId } = useFeatureStore()
  const [loading, setLoading] = useState(false)
  const [hasText, setHasText] = useState(false)
  const [source, setSource] = useState<EvaluationSource>('aerial_imagery')

  // Prioritize selectedMapillaryId from store (user's current selection) over feature property
  // The feature property is only used as a fallback/default when nothing is selected
  const propMapillaryId = featureProperties?.mapillary_id as string | undefined
  const mapillaryId = selectedMapillaryId || propMapillaryId || undefined

  useEffect(() => {
    if (featureId) {
      getEvaluation(featureId).then((evalData) => {
        if (evalData) {
          setCurrentEvaluation({
            status: evalData.status,
            comment: evalData.comment,
            source: evalData.source,
            mapillaryId: evalData.mapillaryId,
          })
          setComment(evalData.comment || '')
          // If evaluation has mapillary ID, use 'mapillary' source, otherwise use saved source
          setSource(evalData.mapillaryId ? 'mapillary' : (evalData.source || 'aerial_imagery'))
          if (evalData.mapillaryId) {
            setSelectedMapillaryId(evalData.mapillaryId)
          }
        } else {
          setCurrentEvaluation(null)
          setComment('')
          setHasText(false)
          // If feature has mapillary_id property, default to 'mapillary' source
          setSource(mapillaryId ? 'mapillary' : 'aerial_imagery')
        }
      })
    }
  }, [featureId, setSelectedMapillaryId, mapillaryId])

  // Automatically set source to 'mapillary' when mapillary ID becomes available and there's no evaluation
  // This handles the case when user clicks a new mapillary image
  useEffect(() => {
    if (mapillaryId && !currentEvaluation) {
      setSource('mapillary')
    }
  }, [mapillaryId, currentEvaluation])

  const handleSourceChange = (newSource: EvaluationSource, newMapillaryId?: string) => {
    setSource(newSource)
    if (newSource === 'mapillary' && newMapillaryId) {
      setSelectedMapillaryId(newMapillaryId)
    } else if (newSource !== 'mapillary') {
      // Don't clear store, just don't use it for non-mapillary sources
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
