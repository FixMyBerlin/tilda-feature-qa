import { NuqsAdapter } from 'nuqs/adapters/react'
import { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { FeatureViewer } from './components/FeatureViewer'
import { FileLoader } from './components/FileLoader'
import { getAllFeatures } from './lib/db'
import './styles/output.css'

function App() {
  const [hasFeatures, setHasFeatures] = useState<boolean | null>(null)

  const checkFeatures = useCallback(async () => {
    const features = await getAllFeatures()
    setHasFeatures(features.length > 0)
  }, [])

  useEffect(() => {
    checkFeatures()
  }, [checkFeatures])

  const handleLoad = () => {
    setHasFeatures(true)
  }

  if (hasFeatures === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <NuqsAdapter>
      {hasFeatures ? <FeatureViewer /> : <FileLoader onLoad={handleLoad} />}
    </NuqsAdapter>
  )
}

const rootElement = document.getElementById('root')
if (rootElement) {
  const root = createRoot(rootElement)
  root.render(<App />)
}

export default App
