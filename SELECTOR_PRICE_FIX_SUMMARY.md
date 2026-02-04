# Summary: Selector and Price Input Fix

## Date: February 3, 2026

## Issues Fixed

### Issue 1: Kiln Selector Visible in Simple Mode
- **Before:** Selector always shown when multiple kilns available
- **After:** Selector only shown in hard mode; info display in simple mode

### Issue 2: Cannot Input Decimal Numbers
- **Before:** `value={price.toFixed(3)}` made field readonly
- **After:** `value={price}` allows full decimal input

## Changes Made

### 1. App.tsx - Conditional Selector Display
**Line 398-433**

Added mode check:
```typescript
{selectedKilns.length > 1 && mode === 'hard' && (
  // Selector component
)}

{selectedKilns.length > 1 && mode === 'simple' && (
  // Info display component
)}
```

### 2. StoneCostInput.tsx - Fixed Price Inputs
**Lines 77-101**

Changed both inputs:
- Removed `.toFixed(3)` from value
- Added `min="0"` attribute
- Now fully editable

### 3. App.css - New Styles
**Lines 1115-1137**

Added styles for:
- `.cost-kiln-info` - info container
- `.cost-kiln-info h3` - heading
- `.selected-kiln-display` - selected kiln display

## Behavior

### Simple Mode:
- Auto-selected kiln displayed
- Selector hidden
- User sees which kiln was chosen

### Hard Mode:
- Selector shown
- Manual selection allowed
- Auto-selection still applies by default

## Price Input Support

Now accepts:
- `0.001` - minimum value
- `1.095` - three decimals
- `10.5` - fewer decimals
- `100` - integers

## Build Result

✅ CSS: 17.43 kB (3.14 kB gzipped)  
✅ JS: 177.49 kB (54.91 kB gzipped)  
✅ All tests passing

## Files Modified

1. `src/App.tsx`
2. `src/components/StoneCostInput.tsx`
3. `src/App.css`

---

All issues resolved! Application ready at http://localhost:5173
