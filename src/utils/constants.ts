import { KilnConfig, KilnType } from '../types';

export const KILNS: Record<KilnType, KilnConfig> = {
  big: {
    name: 'Large (old)',
    dimensions: { width: 60, depth: 90, height: 80 },
    offset: 3,
    workingArea: { width: 54, depth: 84, height: 80 },
    coefficient: 0.8,
    multiLevel: true,
  },
  small: {
    name: 'Small (new)',
    dimensions: { width: 100, depth: 160 },
    offset: 0,
    workingArea: { width: 100, depth: 160 },
    coefficient: 0.92,
    multiLevel: false,
  },
};

// Calculation constants
export const TILE_GAP = 1.2; // cm - distance between tiles
export const AIR_GAP = 2; // cm - air gap
export const SHELF_THICKNESS = 3; // cm - shelf thickness
export const FLAT_ON_EDGE_COEFFICIENT = 0.3; // coefficient for flat tiles on top of edge

// Maximum filler area in small kiln
export const MAX_FILLER_AREA = 2.0; // m²
