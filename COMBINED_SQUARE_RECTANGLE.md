# Combined Square/Rectangle Form Option

## Date: February 2, 2026

## Overview

Combined "Квадратная" and "Прямоугольная" shape options into a single "Квадратная / Прямоугольная" option, as they use identical calculation logic.

## Changes Made

### 1. ProductTypeSelector Component

**File:** `src/components/ProductTypeSelector.tsx`

**Before:** 4 separate options
```typescript
( ) Квадратная
( ) Прямоугольная
( ) Круглая / неправильная форма
( ) Треугольная
```

**After:** 3 options with combined first option
```typescript
( ) Квадратная / Прямоугольная
( ) Круглая / неправильная форма
( ) Треугольная
```

**Implementation:**
```typescript
<label className="radio-label">
  <input
    type="radio"
    name="tileShape"
    value="rectangle"
    checked={tileShape === 'rectangle' || tileShape === 'square'}
    onChange={() => onTileShapeChange('rectangle')}
  />
  <span>Квадратная / Прямоугольная</span>
</label>
```

**Key points:**
- Uses `'rectangle'` as the canonical value
- Checkbox is checked if tileShape is EITHER 'rectangle' OR 'square' (for backward compatibility)
- onChange always sets to 'rectangle'

### 2. Default State Update

**File:** `src/App.tsx` (line 38)

**Changed:**
```typescript
// Before
const [tileShape, setTileShape] = useState<TileShape>('square');

// After
const [tileShape, setTileShape] = useState<TileShape>('rectangle');
```

This ensures the combined option is selected by default.

### 3. No Changes Required

The following files need NO changes:

**`src/types/index.ts`**
- Type definition remains: `export type TileShape = 'square' | 'rectangle' | 'round' | 'triangle';`
- Keeps both values for backward compatibility

**`src/utils/kilnCalculations.ts`**
- Existing logic already treats both identically:
  ```typescript
  if (shape === 'square' || shape === 'rectangle') {
    // Size restriction: max 30×40 cm for big kiln
  }
  ```
- No modifications needed - works with either value

## Benefits

### 1. Space Savings
- Removed 1 radio button option
- Saves ~35-40px vertical space
- Form is even more compact

### 2. User Experience
- Clearer that square and rectangle are treated the same
- Less visual clutter
- Faster selection (fewer options)

### 3. Technical
- Backward compatible (if any data has 'square', it will still work)
- Calculation logic unchanged
- All size restrictions (30×40 cm) still apply

## Visual Comparison

### Before (4 options, ~140px height):
```
┌──────────────────────────────┐
│ Форма изделия                │
│ ( ) Квадратная               │
│ ( ) Прямоугольная            │
│ ( ) Круглая / неправильная   │
│ ( ) Треугольная              │
└──────────────────────────────┘
```

### After (3 options, ~105px height):
```
┌──────────────────────────────┐
│ Форма изделия                │
│ ( ) Квадратная / Прямоугольная│
│ ( ) Круглая / неправильная   │
│ ( ) Треугольная              │
└──────────────────────────────┘
```

**Height saved: ~35px**

## How It Works

1. **User selects combined option** → value set to 'rectangle'
2. **Calculation runs** → logic checks `if (shape === 'square' || shape === 'rectangle')`
3. **Size restriction applies** → max 30×40 cm for big kiln (for both)
4. **Result displayed** → shows optimal loading for the product

## Backward Compatibility

If there's any existing data with `tileShape: 'square'`:
- ✅ The combined radio button will be checked (`tileShape === 'rectangle' || tileShape === 'square'`)
- ✅ Calculation logic still works (`if (shape === 'square' || shape === 'rectangle')`)
- ✅ Size restrictions still apply
- ✅ No data migration needed

## Files Modified

1. **`src/components/ProductTypeSelector.tsx`**
   - Lines 73-113: Removed separate square/rectangle options
   - Added combined "Квадратная / Прямоугольная" option
   - Checkbox logic: `checked={tileShape === 'rectangle' || tileShape === 'square'}`

2. **`src/App.tsx`**
   - Line 38: Changed default from `'square'` to `'rectangle'`

## Build Status

✅ **Build successful**  
✅ **TypeScript**: No errors  
✅ **Bundle**: 172.07 kB (53.40 kB gzipped)  
✅ **CSS**: 16.92 kB (3.49 kB gzipped)

## Testing Checklist

- ✅ Combined option displays correctly
- ✅ Default selection is combined option
- ✅ Selecting combined option sets value to 'rectangle'
- ✅ Calculation works with 'rectangle' value
- ✅ Size restriction (30×40 cm) still applies to big kiln
- ✅ All other shapes (round, triangle) work unchanged
- ✅ 35px vertical space saved

---

**Refresh the page:** http://localhost:5177/

Now you have one combined "Квадратная / Прямоугольная" option instead of two separate ones!
