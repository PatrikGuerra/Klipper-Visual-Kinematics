import type { DimensionLayerId, DimensionLayers } from './types';

export const dimensionLayerIds: DimensionLayerId[] = [
  'bedPhysicalSize',
  'usableBed',
  'usableBedOffset',
  'travelLimits',
  'meshBounds',
  'probeOffset',
  'screwPositions'
];

export const dimensionLayerLabels: Record<DimensionLayerId, string> = {
  bedPhysicalSize: 'Bed Physical Size',
  usableBed: 'Usable Bed',
  usableBedOffset: 'Usable Bed Offset',
  travelLimits: 'Travel Limits',
  meshBounds: 'Mesh Bounds',
  probeOffset: 'Probe Offset',
  screwPositions: 'Screw Positions'
};

export function createDefaultDimensionLayers(): DimensionLayers {
  return {
    bedPhysicalSize: false,
    usableBed: false,
    usableBedOffset: false,
    travelLimits: false,
    meshBounds: false,
    probeOffset: false,
    screwPositions: false
  };
}

export function createLegacyDimensionLayers(): DimensionLayers {
  return {
    ...createDefaultDimensionLayers(),
    bedPhysicalSize: true,
    usableBed: true,
    usableBedOffset: true
  };
}

export function areDimensionLayersActive(layers: DimensionLayers): boolean {
  return dimensionLayerIds.some((id) => layers[id]);
}

export function normalizeDimensionLayers(value: unknown, legacyShowDimensions = false): DimensionLayers {
  const defaults = legacyShowDimensions ? createLegacyDimensionLayers() : createDefaultDimensionLayers();
  if (!value || typeof value !== 'object') return defaults;
  const candidate = value as Partial<Record<DimensionLayerId, unknown>>;
  return dimensionLayerIds.reduce<DimensionLayers>((layers, id) => {
    layers[id] = typeof candidate[id] === 'boolean' ? candidate[id] : defaults[id];
    return layers;
  }, { ...defaults });
}
