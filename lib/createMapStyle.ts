import type { BackgroundLayer } from './backgroundLayers'

/**
 * Creates a MapLibre style from a background layer.
 * Returns a style URL string for styleUrl layers, or a style object for raster tile layers.
 */
export function createMapStyleFromLayer(layer: BackgroundLayer) {
  // Style URL layers (e.g., MapTiler): return URL directly, MapLibre fetches the style JSON
  if (layer.styleUrl) {
    return layer.styleUrl
  }

  // Raster tile layers (e.g., aerial imagery): create a style object with raster source and layer
  if (!layer.tiles) {
    return { version: 8, sources: {}, layers: [] }
  }

  return {
    version: 8,
    sources: {
      background: {
        type: 'raster',
        tiles: [layer.tiles], // URL pattern with {z}/{x}/{y} placeholders
        tileSize: layer.tileSize || 256,
        minzoom: layer.minzoom || 0,
        maxzoom: layer.maxzoom || 22,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'raster',
        source: 'background',
      },
    ],
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  }
}
