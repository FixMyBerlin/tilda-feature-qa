import { useEffect, useState } from 'react'
import { loadFeatures } from '../lib/db'
import { validateGeoJSON } from '../lib/geojson-schema'

export function FileLoader({ onLoad }: { onLoad: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbAvailable, setDbAvailable] = useState<boolean | null>(null)
  const [regionSlug, setRegionSlug] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      setDbAvailable(true)
    } else {
      setDbAvailable(false)
      setError('IndexedDB is not available in this browser')
    }
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      console.log('No file selected')
      return
    }

    console.log('File selected:', file.name)
    setLoading(true)
    setError(null)

    try {
      console.log('Reading file...')
      let text = await file.text()

      if (text.trim().startsWith('@')) {
        console.log('Detected git diff format, stripping header...')
        const lines = text.split('\n')
        const jsonStartIndex = lines.findIndex((line) => line.trim().startsWith('{'))
        if (jsonStartIndex > 0) {
          text = lines.slice(jsonStartIndex).join('\n')
        }
      }

      console.log('File read, parsing JSON...')
      const parsed = JSON.parse(text)

      if (!regionSlug.trim()) {
        throw new Error('Please enter a TILDA Region Slug')
      }

      const geojson = validateGeoJSON(parsed)

      console.log(`Loading ${geojson.features.length} features into IndexedDB...`)
      await loadFeatures(geojson, regionSlug.trim())
      console.log('Features loaded successfully')
      if (e.target) {
        e.target.value = ''
      }
      onLoad()
    } catch (err) {
      console.error('Error loading file:', err)
      setError(err instanceof Error ? err.message : 'Failed to load file')
      if (e.target) {
        e.target.value = ''
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-xl rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 font-bold text-2xl">Load GeoJSON File</h1>
        <p className="mb-6 text-gray-600">Select a GeoJSON file to load features for review.</p>

        <div className="prose prose-sm mb-6 max-w-none">
          <h3 className="font-semibold text-lg">File Format Requirements</h3>
          <ul>
            <li>
              <strong>Geometry types:</strong> Only LineString or MultiLineString features are
              supported
            </li>
            <li>
              <strong>Required property:</strong> Each feature must have an <code>id</code> property
              (string or number)
            </li>
            <li>
              <strong>Optional property:</strong> <code>osm_id</code> in format <code>way/123</code>
              , <code>node/456</code>, or <code>relation/789</code>
            </li>
            <li>
              <strong>Special properties:</strong> Properties ending with <code>_OLD</code> and{' '}
              <code>_NEW</code> are used for evaluation (e.g., <code>highway_name_OLD</code> and{' '}
              <code>highway_name_NEW</code>)
            </li>
            <li>
              <strong>Other properties:</strong> Any additional properties as string or number
              values
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block font-medium text-gray-700">TILDA Region Slug</span>
            <input
              type="text"
              value={regionSlug}
              onChange={(e) => setRegionSlug(e.target.value)}
              placeholder="e.g., infravelo"
              disabled={loading || dbAvailable === false}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="mt-1 text-gray-500 text-sm">
              The region slug used in TILDA URLs (e.g., "infravelo" for{' '}
              <code>tilda-geo.de/regionen/infravelo</code>)
            </p>
          </label>

          <label className="block">
            <span className="mb-2 block font-medium text-gray-700">GeoJSON File</span>
            <input
              type="file"
              accept=".geojson,.json"
              onChange={handleFileChange}
              disabled={loading || dbAvailable === false}
              className="block w-full text-gray-500 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 file:text-sm hover:file:bg-blue-100 disabled:opacity-50"
            />
          </label>

          {loading && <div className="font-medium text-blue-600">Loading features...</div>}
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-red-600">
              <strong>Error:</strong> {error}
            </div>
          )}
          {!loading && !error && (
            <div className="text-gray-500 text-sm">Select a .geojson or .json file to begin</div>
          )}
        </div>
      </div>
    </div>
  )
}
