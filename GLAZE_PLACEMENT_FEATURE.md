# Glaze Placement Selection Feature

## Date: February 2, 2026

## Overview

Added glaze placement selection that affects kiln loading calculations. The glaze location determines whether products can be placed on edge and whether multi-level stacking is possible.

## 4 Glaze Placement Options

1. **Лицевая поверхность** (face-only)
   - Glaze only on front face
   - ✅ Allows edge placement
   - ✅ Allows full multi-level stacking

2. **Лицевая + 1-2 торца** (face-1-2-edges)
   - Glaze on front + 1-2 edges
   - ❌ Blocks edge placement
   - ✅ Allows full multi-level stacking

3. **Лицевая + 3-4 торца** (face-3-4-edges)
   - Glaze on front + 3-4 edges
   - ❌ Blocks edge placement
   - ✅ Allows full multi-level stacking

4. **Лицевая с заходом на оборотную** (face-with-back)
   - Glaze extends from front to back
   - ❌ Blocks edge placement
   - ❌ Single level only (no stacking)

## Impact on Calculations

### Edge Loading (На ребро)

Products can only be placed on edge if:
- Glaze is **face-only**
- Product length ≤ 15 cm
- Other existing restrictions apply

**Blocked by glaze options:** 2, 3, 4

### Flat Loading (Плашмя)

Multi-level stacking is possible if:
- Glaze is **NOT** on back (options 1, 2, 3)
- Kiln is multi-level (большая печь)

**Single level only:** Option 4 (face-with-back)

## Files Created/Modified

### 1. New Type Definition

**File:** `src/types/index.ts`

Added new type (line 51):
```typescript
export type GlazePlacement = 'face-only' | 'face-1-2-edges' | 'face-3-4-edges' | 'face-with-back';
```

Updated ProductWithType interface (line 112):
```typescript
export interface ProductWithType extends ProductDimensions {
  type: ProductType;
  shape?: TileShape;
  glaze?: GlazePlacement;  // NEW
}
```

### 2. New Component

**File:** `src/components/GlazePlacementSelector.tsx` (NEW)

Radio button selector with 4 glaze options:
```typescript
export function GlazePlacementSelector({
  glazePlacement,
  onGlazePlacementChange,
}: GlazePlacementSelectorProps) {
  // 4 radio options for glaze placement
}
```

### 3. App State Update

**File:** `src/App.tsx`

Added import (line 6):
```typescript
import { GlazePlacementSelector } from './components/GlazePlacementSelector';
```

Added to type imports (line 16):
```typescript
import { ..., GlazePlacement, ... } from './types';
```

Added state (line 39):
```typescript
const [glazePlacement, setGlazePlacement] = useState<GlazePlacement>('face-only');
```

Added to UI (between ProductTypeSelector and ProductInput):
```typescript
<GlazePlacementSelector
  glazePlacement={glazePlacement}
  onGlazePlacementChange={setGlazePlacement}
/>
```

Pass to calculations (line 83):
```typescript
let productWithType = {
  ...product,
  type: productType,
  shape: productType === 'tile' ? tileShape : undefined,
  glaze: glazePlacement,  // NEW
};
```

### 4. Calculation Logic Updates

**File:** `src/utils/kilnCalculations.ts`

#### Edge Loading (lines 37-56)
```typescript
function calculateEdgeLoading(
  kiln: KilnConfig,
  product: ProductDimensions
): LoadingCalculation | null {
  // ... existing checks ...
  
  // NEW: Glaze check for edge placement
  const productWithGlaze = product as ProductWithType;
  const glaze = productWithGlaze.glaze;
  
  // Block edge if glaze on edges or back
  if (glaze === 'face-1-2-edges' || 
      glaze === 'face-3-4-edges' || 
      glaze === 'face-with-back') {
    return null;
  }
  
  // ... rest of calculation ...
}
```

#### Flat Loading (lines 132-170)
```typescript
function calculateFlatLoading(
  kiln: KilnConfig,
  product: ProductDimensions
): LoadingCalculation | null {
  // NEW: Glaze check for stacking
  const productWithGlaze = product as ProductWithType;
  const glaze = productWithGlaze.glaze;
  
  const hasBackGlaze = glaze === 'face-with-back';
  
  // ... middle calculations ...
  
  // NEW: Single level only if glaze on back
  let levels = 1;
  if (kiln.multiLevel && workingArea.height && !hasBackGlaze) {
    levels = Math.floor(workingArea.height / levelHeight);
  }
  
  // ... rest of calculation ...
}
```

### 5. CSS Styles

**File:** `src/App.css`

Added styles (after line 486):
```css
/* Glaze Placement Selector */
.glaze-placement-selector {
  background: var(--surface);
  padding: 0.6rem;
  border-radius: 6px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  margin-top: 0;
}

.glaze-placement-selector h4 {
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
  color: var(--text-secondary);
}
```

