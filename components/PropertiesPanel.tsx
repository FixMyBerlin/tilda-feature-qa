import { useEffect, useState } from 'react'
import { getEvaluation } from '../lib/db'
import { Mapillary } from './Mapillary'

type PropertiesPanelProps = {
  feature: GeoJSON.Feature
}

export function PropertiesPanel({ feature }: PropertiesPanelProps) {
  const [evaluation, setEvaluation] = useState<{
    status: 'good' | 'bad'
    comment?: string
  } | null>(null)
  const featureId = feature.properties?.id as string

  useEffect(() => {
    if (featureId) {
      getEvaluation(featureId).then((evalData) => {
        if (evalData) {
          setEvaluation({
            status: evalData.status,
            comment: evalData.comment,
          })
        } else {
          setEvaluation(null)
        }
      })
    }
  }, [featureId])

  const linkKeys = Object.keys(feature.properties || {}).filter((key) => key.endsWith('_link'))

  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow">
      {evaluation && (
        <div
          className={`rounded p-3 ${
            evaluation.status === 'good'
              ? 'border border-green-200 bg-green-50'
              : 'border border-red-200 bg-red-50'
          }`}
        >
          <div className="font-semibold text-sm">
            Status:{' '}
            <span className={evaluation.status === 'good' ? 'text-green-700' : 'text-red-700'}>
              {evaluation.status === 'good' ? '✓ Good' : '✗ Bad'}
            </span>
          </div>
          {evaluation.comment && (
            <div className="mt-1 text-gray-700 text-sm">{evaluation.comment}</div>
          )}
        </div>
      )}

      {linkKeys.length > 0 && (
        <div className="space-y-1">
          {linkKeys.map((key) => {
            const url = feature.properties?.[key] as string | null
            if (!url) return null
            return (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded bg-blue-50 px-3 py-2 text-blue-700 text-sm transition-colors hover:bg-blue-100"
              >
                {key
                  .replace('_link', '')
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </a>
            )
          })}
        </div>
      )}

      <Mapillary
        key={feature.properties?.id}
        mapillaryId={feature.properties?.mapillary_id}
        geometry={feature.geometry}
      />

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
