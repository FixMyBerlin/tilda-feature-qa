import { distance, point } from '@turf/turf'

/**
 * Sort features by connecting those with matching or nearby endpoints.
 * Simple and fast: check if line endpoints match or are very close.
 */
export function sortFeaturesBySpatialConnectivity(features: GeoJSON.Feature[]) {
  if (features.length === 0) return features

  // Build adjacency: connect features if their endpoints match or are very close
  const adjacencyMap = new Map<number, Set<number>>()
  const tolerance = 0.00005 // ~5 meters

  for (let i = 0; i < features.length; i++) {
    adjacencyMap.set(i, new Set())
  }

  for (let i = 0; i < features.length; i++) {
    const featureA = features[i]
    if (featureA.geometry.type !== 'LineString') continue
    const coordsA = featureA.geometry.coordinates as [number, number][]
    if (coordsA.length === 0) continue

    const startA = coordsA[0]
    const endA = coordsA[coordsA.length - 1]

    for (let j = i + 1; j < features.length; j++) {
      const featureB = features[j]
      if (featureB.geometry.type !== 'LineString') continue
      const coordsB = featureB.geometry.coordinates as [number, number][]
      if (coordsB.length === 0) continue

      const startB = coordsB[0]
      const endB = coordsB[coordsB.length - 1]

      const exactMatch =
        (startA[0] === startB[0] && startA[1] === startB[1]) ||
        (startA[0] === endB[0] && startA[1] === endB[1]) ||
        (endA[0] === startB[0] && endA[1] === startB[1]) ||
        (endA[0] === endB[0] && endA[1] === endB[1])

      if (exactMatch) {
        adjacencyMap.get(i)?.add(j)
        adjacencyMap.get(j)?.add(i)
        continue
      }

      const dist1 = distance(point(startA), point(startB))
      const dist2 = distance(point(startA), point(endB))
      const dist3 = distance(point(endA), point(startB))
      const dist4 = distance(point(endA), point(endB))

      if (Math.min(dist1, dist2, dist3, dist4) < tolerance) {
        adjacencyMap.get(i)?.add(j)
        adjacencyMap.get(j)?.add(i)
      }
    }
  }

  // Use DFS to find connected components
  const visited = new Set<number>()
  const components: number[][] = []

  function dfs(node: number, component: number[]) {
    visited.add(node)
    component.push(node)
    const neighbors = adjacencyMap.get(node) || new Set()
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, component)
      }
    }
  }

  for (let i = 0; i < features.length; i++) {
    if (!visited.has(i)) {
      const component: number[] = []
      dfs(i, component)
      components.push(component)
    }
  }

  components.sort((a, b) => b.length - a.length)

  const sortedFeatures: GeoJSON.Feature[] = []
  for (const component of components) {
    const componentFeatures = component
      .map((idx) => features[idx])
      .sort((a, b) => {
        const idA = a.properties?.id as string
        const idB = b.properties?.id as string
        return idA.localeCompare(idB)
      })
    sortedFeatures.push(...componentFeatures)
  }

  return sortedFeatures
}
