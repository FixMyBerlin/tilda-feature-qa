import { useEffect, useState } from 'react'
import { evaluateFeature, getEvaluation } from '../lib/db'

type EvaluationButtonsProps = {
  featureId: string
  onEvaluated: () => void
}

export function EvaluationButtons({ featureId, onEvaluated }: EvaluationButtonsProps) {
  const [comment, setComment] = useState('')
  const [currentEvaluation, setCurrentEvaluation] = useState<{
    status: 'good' | 'bad'
    comment?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasText, setHasText] = useState(false)

  useEffect(() => {
    if (featureId) {
      getEvaluation(featureId).then((evalData) => {
        if (evalData) {
          setCurrentEvaluation({
            status: evalData.status,
            comment: evalData.comment,
          })
          setComment(evalData.comment || '')
        } else {
          setCurrentEvaluation(null)
          setComment('')
          setHasText(false)
        }
      })
    }
  }, [featureId])

  const handleEvaluate = async (status: 'good' | 'bad') => {
    setLoading(true)
    try {
      await evaluateFeature(featureId, status, comment || undefined)
      setCurrentEvaluation({ status, comment: comment || undefined })
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
            {currentEvaluation.status === 'good' ? 'Good' : 'Bad'}
          </span>
          {currentEvaluation.comment && (
            <div className="mt-1 text-gray-700">{currentEvaluation.comment}</div>
          )}
        </div>
      )}

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
          ✓ Good
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
          ✗ Bad
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
