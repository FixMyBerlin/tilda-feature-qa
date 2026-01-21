import { generateDiffFile } from '@git-diff-view/file'
import { DiffModeEnum, DiffView } from '@git-diff-view/react'
import { useEffect, useState } from 'react'
import '@git-diff-view/react/styles/diff-view.css'
import { getPropertyEvaluations, type PropertyEvaluation } from '../lib/db'

// Configuration: Properties starting with these prefixes will be hidden from evaluation
const EXCLUDED_PROPERTY_PREFIXES = ['tilda_']

type PropertyChange = {
  baseName: string
  oldValue: string | number | null
  newValue: string | number | null
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED'
}

type PropertyEvaluationTableProps = {
  feature: GeoJSON.Feature
  onPropertyEvaluationsChange: (evaluations: Record<string, PropertyEvaluation>) => void
}

function ValueDiff({
  oldValue,
  newValue,
  changeType,
}: {
  oldValue: string | number | null
  newValue: string | number | null
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED'
}) {
  let oldStr: string
  let newStr: string

  if (oldValue === null || oldValue === '') {
    // If oldValue is MISSING but newValue exists, it means the value was ADDED
    oldStr = changeType === 'ADDED' ? 'MISSING [ADDED]' : 'MISSING'
  } else {
    oldStr = String(oldValue)
  }

  if (newValue === null || newValue === '') {
    // If newValue is MISSING but oldValue exists, it means the value was REMOVED
    newStr = changeType === 'REMOVED' ? 'MISSING [REMOVED]' : 'MISSING'
  } else {
    newStr = String(newValue)
  }

  // Generate diff file using the library's generator
  const diffFile = generateDiffFile('old', oldStr, 'new', newStr, 'text', 'text')

  // Initialize and build diff lines
  diffFile.initTheme('light')
  diffFile.init()
  diffFile.buildUnifiedDiffLines()

  return (
    <div className="text-sm">
      <DiffView
        diffFile={diffFile}
        diffViewMode={DiffModeEnum.Unified}
        diffViewTheme="light"
        diffViewFontSize={12}
        diffViewHighlight={false}
        diffViewWrap={false}
        diffViewAddWidget={false}
      />
    </div>
  )
}

