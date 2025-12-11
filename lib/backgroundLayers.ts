import { MAPTILER_STYLE_URL } from './constants'

export type BackgroundLayer = {
  id: string
  name: string
  tiles?: string
  tileSize?: number
  maxzoom?: number
  minzoom?: number
  attributionHtml?: string
  legendUrl?: string
  styleUrl?: string // For MapTiler style URLs
}

export const backgroundLayers: BackgroundLayer[] = [
  {
    id: 'maptiler',
    name: 'MapTiler Base',
    styleUrl: MAPTILER_STYLE_URL,
  },
  {
    id: 'areal2025',
    name: 'Berlin: Luftbilder 2025',
    tiles: 'https://tiles.codefor.de/berlin/geoportal/luftbilder/2025-dop20rgb/{z}/{x}/{y}.png',
    tileSize: 256,
    maxzoom: 21,
    minzoom: 10,
    attributionHtml:
      '<a target="_blank" href="https://gdi.berlin.de/geonetwork/srv/ger/catalog.search#/metadata/6529de5a-ca53-3eee-9d0d-aaae376ad483">Geoportal Berlin / Digitale farbige Orthophotos 2025 (DOP20RGBI)</a>',
  },
  {
    id: 'areal2025-summer',
    name: 'Berlin: Luftbilder 2025 Summer',
    tiles: 'https://tiles.codefor.de/berlin/geoportal/luftbilder/2025-truedop20rgb/{z}/{x}/{y}.png',
    tileSize: 256,
    maxzoom: 21,
    minzoom: 10,
    attributionHtml: 'Geoportal Berlin / Digitale farbige TrueOrthophotos 2025 (DOP20RGB)',
  },
  {
    id: 'areal2024',
    name: 'Berlin: Luftbilder 2024',
    tiles: 'https://tiles.codefor.de/berlin-2024-dop20rgbi/{z}/{x}/{y}.png',
    tileSize: 256,
    maxzoom: 21,
    minzoom: 10,
    attributionHtml:
      '<a target="_blank" href="https://gdi.berlin.de/geonetwork/srv/ger/catalog.search#/metadata/07ec4c16-723f-32ea-9580-411d8fe4f7e7">Geoportal Berlin / Digitale farbige TrueOrthophotos 2024 (DOP20RGB)</a>',
  },
  {
    id: 'brandenburg-dop20',
    name: 'Brandenburg GeoBasis-DE/LGB (latest) / DOP20c',
    tiles:
      'https://isk.geobasis-bb.de/mapproxy/dop20c/service/wms?FORMAT=image/png&TRANSPARENT=TRUE&VERSION=1.3.0&SERVICE=WMS&REQUEST=GetMap&LAYERS=bebb_dop20c&STYLES=&crs=EPSG:3857&WIDTH=512&HEIGHT=512&BBOX={bbox-epsg-3857}',
    maxzoom: 20,
    minzoom: 0,
    tileSize: 512,
    attributionHtml:
      'GeoBasis-DE/LGB / BB-BE DOP20c, dl-de/by-2-0; Geoportal Berlin / DOP20, dl-de/by-2-0',
    legendUrl: undefined,
  },
]
