import { useBackgroundLayer } from '../hooks/useBackgroundLayer'
import { backgroundLayers } from '../lib/backgroundLayers'

export function BackgroundLayerSelector() {
  const { backgroundLayerId, setBackgroundLayerId } = useBackgroundLayer()

  return (
    <div className="absolute top-4 right-4 z-10 rounded bg-white p-1 shadow-lg">
      <select
        value={backgroundLayerId}
        onChange={(e) => setBackgroundLayerId(e.target.value)}
        className="block rounded border border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
      >
        {backgroundLayers.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.name}
          </option>
        ))}
      </select>
    </div>
  )
}