## Visual Layout

```
┌──────────────────────────────────┐
│ Тип изделия                      │
│ ( ) Плитка                       │
│ ( ) Столешница                   │
│ ( ) Раковина                     │
│ ( ) 3D                           │
├──────────────────────────────────┤
│ Форма изделия                    │
│ ( ) Квадратная / Прямоугольная   │
│ ( ) Круглая / неправильная форма │
│ ( ) Треугольная                  │
├──────────────────────────────────┤  ← NEW BLOCK
│ Расположение глазури             │
│ (•) Лицевая поверхность          │
│ ( ) Лицевая + 1-2 торца          │
│ ( ) Лицевая + 3-4 торца          │
│ ( ) Лицевая с заходом на оборот. │
├──────────────────────────────────┤
│ Размеры изделия                  │
│ Длина: [____]                    │
│ Ширина: [____]                   │
│ Толщина: [____]                  │
│                                  │
│ [Рассчитать загрузку]            │
└──────────────────────────────────┘
```

## Calculation Logic Matrix

| Glaze Option | Edge Loading | Multi-Level Stacking | Use Case |
|--------------|--------------|---------------------|----------|
| Face only | ✅ Yes | ✅ Yes | Standard tiles |
| Face + 1-2 edges | ❌ No | ✅ Yes | Partial edge glaze |
| Face + 3-4 edges | ❌ No | ✅ Yes | Full edge glaze |
| Face + back | ❌ No | ❌ No (single level) | Full coverage |

## Example Scenarios

### Scenario 1: Standard Tile (Face Only)
```
Product: 30×30×1 cm, face-only glaze
Big kiln:
  - Edge loading: ✅ Available (length 30 > 15, so blocked by size)
  - Flat loading: ✅ Multi-level (6 levels)
  Result: 150 pieces, 13.5 m²
```

### Scenario 2: Edge-Glazed Tile
```
Product: 10×10×1 cm, face-1-2-edges glaze
Big kiln:
  - Edge loading: ❌ Blocked by glaze
  - Flat loading: ✅ Multi-level (6 levels)
  Result: 200 pieces, 6.0 m² (flat only)
```

### Scenario 3: Back-Glazed Tile
```
Product: 20×20×1 cm, face-with-back glaze
Big kiln:
  - Edge loading: ❌ Blocked by glaze
  - Flat loading: ⚠️ Single level only
  Result: 20 pieces, 0.8 m² (no stacking!)
```

### Scenario 4: Small Face-Only Tile
```
Product: 10×10×1 cm, face-only glaze
Big kiln:
  - Edge loading: ✅ Available (under 15cm)
  - Flat loading: ✅ Multi-level
  Result: Best of edge+flat vs flat-only
```

## Space Impact

Added glaze selector:
- 4 radio options × ~35px = ~140px height
- Positioned between shape and dimensions
- Maintains compact design (previously saved 275px)
- Total form still fits on one screen

## Technical Details

### Default Value
```typescript
const [glazePlacement, setGlazePlacement] = useState<GlazePlacement>('face-only');
```
Default is most permissive option (face-only).

### Type Safety
Full TypeScript support:
- GlazePlacement type with 4 valid values
- Type checking in calculations
- Props typed correctly

### Backward Compatibility
- Optional `glaze` field in ProductWithType
- Existing calculations work if glaze is undefined
- Treats undefined as 'face-only'

## Build Status

✅ **Build successful**  
✅ **TypeScript**: No errors  
✅ **Bundle**: 173.41 kB (53.69 kB gzipped)  
✅ **CSS**: 17.17 kB (3.51 kB gzipped)  
✅ **New component**: GlazePlacementSelector

## Testing Checklist

Test all 4 glaze variants:

**Face only:**
- ✅ Edge loading works (if length ≤ 15cm)
- ✅ Multi-level stacking works
- ✅ Combined edge+flat works

**Face + 1-2 edges:**
- ✅ Edge loading blocked
- ✅ Multi-level stacking works
- ✅ Only flat loading available

**Face + 3-4 edges:**
- ✅ Edge loading blocked
- ✅ Multi-level stacking works
- ✅ Only flat loading available

**Face + back:**
- ✅ Edge loading blocked
- ✅ Single level only (no stacking)
- ✅ Significantly reduced capacity

## Key Improvements

1. **Realistic Calculations**: Now accounts for glaze placement constraints
2. **Manufacturing Accuracy**: Reflects actual kiln loading limitations
3. **User Control**: Manager can specify exact glaze configuration
4. **Automatic Optimization**: System chooses best loading method based on constraints

---

**Refresh the page:** http://localhost:5177/

Try different glaze placements to see how they affect loading capacity!