export function PropertyEvaluationTable({
  feature,
  onPropertyEvaluationsChange,
}: PropertyEvaluationTableProps) {
  const [propertyChanges, setPropertyChanges] = useState<PropertyChange[]>([])
  const [evaluations, setEvaluations] = useState<Record<string, PropertyEvaluation>>({})
  const [loading, setLoading] = useState(true)

  // Detect all properties matching *_OLD and *_NEW pattern
  useEffect(() => {
    const props = feature.properties || {}
    const changes: PropertyChange[] = []
    const baseNames = new Set<string>()

    // Find all base names
    for (const key of Object.keys(props)) {
      if (key.endsWith('_OLD')) {
        baseNames.add(key.slice(0, -4))
      } else if (key.endsWith('_NEW')) {
        baseNames.add(key.slice(0, -4))
      }
    }

    // Create PropertyChange objects
    for (const baseName of baseNames) {
      // Skip properties with excluded prefixes
      const isExcluded = EXCLUDED_PROPERTY_PREFIXES.some(prefix => 
        baseName.toLowerCase().startsWith(prefix.toLowerCase())
      )
      if (isExcluded) {
        continue
      }

      const oldKey = `${baseName}_OLD`
      const newKey = `${baseName}_NEW`
      const oldValue = props[oldKey] !== undefined ? props[oldKey] : null
      const newValue = props[newKey] !== undefined ? props[newKey] : null

      let changeType: 'MODIFIED' | 'ADDED' | 'REMOVED'
      if (oldValue !== null && newValue !== null) {
        changeType = 'MODIFIED'
      } else if (oldValue === null && newValue !== null) {
        changeType = 'ADDED'
      } else {
        changeType = 'REMOVED'
      }

      changes.push({
        baseName,
        oldValue,
        newValue,
        changeType,
      })
    }

    setPropertyChanges(changes)
  }, [feature])

  // Load existing evaluations
  useEffect(() => {
    const loadEvaluations = async () => {
      const featureId = feature.properties?.id as string
      if (!featureId) {
        setLoading(false)
        return
      }

      const existing = await getPropertyEvaluations(featureId)
      // Initialize missing evaluations with 'wrong' as default
      const props = feature.properties || {}
      const baseNames = new Set<string>()
      for (const key of Object.keys(props)) {
        if (key.endsWith('_OLD')) {
          baseNames.add(key.slice(0, -4))
        } else if (key.endsWith('_NEW')) {
          baseNames.add(key.slice(0, -4))
        }
      }
      const initialized: Record<string, PropertyEvaluation> = {}
      for (const baseName of baseNames) {
        // Skip properties with excluded prefixes
        const isExcluded = EXCLUDED_PROPERTY_PREFIXES.some(prefix => 
          baseName.toLowerCase().startsWith(prefix.toLowerCase())
        )
        if (isExcluded) {
          continue
        }
        initialized[baseName] = existing[baseName] || { status: 'ok' }
      }
      setEvaluations(initialized)
      onPropertyEvaluationsChange(initialized)
      setLoading(false)
    }

    loadEvaluations()
  }, [feature, onPropertyEvaluationsChange])

  const handleStatusChange = (baseName: string, status: 'ok' | 'wrong') => {
    const newEvaluations = {
      ...evaluations,
      [baseName]: {
        ...evaluations[baseName],
        status,
      },
    }
    setEvaluations(newEvaluations)
    onPropertyEvaluationsChange(newEvaluations)
  }

  const handleCommentChange = (baseName: string, comment: string) => {
    const currentEvaluation = evaluations[baseName] || { status: 'ok' as const }
    const newEvaluations = {
      ...evaluations,
      [baseName]: {
        ...currentEvaluation,
        status: comment.trim() ? 'wrong' : currentEvaluation.status,
        comment: comment || undefined,
      },
    }
    setEvaluations(newEvaluations)
    onPropertyEvaluationsChange(newEvaluations)
  }

  if (loading) {
    return <div className="text-gray-600">Loading evaluations...</div>
  }

  if (propertyChanges.length === 0) {
    return (
      <div className="rounded-lg bg-white p-4 shadow">
        <p className="text-gray-600">No properties with _OLD/_NEW pattern found in this feature.</p>
        <details className="mt-4 rounded bg-gray-50">
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

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right font-semibold text-gray-700 text-sm">Key</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">
                Value Diff
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Action</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {propertyChanges.map((change, index) => {
              const evaluation = evaluations[change.baseName] || { status: 'ok' as const }
              const tabIndexBase = index * 3 + 1

              return (
                <tr key={change.baseName}>
                  <td className="px-4 py-3 text-right">
                    <code className="inline-block rounded bg-gray-100 px-2 py-1 font-medium text-gray-900 text-sm">
                      {change.baseName}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <ValueDiff
                      oldValue={change.oldValue}
                      newValue={change.newValue}
                      changeType={change.changeType}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-4" role="radiogroup">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`status-${change.baseName}`}
                          value="ok"
                          checked={evaluation.status === 'ok'}
                          onChange={() => handleStatusChange(change.baseName, 'ok')}
                          tabIndex={tabIndexBase}
                          className="size-4"
                        />
                        <span className="text-gray-700 text-sm">CORRECT</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`status-${change.baseName}`}
                          value="wrong"
                          checked={evaluation.status === 'wrong'}
                          onChange={() => handleStatusChange(change.baseName, 'wrong')}
                          tabIndex={tabIndexBase + 1}
                          className="size-4"
                        />
                        <span className="text-gray-700 text-sm">WRONG</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      value={evaluation.comment || ''}
                      onChange={(e) => handleCommentChange(change.baseName, e.target.value)}
                      placeholder="Optional comment..."
                      rows={2}
                      tabIndex={tabIndexBase + 2}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
