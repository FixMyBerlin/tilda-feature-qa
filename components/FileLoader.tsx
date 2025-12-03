import { useEffect, useState } from 'react'
import { loadFeatures } from '../lib/db'
import { validateGeoJSON } from '../lib/geojson-schema'

export function FileLoader({ onLoad }: { onLoad: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbAvailable, setDbAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if IndexedDB is available
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

      // Strip git diff header if present (lines starting with @)
      if (text.trim().startsWith('@')) {
        console.log('Detected git diff format, stripping header...')
        const lines = text.split('\n')
        // Find the first line that starts with { (the actual JSON)
        const jsonStartIndex = lines.findIndex((line) => line.trim().startsWith('{'))
        if (jsonStartIndex > 0) {
          text = lines.slice(jsonStartIndex).join('\n')
        }
      }

      console.log('File read, parsing JSON...')
      const parsed = JSON.parse(text)

      // Validate with Zod
      const geojson = validateGeoJSON(parsed)

      console.log(`Loading ${geojson.features.length} features into IndexedDB...`)
      await loadFeatures(geojson)
      console.log('Features loaded successfully')
      // Reset file input
      if (e.target) {
        e.target.value = ''
      }
      onLoad()
    } catch (err) {
      console.error('Error loading file:', err)
      setError(err instanceof Error ? err.message : 'Failed to load file')
      // Reset file input on error too
      if (e.target) {
        e.target.value = ''
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 font-bold text-2xl">Load GeoJSON File</h1>
        <p className="mb-6 text-gray-600">Select a GeoJSON file to load features for review.</p>
        <div className="space-y-4">
          <label className="block">
            <span className="sr-only">Choose file</span>
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
