# Summary: Auto Kiln Selection Implementation

## Date: February 3, 2026

## Overview

Implemented intelligent automatic kiln selection for cost calculation based on loading capacity difference between kilns.

## Key Features

### 1. Smart Default Selection Logic

**Three scenarios:**

1. **Both kilns fit the product AND difference ≤ 20%**
   - Show: "Average (both kilns)"
   - Calculation: Averages all metrics between both kilns

2. **Only one kiln fits the product**
   - Show: That specific kiln
   - Calculation: Uses the available kiln

3. **Both kilns fit the product AND difference > 20%**
   - Show: Kiln with higher capacity
   - Calculation: Uses the more efficient kiln

### 2. Average Calculation

When "Average" is selected:
- Calculates cost for each kiln separately
- Averages all results:
  - Pieces per kiln
  - Total area
  - Price per m²
  - Price per piece
  - Margin
  - Margin percentage

### 3. User Control

Users can always:
- Manually override the auto-selected kiln
- Switch between kilns in the selector
- Recalculate for different kilns

## Implementation Details

### New Function: `getDefaultCostKilnType`

Location: `src/App.tsx` (after line 70)

```typescript
const getDefaultCostKilnType = (
  results: Record<KilnType, CalculationResult | null>
): KilnType | 'average' => {
  // Logic to determine optimal kiln selection
  // Based on: availability, capacity difference
};
```

### Updated: `handleCalculate`

Added automatic kiln selection after loading calculation:

```typescript
const defaultKiln = getDefaultCostKilnType(newResults);
setCostKilnType(defaultKiln);
```

### Reimplemented: `calculateCostResult`

Now supports:
- Individual kiln calculation
- Average calculation between both kilns
- Proper handling of both modes

### Updated: Conditional Rendering

All cost calculation UI components now handle the 'average' case:
- StoneCostInput component
- Calculate button
- Hard mode parameters

## Examples

### Example 1: 10×10 cm tile
- Big kiln: 892 pcs
- Small kiln: 800 pcs
- Difference: 10.3% ≤ 20%
- **Result: "Average"** ✓

### Example 2: 60×40 cm countertop
- Big kiln: null (doesn't fit)
- Small kiln: 12 pcs
- **Result: "Small kiln"** ✓

### Example 3: 5×5 cm tile
- Big kiln: 3500 pcs
- Small kiln: 1200 pcs
- Difference: 65.7% > 20%
- **Result: "Big kiln"** ✓

## Build Status

✅ **TypeScript compilation:** Success  
✅ **Vite build:** Success  
✅ **Bundle size:**
   - CSS: 17.06 kB (3.07 kB gzipped)
   - JS: 177.12 kB (54.87 kB gzipped)

## Files Modified

1. `src/App.tsx` - Main implementation file
   - Added: `getDefaultCostKilnType` function
   - Updated: `handleCalculate` function
   - Reimplemented: `calculateCostResult` function
   - Updated: All conditional rendering for average mode

## Testing Scenarios

✅ Both kilns available, small difference → Average selected  
✅ Only one kiln available → That kiln selected  
✅ Both kilns available, large difference → Better kiln selected  
✅ Average calculation produces correct results  
✅ Manual kiln selection still works  
✅ Hard mode parameters work with average  

## User Benefits

1. **Automatic optimization** - system chooses best option
2. **Flexibility** - manual override always available
3. **Accurate averaging** - based on real calculations
4. **Clear feedback** - see which kiln is selected and why
5. **Better decisions** - informed choice between kilns

---

All plan tasks completed successfully! ✅
