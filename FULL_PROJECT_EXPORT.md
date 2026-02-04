# Kiln Calculator — Full Project Export

Use this document to recreate the application in another environment (e.g. paste into Gemini and ask it to build the project).

## Build instructions

- **Stack:** React 18, TypeScript, Vite
- **Requirements:** Node.js 18+
- **Commands:**
  - `npm install` — install dependencies
  - `npm run dev` — start dev server
  - `npm run build` — production build
  - `npm run preview` — preview production build

Recreate the project by creating each file below with the given path and content.

---

## File: index.html

````html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap" rel="stylesheet" />
    <title>Калькулятор загрузки печей</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
````

## File: package.json

````json
{
  "name": "kiln-calculator",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && firebase deploy",
    "export": "node scripts/export-for-gemini.js"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
````

## File: tsconfig.json

````json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
````

## File: tsconfig.node.json

````json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
````

## File: vite.config.ts

````ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: 'localhost',
    open: true,
    hmr: {
      overlay: true,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    force: true,
  },
})
````

## File: src/main.tsx

````tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
````

## File: src/App.tsx

````tsx
import { useState, useEffect, useRef } from 'react';
import { ProductInput } from './components/ProductInput';
import { ProductTypeSelector } from './components/ProductTypeSelector';
import { GlazePlacementSelector } from './components/GlazePlacementSelector';
import { StoneCostInput } from './components/StoneCostInput';
import { CostResults } from './components/CostResults';
import { OrderQuantityInput } from './components/OrderQuantityInput';
import { ErrorModal } from './components/ErrorModal';
import { PriceConflictModal } from './components/PriceConflictModal';
import { CalculationHistory } from './components/CalculationHistory';
import { BackupManagement } from './components/BackupManagement';
import { BackupLogin } from './components/BackupLogin';
import { NotificationModal } from './components/NotificationModal';
import {
  KilnType,
  ProductDimensions,
  CalculationResult,
  ProductType,
  TileShape,
  GlazePlacement,
  CostCalculationResult,
  StoneEntry,
  CostParameters,
  ProductWithType,
  ManagerName,
  Market,
} from './types';
import { KILNS } from './utils/constants';
import { calculateKilnLoading } from './utils/kilnCalculations';
import { calculateCost } from './utils/costCalculations';
import { findStoneByCriteria, findStonesByExactMatch, detectPriceConflict } from './utils/stoneDatabase';
import { addStoneEntry } from './utils/stoneDatabase';
import { addCalculationToHistory } from './utils/calculationHistory';
import { sendCalculationToTelegram } from './utils/telegram';
import { 
  createFullBackup, 
  createIncrementalBackup, 
  trackChanges,
  getBackupStats 
} from './utils/backup';
import './App.css';

/**
 * Determines whether to show both price input fields (per m² AND per piece)
 * ONLY tiles with square/rectangle shapes can have both inputs
 * Countertops, sinks, 3D - ONLY per piece input
 */
function shouldShowBothPriceInputs(
  productType: ProductType,
  tileShape: TileShape
): boolean {
  // ONLY tiles can have both price inputs (per m² and per piece)
  // Countertops, sinks, 3D - ONLY per piece
  if (productType !== 'tile') return false;
  
  const allowedShapes: TileShape[] = ['square', 'rectangle'];
  return allowedShapes.includes(tileShape);
}

function App() {
  // Kiln calculation state - automatically calculate for both kilns
  const [selectedKilns] = useState<KilnType[]>(['big', 'small']);
  const [kilnResults, setKilnResults] = useState<Record<KilnType, CalculationResult | null>>({
    big: null,
    small: null,
  });
  // Cost calculation state
  const [productType, setProductType] = useState<ProductType>('tile');
  const [tileShape, setTileShape] = useState<TileShape>('rectangle');
  const [glazePlacement, setGlazePlacement] = useState<GlazePlacement>('face-only');
  const [customGlazeColor, setCustomGlazeColor] = useState<boolean>(false);
  const [useBrush, setUseBrush] = useState<boolean>(false);
  const [stoneCost, setStoneCost] = useState<number>(0);
  const [orderQuantity, setOrderQuantity] = useState<number>(0);
  const [costResult, setCostResult] = useState<CostCalculationResult | null>(null);
  const customParams: Partial<CostParameters> = {};
  const [costKilnType, setCostKilnType] = useState<KilnType | 'average'>('big');
  const [isKilnSelectorDisabled, setIsKilnSelectorDisabled] = useState(false);
  const [kilnSelectionReason, setKilnSelectionReason] = useState('');
  
  const productFormRef = useRef<HTMLFormElement>(null);

  // Product dimensions state - always start empty, no preset values
  const [productDimensions, setProductDimensions] = useState<{
    length: string;
    width: string;
    thickness: string;
  }>(() => ({
    length: '',
    width: '',
    thickness: ''
  }));
  
  // UI state: history opens as panel (no tabs)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorReason, setErrorReason] = useState('');
  
  // Backup modal state
  const [showBackupModal, setShowBackupModal] = useState(false);
  
  // Notification modal state
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'warning' | 'error' | 'success' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  
  // Approval warning modal state
  // Manager selection
  const [selectedManager, setSelectedManager] = useState<ManagerName | ''>('');
  const [selectedMarket, setSelectedMarket] = useState<Market>('indonesia');
  
  // Backup authentication
  const [isBackupAuthenticated, setIsBackupAuthenticated] = useState(false);
  
  // Price conflict modal state
  const [showPriceConflictModal, setShowPriceConflictModal] = useState(false);
  const [conflictPrices, setConflictPrices] = useState<number[]>([]);
  const [conflictEntries, setConflictEntries] = useState<StoneEntry[]>([]);

  // Auto-reset face-1-2-edges for round shape
  useEffect(() => {
    if (tileShape === 'round' && glazePlacement === 'face-1-2-edges') {
      setGlazePlacement('face-only');
    }
  }, [tileShape, glazePlacement]);

  // Clear length/width (diameter) when switching to round so the diameter field is empty
  useEffect(() => {
    if (tileShape === 'round') {
      setProductDimensions(prev => ({ ...prev, length: '', width: '' }));
    }
  }, [tileShape]);

  // Auto-switch to Countertop when dimensions reach 40×60 (or larger): max ≥ 60 and min ≥ 40
  // Does not clear product dimensions
  useEffect(() => {
    if (productType !== 'tile') return;
    const length = parseFloat(productDimensions.length) || 0;
    const width = parseFloat(productDimensions.width) || 0;
    const maxDim = Math.max(length, width);
    const minDim = Math.min(length, width);
    if (maxDim >= 60 && minDim >= 40) {
      setProductType('countertop');
    }
  }, [productDimensions.length, productDimensions.width, productType]);

  // Automatic backup system
  useEffect(() => {
    // Create initial full backup on app load
    const stats = getBackupStats();
    if (!stats.lastFullBackup) {
      console.log('🔧 Creating initial full backup...');
      createFullBackup();
    }
    
    // Incremental backup every 3 minutes
    const incrementalInterval = setInterval(() => {
      trackChanges();
      createIncrementalBackup();
    }, 3 * 60 * 1000); // 3 minutes
    
    // Full backup once per day (24 hours)
    const fullBackupInterval = setInterval(() => {
      console.log('🔧 Creating daily full backup...');
      createFullBackup();
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // Track changes on any database modification
    const trackInterval = setInterval(() => {
      trackChanges();
    }, 30 * 1000); // Track every 30 seconds
    
    return () => {
      clearInterval(incrementalInterval);
      clearInterval(fullBackupInterval);
      clearInterval(trackInterval);
    };
  }, []);

  // Check backup authentication on mount and tab change
  useEffect(() => {
    if (showBackupModal) {
      const isAuth = sessionStorage.getItem('backup_auth') === 'true';
      setIsBackupAuthenticated(isAuth);
    }
  }, [showBackupModal]);

  const handleBackupLogin = () => {
    setIsBackupAuthenticated(true);
  };

  const handleBackupLogout = () => {
    sessionStorage.removeItem('backup_auth');
    setIsBackupAuthenticated(false);
    setShowBackupModal(false);
  };

  const handleCloseBackupModal = () => {
    setShowBackupModal(false);
  };

  // Auto-reset glaze when product type changes
  useEffect(() => {
    if (productType === '3d') {
      // For 3D: face-only or face-3-4-edges
      if (glazePlacement !== 'face-only' && glazePlacement !== 'face-3-4-edges') {
        setGlazePlacement('face-only');
      }
    } else if (productType === 'sink') {
      // For sinks only face-only or face-3-4-edges
      if (glazePlacement !== 'face-only' && glazePlacement !== 'face-3-4-edges') {
        setGlazePlacement('face-only');
      }
    } else if (productType === 'countertop') {
      // For countertops: face-only, face-3-4-edges, face-with-back
      if (glazePlacement === 'face-1-2-edges') {
        setGlazePlacement('face-only');
      }
    }
  }, [productType, glazePlacement]);

  // Smart kiln selection with 30% difference rule
  const getSmartKilnSelection = (
    results: Record<KilnType, CalculationResult | null>
  ): {
    kilnType: KilnType | 'average';
    disabled: boolean;
    reason: string;
  } => {
    const bigResult = results.big;
    const smallResult = results.small;
    
    // Case 1: No results or only one result
    if (!bigResult || !smallResult) {
      if (bigResult) {
        return { 
          kilnType: 'big', 
          disabled: true, 
          reason: 'Only large kiln fits this product' 
        };
      }
      if (smallResult) {
        return { 
          kilnType: 'small', 
          disabled: true, 
          reason: 'Only small kiln fits this product' 
        };
      }
      return { kilnType: 'big', disabled: false, reason: '' };
    }
    
    // Case 2: Both kilns have results - calculate difference
    const bigLoading = bigResult.optimalLoading.totalArea;
    const smallLoading = smallResult.optimalLoading.totalArea;
    
    const maxLoading = Math.max(bigLoading, smallLoading);
    const minLoading = Math.min(bigLoading, smallLoading);
    
    const differencePercent = ((maxLoading - minLoading) / minLoading) * 100;
    
    if (differencePercent <= 30) {
      // Use average - difference is small enough
      return {
        kilnType: 'average',
        disabled: true,
        reason: `Using average loading (difference: ${differencePercent.toFixed(1)}% ≤ 30%)`
      };
    } else {
      // Use best kiln only - difference is too large
      const bestKiln = bigLoading > smallLoading ? 'big' : 'small';
      return {
        kilnType: bestKiln,
        disabled: true,
        reason: `Using ${KILNS[bestKiln].name} only (difference: ${differencePercent.toFixed(1)}% > 30%)`
      };
    }
  };

  // Wrapper for calculations with product type
  const calculateForKiln = (
    kilnType: KilnType,
    product: ProductDimensions
  ): CalculationResult | null => {
    const kiln = KILNS[kilnType];
    
    // Check: countertops in large kiln
    if (productType === 'countertop' && kilnType === 'big') {
      return null; // skip this kiln
    }
    
    let productWithType = {
      ...product,
      type: productType,
      shape: tileShape, // Pass shape for all product types (countertops, sinks, 3D)
      glaze: glazePlacement,
      orderQuantity: orderQuantity,
    };
    
    // DEBUG: Log product info
    console.log('🔍 DEBUG calculateForKiln:', {
      kilnType,
      productType,
      tileShape,
      productDimensions: product,
      productWithType
    });
    
    let calculationResult: CalculationResult | null;
    
    // For square products rotation is not needed
    if (product.length === product.width) {
      calculationResult = calculateKilnLoading(kiln, productWithType);
    } else {
      // For rectangular products try both orientations and select the best
      const original = calculateKilnLoading(kiln, productWithType);
      
      const rotatedProduct = {
        length: product.width,
        width: product.length,
        thickness: product.thickness,
      };
      const rotatedWithType = {
        ...rotatedProduct,
        type: productType,
        shape: tileShape, // Pass shape for all product types (same as line 340)
        glaze: glazePlacement,
        orderQuantity: orderQuantity,
      };
      const rotated = calculateKilnLoading(kiln, rotatedWithType);
      
      // Select orientation with maximum area
      if (original && rotated) {
        if (original.optimalLoading.totalArea >= rotated.optimalLoading.totalArea) {
          calculationResult = original;
        } else {
          calculationResult = rotated;
        }
      } else if (original) {
        calculationResult = original;
      } else if (rotated) {
        calculationResult = rotated;
      } else {
        calculationResult = null;
      }
    }
    
    return calculationResult;
  };

  const handleCalculate = (product: ProductDimensions) => {
    // First, perform auto lookup for stone price
    performAutoLookup(product);
    
    const newResults: Record<KilnType, CalculationResult | null> = { big: null, small: null };
    
    for (const kilnType of selectedKilns) {
      newResults[kilnType] = calculateForKiln(kilnType, product);
    }
    
    setKilnResults(newResults);
    
    // Apply smart kiln selection with 30% difference rule
    const { kilnType, disabled, reason } = getSmartKilnSelection(newResults);
    setCostKilnType(kilnType);
    setIsKilnSelectorDisabled(disabled);
    setKilnSelectionReason(reason);
    
    // If no kiln gave a result - determine specific reason
    if (!newResults.big && !newResults.small) {
      const reason = determineErrorReason(product);
      setErrorReason(reason);
      setShowErrorModal(true);
    }
    
    // Do NOT automatically switch to cost tab
    // User will choose when to proceed
  };

  // Determine specific error reason
  const determineErrorReason = (product: ProductDimensions): string => {
    // Check minimum dimensions
    if (product.length < 3 || product.width < 3) {
      return `Dimensions too small: ${product.length}×${product.width} cm. Minimum size: 3×3 cm`;
    }
    
    if (product.thickness < 0.8) {
      return `Thickness too small: ${product.thickness} cm. Minimum thickness: 0.8 cm`;
    }
    
    const maxDim = Math.max(product.length, product.width);
    const minDim = Math.min(product.length, product.width);
    
    // Check for countertops/sinks
    if (productType === 'sink' || productType === 'countertop') {
      // Large kiln: max 40×20 cm
      const fitsInBig = maxDim <= 40 && minDim <= 20;
      // Small kiln: max 150×100 cm (working dimensions)
      const fitsInSmall = maxDim <= 150 && minDim <= 100;
      
      if (!fitsInBig && !fitsInSmall) {
        return `Dimensions too large for sinks/countertops: ${product.length}×${product.width} cm. Maximum for large kiln: 40×20 cm, for small kiln: 150×100 cm`;
      }
    }
    
    // Check for regular products (tile, 3D)
    if (productType === 'tile' || productType === '3d') {
      // Small kiln: maximum 100 cm for non-countertops
      if (maxDim > 100) {
        return `Dimensions too large: ${product.length}×${product.width} cm. Maximum for small kiln: 100 cm (for tile/3D products)`;
      }
      
      if (tileShape === 'square' || tileShape === 'rectangle') {
        // Large kiln: max 40×30 cm
        const fitsInBig = maxDim <= 40 && minDim <= 30;
        
        if (!fitsInBig && maxDim <= 100) {
          // Fits only in small kiln - this is normal
        }
      }
    }
    
    // Check thickness for small kiln
    if (product.thickness > 30) {
      return `Thickness too large for small kiln: ${product.thickness} cm. Maximum: 30 cm`;
    }
    
    // Check height on edge - ONLY FOR TILES (countertops, sinks, 3D are always face-up)
    if (productType === 'tile' && product.length > 15 && glazePlacement !== 'face-with-back') {
      return `Product too tall for edge placement: ${product.length} cm. Maximum: 15 cm. Try changing glaze placement to "Face with back"`;
    }
    
    // Check glaze compatibility with loading - ONLY FOR TILES (countertops/sinks can use all glaze options)
    if (productType === 'tile' && (glazePlacement === 'face-3-4-edges' || glazePlacement === 'face-with-back')) {
      return `Current glaze placement ("${glazePlacement === 'face-3-4-edges' ? 'Face + 3-4 edges' : 'Face with back'}") does not allow placing the product in the kiln. Try another placement`;
    }
    
    // General error
    return `Product ${product.length}×${product.width}×${product.thickness} cm cannot be placed in the kiln with current parameters. Check dimensions and glaze placement`;
  };

  const calculateCostResult = (
    product: ProductDimensions,
    kilnLoading?: CalculationResult
  ) => {
    // Validation: manager must be selected
    if (!selectedManager) {
      setNotificationModal({
        isOpen: true,
        title: 'Manager Required',
        message: 'Please select a manager before calculation',
        type: 'error',
      });
      return;
    }

    if (!selectedMarket) {
      setNotificationModal({
        isOpen: true,
        title: 'Market Required',
        message: 'Please select a market (Indonesia or Abroad) before calculation',
        type: 'error',
      });
      return;
    }
    
    // Validation: quantity must be greater than 0
    if (orderQuantity <= 0) {
      setNotificationModal({
        isOpen: true,
        title: 'Order Quantity Required',
        message: 'Please specify order quantity (must be greater than 0)',
        type: 'error',
      });
      return;
    }

    const targetKilnType = costKilnType;

    if (targetKilnType === 'average') {
      // Calculate average between two kilns
      const bigResult = kilnResults.big;
      const smallResult = kilnResults.small;
      
      if (!bigResult || !smallResult) {
        setNotificationModal({
          isOpen: true,
          title: 'Average Calculation Error',
          message: 'Need results from both kilns to calculate average',
          type: 'error',
        });
        return;
      }
      
      const productWithType = {
        ...product,
        type: productType,
        shape: tileShape, // Pass shape for all product types (countertop, sink, 3D)
        glaze: glazePlacement,
        orderQuantity: orderQuantity,
        customGlazeColor: customGlazeColor,
        useBrush: useBrush,
      };
      
      // Calculate cost for each kiln
      const bigCost = calculateCost(
        KILNS.big,
        productWithType,
        bigResult.optimalLoading,
        stoneCost,
        customParams
      );
      
      const smallCost = calculateCost(
        KILNS.small,
        productWithType,
        smallResult.optimalLoading,
        stoneCost,
        customParams
      );
      
      // Create averaged result
      const averageResult: CostCalculationResult = {
        product: bigCost.product,
        kiln: {
          ...bigCost.kiln,
          name: 'Average (both kilns)'
        },
        kilnLoading: {
          ...bigCost.kilnLoading,
          totalPieces: Math.round((bigCost.kilnLoading.totalPieces + smallCost.kilnLoading.totalPieces) / 2),
          totalArea: (bigCost.kilnLoading.totalArea + smallCost.kilnLoading.totalArea) / 2,
          levels: Math.round((bigCost.kilnLoading.levels + smallCost.kilnLoading.levels) / 2),
        },
        orderQuantity: bigCost.orderQuantity,
        productArea: bigCost.productArea,
        parameters: bigCost.parameters, // Parameters are the same
        breakdown: {
          stoneCost: bigCost.breakdown.stoneCost,
          stoneWithDefect: bigCost.breakdown.stoneWithDefect,
          angobeGlazesTotal: bigCost.breakdown.angobeGlazesTotal,
          electricity: (bigCost.breakdown.electricity + smallCost.breakdown.electricity) / 2,
          salary: (bigCost.breakdown.salary + smallCost.breakdown.salary) / 2,
          firingCost: (bigCost.breakdown.firingCost + smallCost.breakdown.firingCost) / 2,
          baseCost: (bigCost.breakdown.baseCost + smallCost.breakdown.baseCost) / 2,
          defectCost: (bigCost.breakdown.defectCost + smallCost.breakdown.defectCost) / 2,
          salesCost: (bigCost.breakdown.salesCost + smallCost.breakdown.salesCost) / 2,
          otherCost: (bigCost.breakdown.otherCost + smallCost.breakdown.otherCost) / 2,
          totalExpenses: (bigCost.breakdown.totalExpenses + smallCost.breakdown.totalExpenses) / 2,
          vatAmount: (bigCost.breakdown.vatAmount + smallCost.breakdown.vatAmount) / 2,
          priceWithVAT: (bigCost.breakdown.priceWithVAT + smallCost.breakdown.priceWithVAT) / 2,
          finalPrice: (bigCost.breakdown.finalPrice + smallCost.breakdown.finalPrice) / 2,
        },
        indonesia: {
          pricePerSqM: (bigCost.indonesia.pricePerSqM + smallCost.indonesia.pricePerSqM) / 2,
          pricePerPcs: (bigCost.indonesia.pricePerPcs + smallCost.indonesia.pricePerPcs) / 2,
          margin: (bigCost.indonesia.margin + smallCost.indonesia.margin) / 2,
          marginPercent: (bigCost.indonesia.marginPercent + smallCost.indonesia.marginPercent) / 2,
        },
        abroad: {
          pricePerSqM: (bigCost.abroad.pricePerSqM + smallCost.abroad.pricePerSqM) / 2,
          pricePerPcs: (bigCost.abroad.pricePerPcs + smallCost.abroad.pricePerPcs) / 2,
          margin: (bigCost.abroad.margin + smallCost.abroad.margin) / 2,
          marginPercent: (bigCost.abroad.marginPercent + smallCost.abroad.marginPercent) / 2,
        },
      };
      
      setCostResult(averageResult);
      
      // Save calculation to history and send to Telegram
      const historyEntry = addCalculationToHistory({
        manager: selectedManager,
        productType: productType,
        tileShape: productType === 'tile' ? tileShape : undefined,
        dimensions: {
          length: product.length,
          width: product.width,
          thickness: product.thickness,
        },
        glazePlacement: glazePlacement,
        kilnUsed: 'average',
        loadingArea: averageResult.kilnLoading.totalArea,
        loadingPieces: averageResult.kilnLoading.totalPieces,
        orderQuantity: orderQuantity,
        stoneCost: stoneCost,
        costResult: averageResult,
      });
      
      // Send to Telegram group
      sendCalculationToTelegram(historyEntry).catch(err => {
        console.error('Failed to send to Telegram:', err);
      });
      
      // Automatically save stone to database
      autoSaveStoneToDatabase(productWithType);
    } else {
      // Calculate for specific kiln
      const targetKiln = targetKilnType as KilnType;
      const loading = kilnLoading || kilnResults[targetKiln];

      if (!loading) {
        setNotificationModal({
          isOpen: true,
          title: 'Kiln Loading Required',
          message: 'Please calculate kiln loading first',
          type: 'warning',
        });
        return;
      }

      const kiln = KILNS[targetKiln];
      const productWithType = {
        ...product,
        type: productType,
        shape: tileShape, // Pass shape for all product types (countertop, sink, 3D)
        glaze: glazePlacement,
        orderQuantity: orderQuantity,
        customGlazeColor: customGlazeColor,
        useBrush: useBrush,
      };

      const result = calculateCost(
        kiln,
        productWithType,
        loading.optimalLoading,
        stoneCost,
        customParams
      );

      setCostResult(result);
      
      // Save calculation to history and send to Telegram
      const historyEntry = addCalculationToHistory({
        manager: selectedManager,
        productType: productType,
        tileShape: productType === 'tile' ? tileShape : undefined,
        dimensions: {
          length: product.length,
          width: product.width,
          thickness: product.thickness,
        },
        glazePlacement: glazePlacement,
        kilnUsed: targetKiln,
        loadingArea: result.kilnLoading.totalArea,
        loadingPieces: result.kilnLoading.totalPieces,
        orderQuantity: orderQuantity,
        stoneCost: stoneCost,
        costResult: result,
      });
      
      // Send to Telegram group
      sendCalculationToTelegram(historyEntry).catch(err => {
        console.error('Failed to send to Telegram:', err);
      });
      
      // Automatically save stone to database
      autoSaveStoneToDatabase(productWithType);
    }
  };

  // Auto-save stone to database
  // Helper function to calculate product area based on shape
  const calculateProductArea = (product: ProductWithType): number => {
    const shape = product.shape;
    const length = product.length;
    const width = product.width;
    
    if (shape === 'round') {
      // For round: π × (diameter/2)²
      const radiusInCm = length / 2;
      return Math.PI * (radiusInCm * radiusInCm) / 10000;
    } else if (shape === 'triangle') {
      // For triangle: (length × width) / 2
      return (length * width) / 2 / 10000;
    } else {
      // For rectangle, square, freeform: length × width
      return (length * width) / 10000;
    }
  };

  const autoSaveStoneToDatabase = (product: ProductWithType) => {
    try {
      const productArea = calculateProductArea(product);
      const pricePerPcs = stoneCost * productArea;
      
      // Form stone name
      const shapeName = tileShape ? ` (${tileShape})` : '';
      const sizeName = `${product.length}×${product.width}×${product.thickness}`;
      const stoneName = `${productType}${shapeName} ${sizeName}`;
      
      // Check for exact duplicates before saving
      const existingMatches = findStonesByExactMatch(
        productType,
        tileShape,
        product.length,
        product.width,
        product.thickness
      );

      // Only save if no exact match with same price exists
      // For tiles: compare pricePerM2, for others: compare pricePerUnit
      const hasSamePrice = existingMatches.some(e => {
        if (productType === 'tile') {
          return Math.abs(e.pricePerM2 - stoneCost) < 0.001;
        } else {
          return Math.abs(e.pricePerUnit - pricePerPcs) < 0.001;
        }
      });

      if (!hasSamePrice) {
        addStoneEntry({
          name: stoneName,
          pricePerUnit: pricePerPcs,
          pricePerM2: stoneCost,
          productType: productType,
          sizeRange: `${product.length}x${product.width}-${product.length}x${product.width}`,
          thickness: product.thickness,
        });
        console.log('Stone auto-saved to database:', stoneName);
      } else {
        console.log('Stone already exists in database with same price, skipping save');
      }
    } catch (error) {
      console.error('Error auto-saving stone:', error);
    }
  };

  const handleStoneSelect = (stone: StoneEntry) => {
    setStoneCost(stone.pricePerM2);
    setShowStoneDB(false);
    setNotificationModal({
      isOpen: true,
      title: 'Stone Selected',
      message: `Selected stone: ${stone.name}\nPrice: ${stone.pricePerM2} mil Rp per m²`,
      type: 'success',
    });
  };

  const handleAutoFindStone = (product: ProductDimensions) => {
    const stone = findStoneByCriteria(productType, product);
    if (stone) {
      setStoneCost(stone.pricePerM2);
      setNotificationModal({
        isOpen: true,
        title: 'Stone Auto-Selected',
        message: `Automatically selected: ${stone.name}\nPrice: ${stone.pricePerM2} mil Rp per m²`,
        type: 'success',
      });
    } else {
      setNotificationModal({
        isOpen: true,
        title: 'No Match Found',
        message: 'No matching stone found in database',
        type: 'warning',
      });
    }
  };

  // Auto lookup stone price from database
  const performAutoLookup = (product: ProductDimensions) => {
    const matches = findStonesByExactMatch(
      productType,
      tileShape,
      product.length,
      product.width,
      product.thickness
    );
    
    if (matches.length === 0) {
      // No matches found - do nothing (user enters price manually)
      console.log('No matching stones found in database');
      return;
    }
    
    // Check for price conflicts
    const conflict = detectPriceConflict(matches, productType);
    
    if (conflict) {
      // Multiple different prices found - show modal
      setConflictPrices(conflict.prices);
      setConflictEntries(conflict.entries);
      setShowPriceConflictModal(true);
      console.log(`Price conflict detected: ${conflict.prices.length} different prices found`);
    } else {
      // Single price (or same price in multiple entries) - auto-fill
      const selectedEntry = matches[0];
      
      // For tiles: use pricePerM2
      // For countertops/sinks/3d: convert pricePerUnit to pricePerM2 for internal use
      if (productType === 'tile') {
        setStoneCost(selectedEntry.pricePerM2);
        console.log(`Auto-filled price: ${selectedEntry.pricePerM2} mil Rp/m²`);
      } else {
        // Calculate area and convert per-piece to per-m² for internal stoneCost
        const productWithShape = { ...product, type: productType, shape: tileShape } as ProductWithType;
        const productArea = calculateProductArea(productWithShape);
        const pricePerM2 = selectedEntry.pricePerUnit / productArea;
        setStoneCost(pricePerM2);
        console.log(`Auto-filled price: ${selectedEntry.pricePerUnit} mil Rp/piece (${pricePerM2.toFixed(3)} mil Rp/m²)`);
      }
    }
  };

  // Handle price selection from conflict modal
  const handleSelectConflictPrice = (price: number) => {
    // Price is already in the correct format from the modal
    // For tiles: price is pricePerM2
    // For countertops/sinks/3d: price is pricePerUnit, need to convert
    if (productType === 'tile') {
      setStoneCost(price);
    } else {
      // Need product dimensions to convert
      const currentResult = costKilnType === 'average' 
        ? (kilnResults.big || kilnResults.small)
        : kilnResults[costKilnType as KilnType];
      
      if (currentResult) {
        const productArea = calculateProductArea(currentResult.product as ProductWithType);
        const pricePerM2 = price / productArea;
        setStoneCost(pricePerM2);
      } else {
        setStoneCost(price); // Fallback
      }
    }
    
    setShowPriceConflictModal(false);
    setConflictPrices([]);
    setConflictEntries([]);
    
    console.log(`User selected price: ${price}`);
  };

  const handleManualPriceEntry = () => {
    setShowPriceConflictModal(false);
    setConflictPrices([]);
    setConflictEntries([]);
    
    console.log('User chose to enter price manually');
    // Stone price field remains editable
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>
            <span className="brand">Moonjar</span> <span className="title">Design</span>
          </h1>
          <p className="subtitle">Custom Lava Stone Product Cost Calculator</p>
        </div>
        <div className="header-buttons">
          <button 
            className="button button-new-calc"
            onClick={() => window.location.reload()}
            title="Start a new calculation (clears all data)"
          >
            🔄 New Calculation
          </button>
          <button 
            className="button button-backup"
            onClick={() => setShowBackupModal(true)}
            title="Backup Management (Admin only)"
          >
            🔒 Backup
          </button>
          <button 
            className="button button-history"
            onClick={() => setShowHistoryPanel(true)}
            title="View calculation history"
          >
            📋 Calculation History
          </button>
        </div>
      </header>

      <div className="app-container">
        {showHistoryPanel ? (
          <div className="history-panel">
            <div className="history-panel-header">
              <h2>Calculation History</h2>
              <button className="button" onClick={() => setShowHistoryPanel(false)}>Close</button>
            </div>
            <div className="history-panel-content">
              <CalculationHistory />
            </div>
          </div>
        ) : (
          <div className="main-layout-vertical">
            {/* Top section: split in half */}
            <div className="top-section-split">
              {/* Left half: 3 product blocks vertically */}
              <div className="left-half">
                <ProductTypeSelector
                  productType={productType}
                  tileShape={tileShape}
                  onProductTypeChange={setProductType}
                  onTileShapeChange={setTileShape}
                />

                <GlazePlacementSelector
                  glazePlacement={glazePlacement}
                  onGlazePlacementChange={setGlazePlacement}
                  tileShape={tileShape}
                  productType={productType}
                  customGlazeColor={customGlazeColor}
                  onCustomGlazeColorChange={setCustomGlazeColor}
                  useBrush={useBrush}
                  onUseBrushChange={setUseBrush}
                />

                <ProductInput 
                  formRef={productFormRef}
                  onCalculate={handleCalculate} 
                  tileShape={tileShape}
                  productType={productType}
                  showButton={true}
                  initialLength={productDimensions.length}
                  initialWidth={productDimensions.width}
                  initialThickness={productDimensions.thickness}
                  onDimensionsChange={setProductDimensions}
                  selectedManager={selectedManager}
                  onManagerChange={setSelectedManager}
                  selectedMarket={selectedMarket}
                  onMarketChange={setSelectedMarket}
                />
              </div>

              {/* Right half: cost inputs and calculate button */}
              <div className="right-half">
                {(kilnResults.big || kilnResults.small) ? (
                  <>
                    <div className="cost-panel-grid">
                      {/* Kiln + Stone Price in two columns */}
                      <div className="cost-grid-two-columns">
                        <div className="cost-left-column">
                          {/* Kiln selection */}
                          {selectedKilns.length > 1 && (
                            <>
                              <h3>Calculate cost for:</h3>
                              <select 
                                value={costKilnType} 
                                onChange={(e) => setCostKilnType(e.target.value as KilnType | 'average')}
                                className="kiln-select"
                                disabled={isKilnSelectorDisabled}
                              >
                                {selectedKilns.map(k => (
                                  kilnResults[k] && (
                                    <option key={k} value={k}>
                                      {KILNS[k].name} ({kilnResults[k]!.optimalLoading.totalPieces} pcs)
                                    </option>
                                  )
                                ))}
                                <option value="average">Average of kilns</option>
                              </select>
                            </>
                          )}

                          {/* Stone Price fields (without buttons) */}
                          {(costKilnType === 'average' 
                            ? (kilnResults.big || kilnResults.small) 
                            : kilnResults[costKilnType as KilnType]
                          ) && (
                            <>
                              <h3 style={{marginTop: '1rem'}}>Stone Price</h3>
                              <StoneCostInput
                                productArea={(() => {
                                  const result = costKilnType === 'average' 
                                    ? kilnResults.big! 
                                    : kilnResults[costKilnType as KilnType]!;
                                  return calculateProductArea(result.product as ProductWithType);
                                })()}
                                onStoneCostChange={setStoneCost}
                                initialCostPerSqM={stoneCost}
                                onShowDB={() => setShowStoneDB(!showStoneDB)}
                                onAutoFind={() => {
                                  const currentResult = costKilnType === 'average' 
                                    ? (kilnResults.big || kilnResults.small)
                                    : kilnResults[costKilnType as KilnType];
                                  if (currentResult) {
                                    handleAutoFindStone(currentResult.product);
                                  }
                                }}
                                showDB={showStoneDB}
                                showBothInputs={shouldShowBothPriceInputs(productType, tileShape)}
                                hideButtons={true}
                                hideProductArea={true}
                              />
                            </>
                          )}
                        </div>

                        <div className="cost-right-column">
                          {/* Kiln selection reason - aligned with h3 */}
                          <div className="kiln-selection-reason-wrapper">
                            {kilnSelectionReason && (
                              <p className="kiln-selection-reason">{kilnSelectionReason}</p>
                            )}
                          </div>

                          {/* Product area */}
                          {(costKilnType === 'average' 
                            ? (kilnResults.big || kilnResults.small) 
                            : kilnResults[costKilnType as KilnType]
                          ) && (
                            <div className="product-area-text-right">
                              Product area: {calculateProductArea((costKilnType === 'average' 
                                ? kilnResults.big! 
                                : kilnResults[costKilnType as KilnType]!).product as ProductWithType).toFixed(4)} m²
                            </div>
                          )}
                        </div>

                        {/* Order quantity - full width */}
                        {(costKilnType === 'average' 
                          ? (kilnResults.big || kilnResults.small) 
                          : kilnResults[costKilnType as KilnType]
                        ) && (
                          <div className="order-quantity-in-grid">
                            <OrderQuantityInput
                              productArea={(() => {
                                const result = costKilnType === 'average' 
                                  ? kilnResults.big! 
                                  : kilnResults[costKilnType as KilnType]!;
                                return calculateProductArea(result.product as ProductWithType);
                              })()}
                              onQuantityChange={setOrderQuantity}
                              initialQuantityPcs={orderQuantity}
                              showBothModes={productType === 'tile'}
                            />
                          </div>
                        )}

                        {/* Calculate Cost button - full width at bottom of grid */}
                        <button
                          className="calculate-loading-button calculate-cost-in-grid"
                          onClick={() => {
                            const currentProduct = costKilnType === 'average'
                              ? (kilnResults.big || kilnResults.small)?.product
                              : kilnResults[costKilnType as KilnType]?.product;
                            
                            const currentResult = costKilnType === 'average'
                              ? (kilnResults.big || kilnResults.small)
                              : kilnResults[costKilnType as KilnType];
                            
                            if (currentProduct && currentResult) {
                              calculateCostResult(currentProduct, currentResult);
                            }
                          }}
                        >
                          Calculate Cost
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="right-half-empty">
                    <p>Calculate loading first</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom section: Results only */}
            <section className="bottom-section">
              {costResult && (
                <div className="cost-results-area">
                  <CostResults result={costResult} selectedMarket={selectedMarket} />
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Backup Modal */}
      {showBackupModal && (
        <div className="modal-overlay" onClick={handleCloseBackupModal}>
          <div className="modal-content backup-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseBackupModal}>×</button>
            {isBackupAuthenticated ? (
              <>
                <div className="backup-auth-header">
                  <h2>🔒 Backup Management</h2>
                  <button 
                    className="button button-danger logout-button"
                    onClick={handleBackupLogout}
                  >
                    Logout
                  </button>
                </div>
                <BackupManagement />
              </>
            ) : (
              <BackupLogin onLogin={handleBackupLogin} />
            )}
          </div>
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        reason={errorReason}
      />

      {/* Price Conflict Modal */}
      <PriceConflictModal
        isOpen={showPriceConflictModal}
        onClose={() => setShowPriceConflictModal(false)}
        prices={conflictPrices}
        entries={conflictEntries}
        productType={productType}
        onSelectPrice={handleSelectConflictPrice}
        onManualEntry={handleManualPriceEntry}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal({ ...notificationModal, isOpen: false })}
        title={notificationModal.title}
        message={notificationModal.message}
        type={notificationModal.type}
      />
    </div>
  );
}

export default App;
````

## File: src/App.css

````css
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');

:root {
  --primary-color: #2563eb;
  --primary-dark: #1e40af;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --button-accent: #7c3aed;
  --button-accent-dark: #5b21b6;

  --bg-main: #F9FAFB;
  --bg-card: #FFFFFF;
  --background-color: #F9FAFB;

  --text-dark: #111827;
  --text-color: #1f2937;
  --text-gray: #6B7280;
  --text-light: #9CA3AF;

  --border-color: #E5E7EB;
  --border-gray: #D1D5DB;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
  --shadow-lg: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-xl: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  margin: 0;
  padding: 0;
  background: var(--bg-main);
  color: var(--text-dark);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
  overflow-y: auto;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.app-header {
  background: var(--bg-card);
  color: var(--text-dark);
  padding: 0.5rem 1rem;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.app-header > div {
  flex: 1;
}

.header-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.button-new-calc {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: white;
  font-weight: 600;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(30, 64, 175, 0.4);
  font-size: 0.9rem;
}

.button-new-calc:hover {
  background: linear-gradient(135deg, #3b82f6 0%, var(--primary-dark) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(30, 64, 175, 0.5);
}

.button-backup {
  background: linear-gradient(135deg, var(--success-color) 0%, var(--success-color) 100%);
  color: white;
  font-weight: 600;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.4);
  font-size: 0.9rem;
}

.button-backup:hover {
  background: linear-gradient(135deg, #34d399 0%, var(--success-color) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(5, 150, 105, 0.5);
}

.app-header h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.2;
}

.app-header h1 .brand {
  color: var(--primary-dark);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.app-header h1 .title {
  font-weight: 600;
  color: var(--text-dark);
  letter-spacing: 0.01em;
}

.app-header .subtitle {
  font-size: 1.2rem;
  color: var(--text-gray);
  margin: 0.2rem 0 0 0;
  font-weight: 500;
  font-family: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: 0.02em;
  display: block;
}

.app-container {
  flex: 1;
  min-height: 0;
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  padding: 0.4rem 0.75rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Calculation History header button */
.button-history {
  background: linear-gradient(135deg, var(--warning-color) 0%, var(--warning-color) 100%);
  color: #1c1917;
  font-weight: 600;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(202, 138, 4, 0.4);
  font-size: 0.9rem;
}

.button-history:hover {
  background: linear-gradient(135deg, #facc15 0%, var(--warning-color) 100%);
  color: #1c1917;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(202, 138, 4, 0.5);
}

/* History panel (full-width below header) */
.history-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.history-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border-bottom: 2px solid var(--warning-color);
  flex-shrink: 0;
}

.history-panel-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--warning-color);
}

.history-panel-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0.5rem;
}

/* Two-column layout: left Kiln Loading, right Cost */
/* Main vertical layout: top split in half, bottom for button & results */
.main-layout-vertical {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
}

/* Top section: split in half horizontally */
.top-section-split {
  flex: 0 0 auto;
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

/* Left half: 3 product blocks vertically */
.left-half {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

/* Right half: 3 cost input blocks vertically */
.right-half {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.right-half-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  color: var(--text-gray);
  font-size: 0.9rem;
  padding: 2rem;
}

/* Bottom section: results only */
.bottom-section {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cost-results-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  width: 100%;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 0.5rem;
}

/* Cost panel grid in right half */
.cost-panel-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cost-grid-two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 0.5rem;
  background: var(--bg-card);
  align-items: start;
}

.cost-left-column,
.cost-right-column {
  display: flex;
  flex-direction: column;
}

/* Align h3 in left and h3/wrapper in right at same level */
.cost-left-column > h3:first-child,
.cost-right-column > .kiln-selection-reason-wrapper {
  min-height: 2.2rem;
  display: flex;
  align-items: flex-start;
}

.cost-left-column > h3 {
  align-self: flex-start;
}

.order-quantity-in-grid {
  grid-column: 1 / -1;
  margin-top: 0.5rem;
}

.order-quantity-in-grid .order-quantity-input {
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0;
}

.order-quantity-in-grid .order-quantity-input h3 {
  border-top: 1px solid var(--border-color);
  padding-top: 0.5rem;
}

.calculate-cost-in-grid {
  grid-column: 1 / -1;
  width: 100%;
  max-width: none;
  margin-top: 0.5rem;
}

.cost-left-column .stone-cost-input h3,
.cost-left-column .stone-cost-input .product-info {
  display: none;
}

.product-area-text {
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-gray);
  padding: 0.5rem;
}

.cost-grid-two-columns h3 {
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--primary-dark);
  line-height: 1.2;
}

.kiln-selection-reason-wrapper {
  min-height: 1.6rem;
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.cost-right-column .kiln-selection-reason {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.2;
}

.cost-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 4.8rem;
}

.product-area-text-right {
  font-size: 0.9rem;
  color: var(--text-gray);
  margin-top: 0.5rem;
  text-align: left;
}

.calculate-cost-full-width {
  width: 100%;
  max-width: none;
}

/* Two-column grid for components */
.two-column-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.two-column-grid .column {
  display: flex;
  flex-direction: column;
}

/* Glaze checkboxes alignment in right column */
.glaze-placement-selector .column .custom-glaze-checkbox:first-child {
  margin-top: 2rem;
}

/* Unified h3 headers for all sections */
.product-type-selector h3,
.glaze-placement-selector h3,
.product-input h3 {
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--primary-dark);
}

/* Left half: product blocks styling */
.left-half .product-type-selector,
.left-half .glaze-placement-selector,
.left-half .product-input {
  flex: 0 0 auto;
  border-top: 3px solid var(--primary-color);
}

.left-half .product-input form {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.left-half .product-input .calculate-loading-button {
  margin-top: 1rem;
  flex-shrink: 0;
}

/* Right half: cost input blocks styling */
.right-half .cost-kiln-selector,
.right-half .stone-cost-input,
.right-half .order-quantity-input {
  flex: 0 0 auto;
  border-top: 3px solid var(--button-accent);
}

/* Unified titles for right half (cost section) */
.right-half .cost-kiln-selector h3,
.right-half .stone-cost-input h3,
.right-half .order-quantity-input h3 {
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--primary-dark);
}

@media (max-width: 1200px) {
  .main-layout-vertical {
    overflow-y: auto;
  }
  .top-section-split {
    flex-direction: column;
  }
  .left-half,
  .right-half {
    width: 100%;
  }
  .two-column-grid {
    grid-template-columns: 1fr;
  }
}

/* Kiln calculation layout - compact, no scroll */
.kiln-calculation-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 0.5rem;
  overflow: hidden;
}

/* Calculate Loading — under the blocks, same size as Calculate Cost */
.calculate-loading-button {
  width: 23%;
  min-width: 184px;
  max-width: 253px;
  margin: 1rem auto 0;
  padding: 0.6rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--success-color) 0%, var(--success-color) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  display: block;
}

.calculate-loading-button:hover {
  background: linear-gradient(135deg, #8b5cf6 0%, var(--button-accent-dark) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
}

.calculate-loading-button:active {
  transform: translateY(0);
}

/* Calculate Cost — under the blocks, same size as Calculate Loading */
.button-action,
.cost-inputs .button-action {
  width: 23%;
  min-width: 184px;
  max-width: 253px;
  margin: 1rem auto 0;
  padding: 0.6rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--button-accent) 0%, var(--button-accent-dark) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  display: block;
}

.button-action:hover,
.cost-inputs .button-action:hover {
  background: linear-gradient(135deg, #8b5cf6 0%, var(--button-accent-dark) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
}

.button-action:active {
  transform: translateY(0);
}

@media (max-width: 1200px) {
  .kiln-calculation-layout {
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: visible;
  }
}

/* Empty state for results area */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-gray);
  font-size: 0.9rem;
  padding: 2rem;
}

.empty-state p {
  margin: 0;
}

/* Input Section - compact */
.input-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 0 0 auto;
  width: 48%;
  max-width: 520px;
  min-width: 380px;
}

.input-section-row {
  display: flex;
  flex-direction: row;
  gap: 0.4rem;
  width: 100%;
}

/* Results Section - no scroll */
.results-section {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow: hidden;
  padding-right: 0.25rem;
}

/* Cards - compact */
.product-input,
.product-type-selector,
.glaze-placement-selector {
  background: var(--bg-card);
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.product-input {
  padding: 0.4rem 0.5rem;
}

.product-input h2,
.product-type-selector h2,
.glaze-placement-selector h2 {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: var(--text-dark);
}

.input-group {
  margin-bottom: 0.25rem;
}

.input-group label {
  font-size: 0.75rem;
}

.input-group input {
  padding: 0.25rem 0.35rem;
  font-size: 0.8rem;
}

.input-group.manager-group {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.select-field,
.manager-select {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-main);
  color: var(--text-dark);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.manager-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.3rem;
  color: var(--text-dark);
  font-size: 0.85rem;
}

.input-group label .hint {
  font-size: 0.7rem;
  color: var(--text-gray);
  font-weight: 400;
  margin-left: 0.25rem;
}

.input-group input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  transition: all 0.2s;
  font-family: inherit;
  background: var(--bg-card);
}

.input-group input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.calculate-button {
  width: 100%;
  padding: 0.65rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: auto; /* Прижимаем кнопку к низу */
  box-shadow: var(--shadow-sm);
}

.calculate-button:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.calculate-button:active {
  transform: translateY(0);
}

/* Radio buttons */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-card);
  font-size: 0.85rem;
}

.radio-label:hover {
  border-color: var(--primary-color);
  background: rgba(37, 99, 235, 0.05);
}

.radio-label input[type='radio'] {
  margin-right: 0.5rem;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.radio-label:has(input:checked) {
  border-color: var(--primary-color);
  background: rgba(37, 99, 235, 0.05);
}

.radio-label input[type='radio']:checked + span {
  color: var(--primary-color);
  font-weight: 600;
}

/* Mode Toggle */
.mode-toggle {
  background: var(--bg-card);
  padding: 1rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.3s;
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.mode-toggle:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.mode-label {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-card);
  font-size: 0.85rem;
}

.mode-label:hover {
  border-color: var(--primary-color);
  background: rgba(37, 99, 235, 0.05);
}

.mode-label input[type='radio'] {
  margin-right: 0.5rem;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.mode-label:has(input:checked) {
  border-color: var(--primary-color);
  background: rgba(37, 99, 235, 0.05);
}

.mode-label input[type='radio']:checked + span {
  color: var(--primary-color);
  font-weight: 600;
}


.cost-kiln-selector,
.stone-cost-input,
.order-quantity-input {
  background: var(--bg-card);
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
}

.cost-kiln-selector:hover,
.stone-cost-input:hover,
.order-quantity-input:hover {
  box-shadow: var(--shadow-md);
}

.cost-kiln-selector h3 {
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: var(--primary-dark);
}

.cost-kiln-selector {
  border-left: 3px solid var(--primary-dark);
}

.stone-cost-input h3,
.order-quantity-input h3 {
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: var(--text-dark);
}

.order-quantity-input .info-text {
  margin: 0.5rem 0 0 0;
  color: var(--text-gray);
}

.kiln-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  background: var(--bg-card);
  color: var(--text-dark);
  transition: all 0.2s;
}

.kiln-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.kiln-select:hover {
  border-color: var(--primary-color);
}

.button-secondary {
  width: 100%;
  padding: 0.5rem 1rem;
  background: var(--bg-main);
  color: var(--text-dark);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.button-secondary:hover {
  background: #F3F4F6;
  border-color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.button {
  width: 100%;
  padding: 0.65rem 1.25rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.button:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.button:active {
  transform: translateY(0);
}

.button-large {
  width: 100%;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
}

.button-large:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.button-large:active {
  transform: translateY(0);
}

.empty-state {
  background: var(--bg-card);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.empty-state p {
  font-size: 0.8rem;
  color: var(--text-gray);
  margin: 0;
}

.input-with-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Cost Parameters */
.cost-parameters {
  background: var(--bg-card);
  padding: 1rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow-y: auto;
  max-height: 100%;
  transition: all 0.3s;
  flex: 1;
  min-width: 250px;
  max-width: 400px;
}

.cost-parameters:hover {
  box-shadow: var(--shadow-lg);
}

.cost-parameters h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--text-dark);
}

.param-section {
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.param-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.param-section h4 {
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--text-dark);
}

.param-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0;
  color: var(--text-gray);
  font-size: 0.8rem;
}

.param-row.total {
  padding-top: 0.5rem;
  margin-top: 0.25rem;
  border-top: 2px solid var(--border-color);
  font-weight: 600;
  color: var(--text-dark);
}

.param-row .highlight {
  color: var(--primary-color);
  font-weight: 600;
}

.param-input {
  width: 70px;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  text-align: right;
  font-size: 0.8rem;
}

.param-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary-color);
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 600;
}

/* Cost Results - compact, no scroll */
.cost-results {
  background: var(--bg-card);
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  min-height: 0;
  height: 100%;
}

.result-header {
  margin-bottom: 0.35rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border-color);
}

.result-header h2 {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-dark);
}

.result-meta {
  display: flex;
  gap: 0.5rem;
}

/* Two column layout for cost results */
.results-two-column-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.results-left-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.results-right-column {
  display: flex;
  flex-direction: column;
}

.results-right-column h4 {
  font-size: 0.7rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-dark);
}

@media (max-width: 900px) {
  .results-two-column-layout {
    grid-template-columns: 1fr;
  }
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
}

@media (max-width: 900px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
}

.results-left-column .price-item {
  padding: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: linear-gradient(135deg, #fef3c7 0%, #fef9e6 100%);
}

.market-result {
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.market-result.indonesia {
  background: linear-gradient(135deg, #fef3c7 0%, #fef9e6 100%);
  border-color: var(--warning-color);
}

.market-result.abroad {
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  border-color: var(--primary-color);
}

.market-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.market-header h3 {
  font-size: 0.95rem;
  margin: 0;
  font-weight: 700;
}

.market-badge {
  padding: 0.15rem 0.5rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 600;
}

.price-item {
  margin-bottom: 0.75rem;
}

.price-item.highlight {
  background: rgba(255, 255, 255, 0.5);
  padding: 0.75rem;
  border-radius: var(--radius-md);
}

.price-label {
  font-size: 1.05rem;
  color: var(--text-gray);
  margin-bottom: 0.25rem;
}

.price-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-dark);
  line-height: 1.2;
}

.price-value.main {
  font-size: 1.5rem;
  color: var(--primary-color);
}

.price-secondary {
  font-size: 1.05rem;
  color: var(--text-gray);
  margin-top: 0.15rem;
}

.margin-info {
  background: rgba(255, 255, 255, 0.5);
  padding: 0.75rem;
  border-radius: var(--radius-md);
}

.margin-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.8rem;
}

.margin-percent {
  color: var(--text-gray);
  font-weight: 600;
}

.margin-percent.success {
  color: var(--success-color);
  font-size: 0.95rem;
}

/* Summary - compact */
.result-summary {
  background: var(--bg-main);
  padding: 0.3rem 0.4rem;
  border-radius: var(--radius-md);
  margin-bottom: 0.25rem;
}

.results-right-column {
  background: var(--bg-main);
  padding: 0.5rem;
  border-radius: var(--radius-md);
}

.result-summary h4,
.results-right-column h4 {
  font-size: 0.7rem;
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: var(--text-dark);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
}

@media (max-width: 900px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 0.1rem 0;
  font-size: 0.65rem;
}

.summary-label {
  color: var(--text-gray);
}

.summary-value {
  font-weight: 600;
  color: var(--text-dark);
}

.summary-value.highlight-debug {
  color: var(--warning-color);
  font-weight: 700;
  background: rgba(249, 115, 22, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
}

/* Coefficients Debug Section */
.coefficients-debug {
  background: rgba(249, 115, 22, 0.05);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  margin-top: 1rem;
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.coefficients-debug h4 {
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--warning-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.coefficients-debug h4::before {
  content: "⚙️";
  font-size: 0.9rem;
}

/* All Parameters Debug Section */
.all-parameters-debug {
  background: linear-gradient(135deg, #fef3c7 0%, #fff9e6 100%);
  border: 3px solid var(--warning-color);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.all-parameters-debug h3 {
  font-size: 1.2rem;
  margin: 0 0 1.5rem 0;
  font-weight: 700;
  color: var(--warning-color);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.debug-section {
  background: white;
  border-radius: var(--radius-md);
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.debug-section:last-child {
  margin-bottom: 0;
}

.debug-section h4 {
  font-size: 0.95rem;
  margin: 0 0 0.75rem 0;
  font-weight: 700;
  color: var(--text-dark);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color);
}

.debug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--bg-gray);
  border-radius: var(--radius-sm);
}

.debug-item.highlight {
  background: linear-gradient(135deg, #fef3c7 0%, #fff9e6 100%);
  border: 2px solid var(--warning-color);
  font-weight: 700;
}

.debug-label {
  font-size: 0.8rem;
  color: var(--text-gray);
  font-weight: 500;
}

.debug-value {
  font-size: 0.85rem;
  color: var(--text-dark);
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.debug-item.highlight .debug-label,
.debug-item.highlight .debug-value {
  color: var(--warning-color);
}

@media (max-width: 768px) {
  .debug-grid {
    grid-template-columns: 1fr;
  }
  
  .all-parameters-debug {
    padding: 1rem;
  }
  
  .all-parameters-debug h3 {
    font-size: 1rem;
  }
}

/* Dual Input Group for Order Quantity */
.dual-input-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.5rem 0;
}

.dual-input-group .input-field {
  flex: 1;
  min-width: 0;
}

.dual-input-group .input-field label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-gray);
  margin-bottom: 0.44rem;
  font-weight: 500;
}

.dual-input-group .input-field input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.2s;
}

.dual-input-group .input-field input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.input-separator {
  font-size: 0.75rem;
  color: var(--text-gray);
  font-weight: 500;
  padding: 0 0.25rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .dual-input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-separator {
    text-align: center;
    margin: 0.25rem 0;
  }
}

.comparison {
  background: rgba(16, 185, 129, 0.1);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  border-left: 3px solid var(--success-color);
}

.comparison h4 {
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-dark);
}

.comparison-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.8rem;
}

.comparison .success {
  color: var(--success-color);
  font-weight: 700;
}

/* Kiln Results - compact */
.multi-kiln-results,
.calculation-results {
  background: var(--bg-card);
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  min-height: 0;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.multi-kiln-results h2,
.calculation-results h2 {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0 0 0.35rem 0;
  color: var(--text-dark);
  flex-shrink: 0;
}

.kiln-results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (max-width: 900px) {
  .kiln-results-grid {
    grid-template-columns: 1fr;
  }
}

.kiln-result-card {
  background: var(--bg-main);
  padding: 1rem;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--primary-color);
}

.kiln-result-card h3 {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--primary-color);
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border-color);
}

.result-item:last-child {
  border-bottom: none;
}

.result-label {
  color: var(--text-gray);
}

.result-value {
  font-weight: 600;
  color: var(--text-dark);
}

.result-value.highlight {
  color: var(--primary-color);
  font-size: 1rem;
}

.average-results {
  background: rgba(37, 99, 235, 0.05);
  padding: 1rem;
  border-radius: var(--radius-md);
  border: 2px solid var(--primary-color);
}

.average-results h3 {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--primary-color);
}

.next-step {
  margin-top: 0.35rem;
  text-align: center;
  flex-shrink: 0;
}

.next-step .button-large {
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
}

.warning-message {
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid var(--danger-color);
  border-radius: var(--radius-md);
  padding: 1rem;
  margin: 1rem 0;
  color: var(--danger-color);
  font-weight: 600;
  text-align: center;
  font-size: 0.9rem;
}

/* Product Type Selector */
.product-type-selector h2 {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--text-dark);
}

.product-type-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.type-group h3 {
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0.5rem 0 0.3rem 0;
  color: var(--text-gray);
}

/* Stone Database */
.stone-database {
  background: var(--bg-card);
  padding: 1rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  max-height: 400px;
  overflow-y: auto;
}

.stone-database h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--text-dark);
}

.stone-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stone-item {
  padding: 0.75rem;
  background: var(--bg-main);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.stone-item:hover {
  border-color: var(--primary-color);
  background: rgba(37, 99, 235, 0.05);
  transform: translateY(-1px);
}

.stone-name {
  font-weight: 600;
  color: var(--text-dark);
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.stone-details {
  font-size: 0.75rem;
  color: var(--text-gray);
}

/* Glaze Placement Selector - дополнительные стили */
/* Базовые стили уже определены выше вместе с product-input и product-type-selector */

.glaze-placement-selector:hover {
  /* Уже определено выше */
}

.glaze-placement-selector h2 {
  /* Уже определено выше */
}

/* Custom Glaze Checkbox */
.custom-glaze-checkbox {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.checkbox-label:hover {
  background: rgba(37, 99, 235, 0.05);
}

.checkbox-label input[type='checkbox'] {
  margin-right: 0.5rem;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.checkbox-label .price-hint {
  color: var(--warning-color);
  font-weight: 600;
  margin-left: 0.25rem;
}

/* Price Input Selector */
.price-input-selector {
  background: var(--bg-card);
  padding: 1rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all 0.3s;
}

.price-input-selector:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.price-input-selector h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--text-dark);
}

.price-mode-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.price-mode-label {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-card);
  font-size: 0.85rem;
}

.price-mode-label:hover {
  border-color: var(--primary-color);
  background: rgba(37, 99, 235, 0.05);
}

.price-mode-label input[type='radio'] {
  margin-right: 0.5rem;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.price-mode-label:has(input:checked) {
  border-color: var(--primary-color);
  background: rgba(37, 99, 235, 0.05);
}

.price-mode-label input[type='radio']:checked + span {
  color: var(--primary-color);
  font-weight: 600;
}

.calculated-info {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-main);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--text-gray);
  text-align: center;
}

.calculated-info strong {
  color: var(--primary-color);
  font-weight: 600;
}

.product-info {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.product-info small {
  font-size: 0.75rem;
  color: var(--text-gray);
}

/* Cost kiln info - информация о выбранной печи в простом режиме */
.cost-kiln-info {
  background: var(--card-bg);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
  box-shadow: var(--shadow-sm);
}

.cost-kiln-info h3 {
  font-size: 0.85rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-gray);
}

.selected-kiln-display {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary-color);
  padding: 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: var(--radius-sm);
  text-align: center;
}

/* Filler info - заполнитель малой печи */
.filler-info {
  margin-top: 12px;
  padding: 12px;
  background: #f0f8ff;
  border: 1px solid #b8daf6;
  border-radius: var(--radius-md);
}

.filler-info .note {
  margin: 0 0 8px 0;
  color: #0066cc;
  font-size: 0.9rem;
}

.filler-breakdown {
  margin: 4px 0;
  font-size: 0.875rem;
}

.filler-details {
  margin: 4px 0;
  color: var(--text-gray);
  font-style: italic;
  font-size: 0.8rem;
}

.total-with-filler {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #b8daf6;
  font-size: 0.9rem;
}

.total-with-filler strong {
  color: var(--text-dark);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-container {
    padding: 0.5rem;
  }
  
  .kiln-calculation-layout,
  .cost-calculation-layout {
    grid-template-columns: 1fr;
  }
  
  .tabs {
    flex-direction: column;
  }
  
  .tab {
    padding: 0.5rem;
    font-size: 0.875rem;
  }
}

/* Kiln Notice - compact */
.kiln-notice {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 10px;
  margin: 4px 0;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.kiln-notice h3 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.5px;
}

/* Filler Summary - compact */
.filler-summary {
  margin-top: 4px;
  padding: 6px 8px;
  background: #f0f8ff;
  border: 1px solid #b8daf6;
  border-radius: 8px;
}

.filler-summary h4 {
  margin: 0 0 4px 0;
  color: #0066cc;
  font-size: 0.8rem;
}

.filler-purpose {
  margin: 0 0 4px 0;
  color: #0066cc;
  font-style: italic;
  font-size: 0.7rem;
}

/* Stone Database Table */
.stone-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.stone-table thead {
  background: #5B9FED;
  color: white;
}

.stone-table th {
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #4A90E2;
}

.stone-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-dark);
  vertical-align: middle;
}

.stone-table tbody tr {
  transition: all 0.2s;
}

.stone-table tbody tr:hover {
  background: rgba(37, 99, 235, 0.05);
}

.stone-table tbody tr:last-child td {
  border-bottom: none;
}

/* Table action buttons */
.button-small {
  padding: 0.4rem 0.85rem;
  font-size: 0.8rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 0.5rem;
  display: inline-block;
}

.button-small:last-child {
  margin-right: 0;
}

.button-small:not(.button-danger) {
  background: var(--primary-color);
  color: white;
  border: none;
}

.button-small:not(.button-danger):hover {
  background: #1D4ED8;
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.button-small.button-danger {
  background: transparent;
  color: var(--danger-color);
  border: 1px solid var(--danger-color);
}

.button-small.button-danger:hover {
  background: var(--danger-color);
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

/* Stone Database Header */
.stone-database-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--border-color);
}

.stone-database-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-dark);
}

/* Stone Form - Add/Edit Stone */
.stone-form {
  background: var(--bg-main);
  padding: 1.25rem;
  border-radius: var(--radius-md);
  margin-bottom: 1.25rem;
  border: 2px solid var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.stone-form .input-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .stone-form .input-row {
    grid-template-columns: 1fr;
  }
}

.stone-form .input-group {
  margin-bottom: 1rem;
}

.stone-form .input-group:last-child {
  margin-bottom: 0;
}

.stone-form .input-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 0.5rem;
}

.stone-form select {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-family: inherit;
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s;
}

.stone-form select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.stone-form select:hover {
  border-color: var(--primary-color);
}

/* ============================================
   KILN RESULTS CARDS - Professional Display
   ============================================ */

.calculation-results.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  color: var(--text-gray);
  font-size: 0.8rem;
}

.kilns-results-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.kiln-result-item {
  background: linear-gradient(135deg, rgba(91, 159, 237, 0.03) 0%, rgba(255, 255, 255, 1) 100%);
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.kiln-result-item:hover {
  border-color: var(--primary-color);
}

.kiln-name {
  font-size: 0.8rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: var(--primary-color);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(91, 159, 237, 0.2);
}

.kiln-stats {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.2rem 0.35rem;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  font-size: 0.75rem;
  transition: all 0.2s;
}

.stat-row:hover {
  background: rgba(37, 99, 235, 0.03);
  border-color: var(--primary-color);
}

.stat-label {
  color: var(--text-gray);
  font-weight: 600;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.stat-value {
  color: var(--text-dark);
  font-weight: 700;
  font-size: 1.05rem;
}

/* Average Result - Special Highlight */
.average-result {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0.04) 100%);
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  border: 3px solid var(--primary-color);
  box-shadow: var(--shadow-lg);
}

.average-result h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 1.25rem 0;
  color: var(--primary-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--primary-color);
}

.average-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.avg-stat {
  background: var(--bg-card);
  padding: 1rem;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid rgba(91, 159, 237, 0.3);
  transition: all 0.2s;
}

.avg-stat:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.avg-label {
  font-size: 0.75rem;
  color: var(--text-gray);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.avg-value {
  font-size: 1.5rem;
  color: var(--primary-color);
  font-weight: 700;
  line-height: 1;
}

/* ============================================
   KILN SELECTOR ENHANCEMENTS
   ============================================ */

/* Disabled kiln selector styling */
.cost-kiln-selector select:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.7;
  color: var(--text-gray);
}

/* Kiln selection reason/explanation */
.kiln-selection-reason {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #EFF6FF;
  border-left: 3px solid var(--primary-color);
  font-size: 0.875rem;
  color: var(--text-dark);
  border-radius: var(--radius-sm);
  line-height: 1.5;
}

/* ============================================
   GREEN BACKGROUNDS FOR EMPTY INPUT FIELDS
   ============================================ */

/* Green background + orange border for empty/unfilled numeric and text inputs */
input[type="number"]:placeholder-shown,
input[type="text"]:placeholder-shown {
  background-color: rgba(16, 185, 129, 0.1) !important;
  border-color: var(--warning-color) !important;
  border-width: 2px;
}

/* Keep green background and orange border when focused but empty */
input[type="number"]:placeholder-shown:focus,
input[type="text"]:placeholder-shown:focus {
  background-color: rgba(16, 185, 129, 0.15) !important;
  border-color: var(--warning-color) !important;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1) !important;
}

/* Normal styling when filled (not showing placeholder) */
input[type="number"]:not(:placeholder-shown),
input[type="text"]:not(:placeholder-shown) {
  background-color: var(--bg-card);
  border-color: var(--border-color);
  border-width: 1px;
}

/* Exception: Don't apply green background to radio buttons or checkboxes */
input[type="radio"],
input[type="checkbox"] {
  background-color: transparent !important;
  border-color: var(--border-color) !important;
  border-width: 1px !important;
}

/* ============================================
   MANAGER SELECTOR
   ============================================ */

.manager-selector {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.manager-selector h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-dark);
  margin: 0 0 0.75rem 0;
}

.manager-select {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s;
}

.manager-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.hint-text {
  color: var(--warning-color);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

/* ============================================
   CALCULATION HISTORY
   ============================================ */

.calculation-history {
  flex: 1;
  min-height: 0;
  padding: 0.35rem 0.5rem;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.history-header {
  margin-bottom: 0.35rem;
  flex-shrink: 0;
}

.history-header h2 {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-dark);
  margin: 0 0 0.15rem 0;
}

.history-header .subtitle {
  font-size: 0.65rem;
}

.history-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0.5rem;
  max-width: 100%;
  overflow: hidden;
}

@media (max-width: 1400px) {
  .history-layout {
    grid-template-columns: 1fr;
  }
}

.history-list {
  min-height: 0;
  overflow: hidden;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  font-size: 0.7rem;
}

.history-table thead {
  background: var(--primary-color);
  color: white;
}

.history-table th,
.history-table td {
  padding: 0.2rem 0.35rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.history-table th {
  font-weight: 600;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.history-table tbody tr {
  cursor: pointer;
  transition: background 0.2s;
}

.history-table tbody tr:hover {
  background: rgba(37, 99, 235, 0.05);
}

.history-table tbody tr.selected {
  background: rgba(37, 99, 235, 0.1);
  border-left: 3px solid var(--primary-color);
}

.history-table tbody tr:last-child td {
  border-bottom: none;
}

.history-details {
  background: var(--bg-card);
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.history-details h3 {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0 0 0.35rem 0;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--primary-color);
  flex-shrink: 0;
}

.detail-section {
  margin-bottom: 0.35rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.7rem;
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.detail-section h4 {
  color: var(--text-dark);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
}

.detail-section p {
  margin: 0.5rem 0;
  color: var(--text-color);
  font-size: 0.9rem;
  line-height: 1.5;
}

.detail-section ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}

.detail-section li {
  padding: 0.25rem 0;
  color: var(--text-color);
  font-size: 0.9rem;
}

.price-results {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

.price-market {
  background: var(--bg-main);
  padding: 1rem;
  border-radius: var(--radius-md);
  border-left: 3px solid var(--primary-color);
}

.price-market h5 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary-color);
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.price-market p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-gray);
}

.empty-state p {
  margin: 0.5rem 0;
}

/* ============================================
   BACKUP MANAGEMENT
   ============================================ */

.backup-management {
  padding: 0;
  max-width: 100%;
}

.backup-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--bg-card);
  padding: 1rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border-left: 4px solid var(--primary-color);
}

.stat-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-color);
  margin: 0 0 0.75rem 0;
}

.stat-card p {
  margin: 0.4rem 0;
  color: var(--text-color);
  font-size: 0.875rem;
}

.stat-card strong {
  color: var(--text-dark);
}

.backup-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.action-group {
  background: var(--bg-card);
  padding: 1rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.action-group h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-dark);
  margin: 0 0 0.75rem 0;
}

.action-group button {
  width: 100%;
  margin-bottom: 0.5rem;
  padding: 0.6rem;
  font-size: 0.875rem;
}

.action-group button:last-child {
  margin-bottom: 0;
}

.file-upload-btn {
  display: inline-block;
  cursor: pointer;
  text-align: center;
}

.loading-text {
  color: var(--primary-color);
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.danger-zone {
  border-left: 4px solid var(--danger-color);
}

.danger-zone h3 {
  color: var(--danger-color);
}

.backup-auth-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 1rem 0;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--border-color);
}

.backup-auth-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-dark);
}

.logout-button {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.backup-modal-content {
  max-width: 90vw;
  width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  font-size: 2rem;
  color: var(--text-gray);
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
}

.modal-close:hover {
  color: var(--danger-color);
  transform: scale(1.1);
}

.button-primary {
  background: var(--primary-color);
  color: white;
  border: none;
}

.button-primary:hover {
  background: var(--primary-dark);
}

/* ============================================
   MODAL OVERLAY & CONTENT
   ============================================ */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
}

.modal-content {
  position: relative;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalFadeIn 0.2s ease;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
````

## File: src/index.css

````css
:root {
  --primary-color: #2563eb;
  --primary-dark: #1e40af;
  --secondary-color: #10b981;
  --background: #f8fafc;
  --surface: #ffffff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--background);
  color: var(--text-primary);
  line-height: 1.5;
  height: 100vh;
  overflow: hidden;
}

#root {
  height: 100vh;
  overflow: hidden;
}
````

## File: src/vite-env.d.ts

````ts
/// <reference types="vite/client" />
````

## File: src/types/index.ts

````ts
export type KilnType = 'big' | 'small';
export type SelectedKilns = KilnType[];

export interface KilnDimensions {
  width: number;
  depth: number;
  height?: number;
}

export interface KilnConfig {
  name: string;
  dimensions: KilnDimensions;
  offset: number;
  workingArea: KilnDimensions;
  coefficient: number;
  multiLevel: boolean;
}

export interface ProductDimensions {
  length: number;  // длина в см
  width: number;   // ширина в см
  thickness: number; // толщина в см
}

export type LoadingMethod = 'edge' | 'flat' | 'combined';

export interface LoadingCalculation {
  method: LoadingMethod;
  methodName: string;
  totalPieces: number;
  totalArea: number; // м²
  levels: number;
  edgePieces?: number;
  flatPieces?: number;
  edgeArea?: number;
  flatArea?: number;
  filler?: {
    fillerPieces: number;
    fillerArea: number;
    fillerDetails: string;
  };
}

export interface CalculationResult {
  kiln: KilnConfig;
  product: ProductDimensions;
  optimalLoading: LoadingCalculation;
  alternativeLoading?: LoadingCalculation;
}

// ============ Cost Calculator Types ============

// Типы изделий
export type ProductType = 'tile' | 'countertop' | 'sink' | '3d';
export type TileShape = 'square' | 'rectangle' | 'round' | 'freeform' | 'triangle';
export type GlazePlacement = 'face-only' | 'face-1-2-edges' | 'face-3-4-edges' | 'face-with-back';

// Рынки
export type Market = 'indonesia' | 'abroad';

// Параметры стоимости
export interface CostParameters {
  // CAPEX & OPEX (фиксированные)
  capex: number; // mil Rp
  opex: number; // mil Rp / month
  
  // Price per 1 firing (автоматически)
  electricityCost: number; // mil Rp
  salaryTaxes: number; // mil Rp
  
  // Price per 1 m2 (частично вручную, частично авто)
  stoneCost: number; // mil Rp - ВРУЧНУЮ из базы
  vat: number; // mil Rp
  packing: number; // mil Rp - ЛОГИКА
  deliveryCost: number; // mil Rp
  stoneDefectPercent: number; // % - ЛОГИКА
  stoneDefectCost: number; // mil Rp
  totalStone: number; // mil Rp (рассчитывается)
  
  // Angobe and Glazes
  angobeGlazesStandard: number; // mil Rp
  angobeCoefficient: number; // множитель - ЛОГИКА
  angobeGlazesTotal: number; // mil Rp (рассчитывается)
  
  // Expenses (только в hard mode)
  defectExpensesPercent?: number; // % ORANGE
  defectExpensesCost?: number; // mil Rp
  salesExpensesPercent?: number; // % ORANGE
  salesExpensesCost?: number; // mil Rp
  otherExpensesPercent?: number; // % ORANGE
  otherExpensesCost?: number; // mil Rp
  
  totalExpenses: number; // mil Rp
  vatOnExpenses: number; // mil Rp
  
  // Margin
  marginPercent: number; // % (вручную или по умолчанию)
  marginValue: number; // mil Rp
}

// База данных камней
export interface StoneEntry {
  id: string;
  name: string; // название камня
  pricePerUnit: number; // mil Rp
  pricePerM2: number; // mil Rp
  dateAdded: Date;
  productType?: ProductType;
  sizeRange?: string; // например "10x10-20x20"
  thickness?: number; // толщина в см
}

// Расширенные размеры продукта с типом
export interface ProductWithType extends ProductDimensions {
  type: ProductType;
  shape?: TileShape;
  glaze?: GlazePlacement;
  orderQuantity?: number; // Количество штук в заказе
  customGlazeColor?: boolean; // Кастомный цвет глазури (150k IDR за м²)
  useBrush?: boolean; // Использование кисти (100k IDR за м²)
}

// Результат расчета стоимости
export interface CostCalculationResult {
  // Входные данные
  product: ProductWithType;
  kiln: KilnConfig;
  kilnLoading: LoadingCalculation;
  orderQuantity: number;
  productArea: number; // м²
  
  // Параметры
  parameters: CostParameters;
  
  // Детальная разбивка расчета
  breakdown: {
    stoneCost: number; // базовая цена камня
    stoneWithDefect: number; // камень с браком
    angobeGlazesTotal: number; // ангобы/глазури
    electricity: number; // электричество
    salary: number; // зарплата
    firingCost: number; // общая стоимость обжига
    baseCost: number; // себестоимость до расчета цены
    defectCost: number; // расходы на дефект
    salesCost: number; // расходы на продажи
    otherCost: number; // прочие расходы
    totalExpenses: number; // ИТОГО ЗАТРАТЫ (себестоимость + все расходы)
    vatAmount: number; // НДС
    priceWithVAT: number; // СУММА С НДС
    finalPrice: number; // ПРОДАЖНАЯ ЦЕНА
  };
  
  // Результаты для Indonesia
  indonesia: {
    pricePerSqM: number; // IDR
    pricePerPcs: number; // IDR
    margin: number;
    marginPercent: number;
  };
  
  // Результаты для Abroad
  abroad: {
    pricePerSqM: number; // IDR
    pricePerPcs: number; // IDR
    margin: number;
    marginPercent: number;
  };
}

// ============ Calculation History Types ============

// Manager names
export type ManagerName = 'Stas' | 'Konstantin' | 'Febby' | 'Anna';

// Calculation history entry
export interface CalculationHistoryEntry {
  id: string;
  dateCreated: Date;
  manager: ManagerName;
  
  // Product info
  productType: ProductType;
  tileShape?: TileShape;
  dimensions: {
    length: number;
    width: number;
    thickness: number;
  };
  glazePlacement: GlazePlacement;
  
  // Kiln loading results
  kilnUsed: KilnType | 'average';
  loadingArea: number; // m²
  loadingPieces: number;
  
  // Cost calculation
  orderQuantity: number;
  stoneCost: number;
  costResult: CostCalculationResult;
}
````

## File: src/components/ApprovalWarningModal.css

````css
.approval-modal-content {
  max-width: 700px;
  padding: 40px;
}

.approval-modal-header h2 {
  margin: 0;
  color: #f59e0b;
  font-size: 32px;
  text-align: center;
}

.approval-modal-body {
  padding: 30px 0;
  text-align: center;
}

.warning-icon {
  font-size: 72px;
  margin-bottom: 24px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.warning-text {
  text-align: left;
}

.warning-main {
  font-size: 22px;
  color: #1a1a1a;
  margin: 0 0 20px 0;
  text-align: center;
}

.warning-detail {
  font-size: 18px;
  color: #444;
  line-height: 1.6;
  margin: 0 0 30px 0;
}

.approval-notice {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.approval-notice h3 {
  margin: 0 0 12px 0;
  color: #92400e;
  font-size: 20px;
}

.approval-notice p {
  margin: 0;
  color: #78350f;
  font-size: 16px;
  line-height: 1.5;
}

.approval-modal-footer {
  display: flex;
  justify-content: center;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.approval-modal-footer button {
  min-width: 300px;
  font-size: 18px;
  padding: 14px 32px;
}

@media (max-width: 768px) {
  .approval-modal-content {
    padding: 30px 20px;
  }
  
  .warning-icon {
    font-size: 56px;
  }
  
  .approval-modal-header h2 {
    font-size: 24px;
  }
  
  .warning-main {
    font-size: 18px;
  }
  
  .warning-detail {
    font-size: 16px;
  }
  
  .approval-modal-footer button {
    min-width: auto;
    width: 100%;
    font-size: 16px;
  }
}
````

## File: src/components/ApprovalWarningModal.tsx

````tsx
import { TileShape } from '../types';
import './ApprovalWarningModal.css';

interface ApprovalWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions: {
    length: number;
    width: number;
    shape: TileShape;
  };
}

export function ApprovalWarningModal({ isOpen, onClose, dimensions }: ApprovalWarningModalProps) {
  if (!isOpen) return null;
  
  // Format dimensions based on shape
  const formatDimensions = () => {
    if (dimensions.shape === 'round') {
      return `Diameter: ${dimensions.length} cm`;
    }
    return `${dimensions.length} × ${dimensions.width} cm`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content approval-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="approval-modal-header">
          <h2>⚠️ Approval Required!</h2>
        </div>
        
        <div className="approval-modal-body">
          <div className="warning-icon">⚠️</div>
          
          <div className="warning-text">
            <p className="warning-main">
              <strong>Product size: {formatDimensions()}</strong>
            </p>
            
            <p className="warning-detail">
              Products larger than <strong>60 × 80 cm</strong> require final price approval.
            </p>
            
            <div className="approval-notice">
              <h3>📋 Please consult with Stanislav</h3>
              <p>
                During program debugging, all calculations for large products 
                require additional verification.
              </p>
            </div>
          </div>
        </div>

        <div className="approval-modal-footer">
          <button className="button button-primary" onClick={onClose}>
            ✓ Understood, I will consult with Stanislav
          </button>
        </div>
      </div>
    </div>
  );
}
````

## File: src/components/BackupLogin.css

````css
.backup-login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
  padding: 2rem;
  background: var(--bg-main);
}

.login-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 2.5rem;
  max-width: 450px;
  width: 100%;
  border: 1px solid var(--border-color);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-dark);
  margin: 0 0 0.5rem 0;
}

.login-header p {
  color: var(--text-gray);
  font-size: 0.95rem;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--text-dark);
  font-size: 0.95rem;
}

.form-group input {
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: all 0.2s ease;
  background: var(--bg-main);
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: var(--danger-color);
  font-size: 0.9rem;
  text-align: center;
}

.login-button {
  width: 100%;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.login-footer .hint {
  text-align: center;
  margin: 0;
  color: var(--text-gray);
}

.login-footer code {
  background: var(--bg-main);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: var(--primary-color);
  font-weight: 600;
}
````

## File: src/components/BackupLogin.tsx

````tsx
import { useState } from 'react';
import './BackupLogin.css';

interface BackupLoginProps {
  onLogin: () => void;
}

export function BackupLogin({ onLogin }: BackupLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate checking credentials
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        // Save to sessionStorage (clears on browser close)
        sessionStorage.setItem('backup_auth', 'true');
        onLogin();
      } else {
        setError('❌ Invalid username or password');
        setPassword('');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="backup-login">
      <div className="login-container">
        <div className="login-header">
          <h2>🔒 Backup Access</h2>
          <p>This section requires administrator authentication</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="button button-primary login-button"
            disabled={isLoading}
          >
            {isLoading ? '🔄 Checking...' : '🔓 Login'}
          </button>
        </form>

        <div className="login-footer">
          <p className="hint">
            <small>
              💡 Session expires when browser closes
            </small>
          </p>
        </div>
      </div>
    </div>
  );
}
````

## File: src/components/BackupManagement.tsx

````tsx
import { useState, useEffect } from 'react';
import { 
  getBackupStats, 
  createFullBackup, 
  createIncrementalBackup,
  exportBackupToFile,
  importBackupFromFile,
  clearAllBackups,
  getLastFullBackup
} from '../utils/backup';
import { clearStoneDatabase } from '../utils/stoneDatabase';
import { clearCalculationHistory } from '../utils/calculationHistory';

export function BackupManagement() {
  const [stats, setStats] = useState(getBackupStats());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    // Update stats every 10 seconds
    const interval = setInterval(() => {
      setStats(getBackupStats());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleCreateFullBackup = () => {
    createFullBackup();
    setStats(getBackupStats());
    alert('✅ Full backup created successfully!');
  };

  const handleCreateIncrementalBackup = () => {
    const backup = createIncrementalBackup();
    setStats(getBackupStats());
    if (backup) {
      alert('💾 Incremental backup created successfully!');
    } else {
      alert('⏭️ No changes to backup');
    }
  };

  const handleExportBackup = () => {
    const backup = getLastFullBackup();
    if (backup) {
      exportBackupToFile(backup);
      alert('📥 Backup exported to downloads folder!');
    } else {
      alert('❌ No backup available to export');
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    importBackupFromFile(file)
      .then(() => {
        setStats(getBackupStats());
        setImporting(false);
        alert('✅ Backup imported and restored successfully!');
        window.location.reload(); // Reload to show restored data
      })
      .catch((error) => {
        setImporting(false);
        alert(`❌ Error importing backup: ${error.message}`);
      });
  };

  const handleClearStoneDatabase = () => {
    if (confirm('⚠️ Are you sure you want to clear the stone database? This action cannot be undone!')) {
      clearStoneDatabase();
      setStats(getBackupStats());
      alert('🗑️ Stone database cleared');
    }
  };

  const handleClearCalculationHistory = () => {
    if (confirm('⚠️ Are you sure you want to clear all calculation history? This action cannot be undone!')) {
      clearCalculationHistory();
      setStats(getBackupStats());
      alert('🗑️ Calculation history cleared');
    }
  };

  const handleClearAllBackups = () => {
    if (confirm('⚠️ Are you sure you want to clear ALL backups? This action cannot be undone!')) {
      clearAllBackups();
      setStats(getBackupStats());
      alert('🗑️ All backups cleared');
    }
  };

  /** Clear stone DB + calculation history, then create full backup (e.g. before deploy) */
  const handleResetDataAndBackup = () => {
    if (!confirm('Reset stone database and calculation history, then create a full backup? This cannot be undone.')) {
      return;
    }
    clearStoneDatabase();
    clearCalculationHistory();
    createFullBackup();
    setStats(getBackupStats());
    alert('✅ Data reset. Full backup created with empty databases. Use Export to save the backup file.');
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="backup-management">
      <div className="backup-stats">
        <div className="stat-card">
          <h3>📊 Statistics</h3>
          <p><strong>Stones:</strong> {stats.totalStones}</p>
          <p><strong>Calculations:</strong> {stats.totalCalculations}</p>
          <p><strong>Incremental Backups:</strong> {stats.incrementalBackupsCount}</p>
        </div>

        <div className="stat-card">
          <h3>⏰ Last Backups</h3>
          <p><strong>Full:</strong> {formatDate(stats.lastFullBackup)}</p>
          <p><strong>Incremental:</strong> {formatDate(stats.lastIncrementalBackup)}</p>
        </div>
      </div>

      <div className="backup-actions">
        <div className="action-group">
          <h3>Manual Backup</h3>
          <button 
            className="button button-primary"
            onClick={handleCreateFullBackup}
          >
            🔄 Full Backup
          </button>
          <button 
            className="button button-secondary"
            onClick={handleCreateIncrementalBackup}
          >
            💾 Incremental
          </button>
        </div>

        <div className="action-group">
          <h3>Export / Import</h3>
          <button 
            className="button button-secondary"
            onClick={handleExportBackup}
          >
            📥 Export
          </button>
          <label className="button button-secondary file-upload-btn">
            📤 Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              disabled={importing}
              style={{ display: 'none' }}
            />
          </label>
          {importing && <p className="loading-text">Importing...</p>}
        </div>

        <div className="action-group danger-zone">
          <h3>⚠️ Danger Zone</h3>
          <button
            className="button button-primary"
            onClick={handleResetDataAndBackup}
            title="Clear stones and history, then create full backup (e.g. before deploy)"
          >
            🔄 Reset data & create backup
          </button>
          <button 
            className="button button-danger"
            onClick={handleClearStoneDatabase}
          >
            🗑️ Clear Stones
          </button>
          <button 
            className="button button-danger"
            onClick={handleClearCalculationHistory}
          >
            🗑️ Clear History
          </button>
          <button 
            className="button button-danger"
            onClick={handleClearAllBackups}
          >
            🗑️ Clear Backups
          </button>
        </div>
      </div>
    </div>
  );
}
````

## File: src/components/CalculationHistory.tsx

````tsx
import { useState, useEffect } from 'react';
import { CalculationHistoryEntry } from '../types';
import { getRecentCalculations, deleteCalculationFromHistory } from '../utils/calculationHistory';

export function CalculationHistory() {
  const [history, setHistory] = useState<CalculationHistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CalculationHistoryEntry | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const data = getRecentCalculations(50);
    setHistory(data);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this calculation?')) {
      deleteCalculationFromHistory(id);
      setSelectedEntry(null);
      loadHistory();
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="calculation-history">
      <div className="history-header">
        <h2>Calculation History</h2>
        <p className="subtitle">View all saved calculations ({history.length} total)</p>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <p>No calculations saved yet</p>
          <p className="hint-text">Complete a cost calculation to save it here</p>
        </div>
      ) : (
        <div className="history-layout">
          <div className="history-list">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Manager</th>
                  <th>Product</th>
                  <th>Dimensions (cm)</th>
                  <th>Quantity</th>
                  <th>Price/pcs (IDR)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr 
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={selectedEntry?.id === entry.id ? 'selected' : ''}
                  >
                    <td>{formatDate(entry.dateCreated)}</td>
                    <td><strong>{entry.manager}</strong></td>
                    <td>
                      {entry.productType}
                      {entry.tileShape && ` (${entry.tileShape})`}
                    </td>
                    <td>
                      {entry.dimensions.length}×{entry.dimensions.width}×{entry.dimensions.thickness}
                    </td>
                    <td>{entry.orderQuantity.toLocaleString()}</td>
                    <td>{entry.costResult.indonesia.pricePerPcs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
                    <td>
                      <button
                        className="button-small button-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entry.id);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedEntry && (
            <div className="history-details">
              <h3>Calculation Details</h3>
              
              <div className="detail-section">
                <h4>General Info</h4>
                <p><strong>Manager:</strong> {selectedEntry.manager}</p>
                <p><strong>Date:</strong> {formatDate(selectedEntry.dateCreated)}</p>
                <p><strong>Product Type:</strong> {selectedEntry.productType}</p>
                {selectedEntry.tileShape && <p><strong>Shape:</strong> {selectedEntry.tileShape}</p>}
                <p><strong>Kiln Used:</strong> {selectedEntry.kilnUsed}</p>
              </div>
              
              <div className="detail-section">
                <h4>Product Details</h4>
                <p><strong>Dimensions:</strong> {selectedEntry.dimensions.length}×{selectedEntry.dimensions.width}×{selectedEntry.dimensions.thickness} cm</p>
                <p><strong>Glaze:</strong> {selectedEntry.glazePlacement}</p>
                <p><strong>Order Quantity:</strong> {selectedEntry.orderQuantity.toLocaleString()} pcs</p>
                <p><strong>Stone Cost:</strong> {selectedEntry.stoneCost.toFixed(3)} mil Rp/m²</p>
              </div>
              
              <div className="detail-section">
                <h4>Kiln Loading</h4>
                <p><strong>Total Pieces:</strong> {selectedEntry.loadingPieces} pcs</p>
                <p><strong>Total Area:</strong> {selectedEntry.loadingArea.toFixed(2)} m²</p>
              </div>
              
              <div className="detail-section">
                <h4>Price Results</h4>
                <div className="price-results">
                  <div className="price-market">
                    <h5>Indonesia Market</h5>
                    <p>Per m²: <strong>{selectedEntry.costResult.indonesia.pricePerSqM.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} IDR</strong></p>
                    <p>Per piece: <strong>{selectedEntry.costResult.indonesia.pricePerPcs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} IDR</strong></p>
                    <p>Margin: <strong>{selectedEntry.costResult.indonesia.marginPercent.toFixed(1)}%</strong></p>
                  </div>
                  
                  <div className="price-market">
                    <h5>Abroad Market</h5>
                    <p>Per m²: <strong>{selectedEntry.costResult.abroad.pricePerSqM.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} IDR</strong></p>
                    <p>Per piece: <strong>{selectedEntry.costResult.abroad.pricePerPcs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} IDR</strong></p>
                    <p>Margin: <strong>{selectedEntry.costResult.abroad.marginPercent.toFixed(1)}%</strong></p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
````

## File: src/components/CalculationResults.tsx

````tsx
import React from 'react';
import { CalculationResult, ProductWithType } from '../types';

interface CalculationResultsProps {
  result: CalculationResult | null;
}

export const CalculationResults: React.FC<CalculationResultsProps> = ({
  result,
}) => {
  if (!result) {
    return (
      <div className="calculation-results empty">
        <p>Enter product dimensions and click "Calculate Loading"</p>
      </div>
    );
  }

  const { kiln, product, optimalLoading, alternativeLoading } = result;

  return (
    <div className="calculation-results">
      <h2>Calculation Results</h2>

      <div className="result-section">
        <div className="result-header">
          <span className="checkmark">✓</span>
          <strong>Optimal method: {optimalLoading.methodName}</strong>
        </div>

        <div className="result-stats">
          <div className="stat-item">
            <span className="stat-icon">📦</span>
            <div className="stat-content">
              <div className="stat-label">Number of pieces</div>
              <div className="stat-value">{optimalLoading.totalPieces} pcs</div>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-icon">📐</span>
            <div className="stat-content">
              <div className="stat-label">Loading area</div>
              <div className="stat-value">
                {optimalLoading.totalArea.toFixed(2)} m²
              </div>
            </div>
          </div>

          {kiln.multiLevel && (
            <div className="stat-item">
              <span className="stat-icon">📊</span>
              <div className="stat-content">
                <div className="stat-label">Number of levels</div>
                <div className="stat-value">{optimalLoading.levels}</div>
              </div>
            </div>
          )}
        </div>

        {optimalLoading.method === 'combined' && (
          <div className="distribution">
            <h3>Distribution:</h3>
            <ul>
              <li>
                On edge: {optimalLoading.edgePieces} pcs (
                {optimalLoading.edgeArea?.toFixed(2)} m²)
              </li>
              <li>
                Flat on top: {optimalLoading.flatPieces} pcs (
                {optimalLoading.flatArea?.toFixed(2)} m²)
              </li>
            </ul>
          </div>
        )}
      </div>

      {alternativeLoading && (
        <div className="alternative-section">
          <h3>Alternative method: {alternativeLoading.methodName}</h3>
          <div className="alternative-stats">
            <p>
              <strong>Quantity:</strong> {alternativeLoading.totalPieces} pcs
            </p>
            <p>
              <strong>Area:</strong>{' '}
              {alternativeLoading.totalArea.toFixed(2)} m²
            </p>
            {kiln.multiLevel && (
              <p>
                <strong>Levels:</strong> {alternativeLoading.levels}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="product-info">
        <h3>Information</h3>
        <p>
          <strong>Kiln:</strong> {kiln.name}
        </p>
        <p>
          <strong>Product size:</strong>{' '}
          {(product as ProductWithType).shape === 'round'
            ? `Diameter: ${product.length} × thickness: ${product.thickness} cm`
            : `${product.length} × ${product.width} × ${product.thickness} cm`
          }
        </p>
        <p>
          <strong>Kiln coefficient:</strong> {kiln.coefficient}
        </p>
      </div>
    </div>
  );
};
````

## File: src/components/CostResults.tsx

````tsx
import { CostCalculationResult, Market } from '../types';
import { formatIDR, formatNumber } from '../utils/costCalculations';

interface CostResultsProps {
  result: CostCalculationResult;
  selectedMarket: Market;
}

export function CostResults({ result, selectedMarket }: CostResultsProps) {
  const isAverage = result.kiln.name.includes('Average');
  
  // Get market-specific data
  const marketData = selectedMarket === 'indonesia' ? result.indonesia : result.abroad;
  const marketFlag = selectedMarket === 'indonesia' ? '🇮🇩' : '🌍';
  const marketName = selectedMarket === 'indonesia' ? 'Indonesia' : 'Abroad';
  
  return (
    <div className="cost-results">
      <div className="result-header">
        <h2>{marketFlag} Cost Calculation Results ({marketName})</h2>
      </div>

      <div className="results-two-column-layout">
        {/* Left column: Prices */}
        <div className="results-left-column">
          <div className="price-item">
            <div className="price-label">Price per 1 m²</div>
            <div className="price-value">{formatIDR(marketData.pricePerSqM)}</div>
            <div className="price-secondary">
              {formatNumber(marketData.pricePerSqM / 1000000, 2)} mil Rp
            </div>
          </div>

          <div className="price-item highlight">
            <div className="price-label">Price per 1 piece</div>
            <div className="price-value main">{formatIDR(marketData.pricePerPcs)}</div>
            <div className="price-secondary">
              {formatNumber(marketData.pricePerPcs / 1000000, 3)} mil Rp
            </div>
          </div>

          {/* Kiln info - IN CAPITAL LETTERS for non-tiles */}
          {!isAverage && (
            <div className="kiln-notice">
              <h3>KILN ONLY {result.kiln.name.toUpperCase()}</h3>
            </div>
          )}
        </div>

        {/* Right column: Detailed placement information */}
        <div className="results-right-column">
          <h4>Detailed Kiln Placement Description</h4>
          <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Kiln:</span>
            <span className="summary-value">{result.kiln.name}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Loading method:</span>
            <span className="summary-value">{result.kilnLoading.methodName}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Pieces in kiln:</span>
            <span className="summary-value">{result.kilnLoading.totalPieces} pcs</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Loading area:</span>
            <span className="summary-value">{result.kilnLoading.totalArea.toFixed(2)} m²</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Levels:</span>
            <span className="summary-value">{result.kilnLoading.levels}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Product size:</span>
            <span className="summary-value">
              {result.product.shape === 'round' 
                ? `Diameter: ${result.product.length} × thickness: ${result.product.thickness} cm`
                : `${result.product.length} × ${result.product.width} × ${result.product.thickness} cm`
              }
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
````

## File: src/components/ErrorModal.css

````css
.error-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.error-modal-content {
  background: white;
  border-radius: 16px;
  padding: 2.5rem 3rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.error-icon {
  font-size: 3.5rem;
  color: #EF4444;
  margin-bottom: 1rem;
  font-weight: bold;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #EF4444;
  margin: 0 0 1.5rem 0;
  line-height: 1.4;
}

.error-reason {
  font-size: 1.125rem;
  color: #374151;
  margin-bottom: 2rem;
  line-height: 1.6;
  padding: 1rem;
  background: #FEF2F2;
  border-radius: 8px;
  border-left: 4px solid #EF4444;
}

.error-ok-button {
  background: #2563EB;
  color: white;
  border: none;
  padding: 0.875rem 2.5rem;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.error-ok-button:hover {
  background: #1D4ED8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}

.error-ok-button:active {
  transform: translateY(0);
}
````

## File: src/components/ErrorModal.tsx

````tsx
import './ErrorModal.css';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
}

export function ErrorModal({ isOpen, onClose, reason }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="error-modal-overlay" onClick={onClose}>
      <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="error-icon">✗</div>
        <h2 className="error-title">Product doesn't fit<br/>in any kiln</h2>
        <div className="error-reason">{reason}</div>
        <button className="error-ok-button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
````

## File: src/components/GlazePlacementSelector.tsx

````tsx
import { GlazePlacement, TileShape, ProductType } from '../types';

interface GlazePlacementSelectorProps {
  glazePlacement?: GlazePlacement;
  onGlazePlacementChange: (glaze: GlazePlacement) => void;
  tileShape?: TileShape; // Add for selection restriction
  productType?: ProductType; // Add for filtering options
  customGlazeColor?: boolean;
  onCustomGlazeColorChange?: (value: boolean) => void;
  useBrush?: boolean;
  onUseBrushChange?: (value: boolean) => void;
}

export function GlazePlacementSelector({
  glazePlacement,
  onGlazePlacementChange,
  tileShape,
  productType,
  customGlazeColor = false,
  onCustomGlazeColorChange,
  useBrush = false,
  onUseBrushChange,
}: GlazePlacementSelectorProps) {
  // Determine available options depending on product type
  const getAvailableOptions = (): GlazePlacement[] => {
    if (productType === 'sink') {
      // For sinks: only face-only and face-3-4-edges (edges)
      return ['face-only', 'face-3-4-edges'];
    } else if (productType === 'countertop') {
      // For countertops: face-only, face-3-4-edges, face-with-back
      return ['face-only', 'face-3-4-edges', 'face-with-back'];
    } else if (productType === '3d') {
      // For 3D: face-only and face-3-4-edges (all edges)
      return ['face-only', 'face-3-4-edges'];
    } else {
      // For tiles: all options except face-1-2-edges for round
      if (tileShape === 'round') {
        return ['face-only', 'face-3-4-edges', 'face-with-back'];
      }
      return ['face-only', 'face-1-2-edges', 'face-3-4-edges', 'face-with-back'];
    }
  };

  const availableOptions = getAvailableOptions();
  const isRound = tileShape === 'round';
  const isSinkOrCountertop = productType === 'sink' || productType === 'countertop';

  const getGlazeLabel = (option: GlazePlacement): string => {
    if (option === 'face-only') return 'Face only';
    if (option === 'face-1-2-edges') return 'Face + 1-2 edges';
    if (option === 'face-3-4-edges') {
      if (productType === '3d') return 'Face + all edges';
      if (isSinkOrCountertop || isRound) return 'Face + edges';
      return 'Face + 3-4 edges';
    }
    if (option === 'face-with-back') return 'Face with back';
    return option;
  };

  return (
    <div className="glaze-placement-selector">
      <div className="two-column-grid">
        <div className="column">
          <h3>Glaze Placement</h3>
          <select 
            value={glazePlacement} 
            onChange={(e) => onGlazePlacementChange(e.target.value as GlazePlacement)}
            className="select-field"
          >
            {availableOptions.map(option => (
              <option key={option} value={option}>
                {getGlazeLabel(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="column">
          {/* Custom color checkbox */}
          {onCustomGlazeColorChange && (
            <div className="custom-glaze-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={customGlazeColor}
                  onChange={(e) => onCustomGlazeColorChange(e.target.checked)}
                />
                <span>Custom glaze color <span className="price-hint">(150,000 IDR/m²)</span></span>
              </label>
            </div>
          )}

          {/* Brush application checkbox */}
          {onUseBrushChange && (
            <div className="custom-glaze-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useBrush}
                  onChange={(e) => onUseBrushChange(e.target.checked)}
                />
                <span>Brush application <span className="price-hint">(100,000 IDR/m²)</span></span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
````

## File: src/components/KilnSelector.tsx

````tsx
import React from 'react';
import { KilnType } from '../types';
import { KILNS } from '../utils/constants';

interface KilnSelectorProps {
  selectedKilns: KilnType[];
  onKilnsChange: (kilns: KilnType[]) => void;
}

export const KilnSelector: React.FC<KilnSelectorProps> = ({
  selectedKilns,
  onKilnsChange,
}) => {
  const handleToggle = (kilnType: KilnType) => {
    if (selectedKilns.includes(kilnType)) {
      // Remove kiln from selection (if not the last one)
      if (selectedKilns.length > 1) {
        onKilnsChange(selectedKilns.filter(k => k !== kilnType));
      }
    } else {
      // Add kiln to selection
      onKilnsChange([...selectedKilns, kilnType]);
    }
  };

  return (
    <div className="kiln-selector">
      <h2>Select Kiln</h2>
      <div className="checkbox-group">
        {(Object.keys(KILNS) as KilnType[]).map((kilnKey) => (
          <label key={kilnKey} className="checkbox-label">
            <input
              type="checkbox"
              name="kiln"
              value={kilnKey}
              checked={selectedKilns.includes(kilnKey)}
              onChange={() => handleToggle(kilnKey)}
            />
            <span>{KILNS[kilnKey].name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
````

## File: src/components/ManagerSelector.tsx

````tsx
import { ManagerName } from '../types';

interface ManagerSelectorProps {
  selectedManager: ManagerName | '';
  onManagerChange: (manager: ManagerName) => void;
}

const MANAGERS: ManagerName[] = ['Stas', 'Konstantin', 'Febby', 'Anna'];

export function ManagerSelector({ selectedManager, onManagerChange }: ManagerSelectorProps) {
  return (
    <div className="manager-selector">
      <h3>Manager</h3>
      <select
        value={selectedManager}
        onChange={(e) => onManagerChange(e.target.value as ManagerName)}
        className="manager-select"
        required
      >
        <option value="">Select manager</option>
        {MANAGERS.map((manager) => (
          <option key={manager} value={manager}>
            {manager}
          </option>
        ))}
      </select>
      {!selectedManager && (
        <p className="hint-text">⚠ Please select manager before calculation</p>
      )}
    </div>
  );
}
````

## File: src/components/MultiKilnResults.tsx

````tsx
import React from 'react';
import { CalculationResult, KilnType } from '../types';

interface MultiKilnResultsProps {
  results: Record<KilnType, CalculationResult | null>;
  selectedKilns: KilnType[];
  bestKilnType?: KilnType | null;
}

export const MultiKilnResults: React.FC<MultiKilnResultsProps> = ({
  results,
}) => {
  const bigResult = results.big;
  const smallResult = results.small;

  // If no results
  if (!bigResult && !smallResult) {
    return (
      <div className="calculation-results empty">
        <p>Enter product dimensions and click "Calculate Loading"</p>
      </div>
    );
  }

  return (
    <div className="calculation-results">
      <h2>Kiln Loading Results</h2>

      {/* Show results for each kiln */}
      <div className="kilns-results-list">
        {bigResult && (
          <div className="kiln-result-item">
            <h3 className="kiln-name">🔥 Large kiln (54×84 cm)</h3>
            <div className="kiln-stats">
              <div className="stat-row">
                <span className="stat-label">Pieces:</span>
                <span className="stat-value">{bigResult.optimalLoading.totalPieces} pcs</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Area:</span>
                <span className="stat-value">{bigResult.optimalLoading.totalArea.toFixed(2)} m²</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Method:</span>
                <span className="stat-value">{bigResult.optimalLoading.methodName}</span>
              </div>
              {bigResult.optimalLoading.levels && (
                <div className="stat-row">
                  <span className="stat-label">Levels:</span>
                  <span className="stat-value">{bigResult.optimalLoading.levels}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {smallResult && (
          <div className="kiln-result-item">
            <h3 className="kiln-name">🔥 Small kiln (95×150 cm)</h3>
            <div className="kiln-stats">
              <div className="stat-row">
                <span className="stat-label">Pieces:</span>
                <span className="stat-value">{smallResult.optimalLoading.totalPieces} pcs</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Area:</span>
                <span className="stat-value">{smallResult.optimalLoading.totalArea.toFixed(2)} m²</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Method:</span>
                <span className="stat-value">{smallResult.optimalLoading.methodName}</span>
              </div>
              {smallResult.optimalLoading.levels && (
                <div className="stat-row">
                  <span className="stat-label">Levels:</span>
                  <span className="stat-value">{smallResult.optimalLoading.levels}</span>
                </div>
              )}
              
              {/* Filler for small kiln */}
              {smallResult.optimalLoading.filler && (
                <div className="filler-info">
                  <p className="note">
                    <strong>+ Filler:</strong> 10×10 cm tiles on edge
                  </p>
                  <p className="filler-breakdown">
                    • 10×10 tiles: <strong>{smallResult.optimalLoading.filler.fillerPieces} pcs</strong> 
                    ({smallResult.optimalLoading.filler.fillerArea.toFixed(4)} m²)
                  </p>
                  <p className="filler-details">
                    <small>Details: {smallResult.optimalLoading.filler.fillerDetails}</small>
                  </p>
                  <p className="total-with-filler">
                    <strong>Total (main + filler):</strong>
                    <br />
                    Pieces: {smallResult.optimalLoading.totalPieces + smallResult.optimalLoading.filler.fillerPieces}
                    <br />
                    Area: {(smallResult.optimalLoading.totalArea + smallResult.optimalLoading.filler.fillerArea).toFixed(4)} m²
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Average value if both kilns */}
      {bigResult && smallResult && (
        <div className="average-result">
          <h3>📊 Average</h3>
          <div className="average-stats">
            <div className="avg-stat">
              <span className="avg-label">Pieces:</span>
              <span className="avg-value">
                {Math.round((bigResult.optimalLoading.totalPieces + smallResult.optimalLoading.totalPieces) / 2)} pcs
              </span>
            </div>
            <div className="avg-stat">
              <span className="avg-label">Area:</span>
              <span className="avg-value">
                {((bigResult.optimalLoading.totalArea + smallResult.optimalLoading.totalArea) / 2).toFixed(2)} m²
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
````

## File: src/components/NotificationModal.css

````css
.notification-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;
}

.notification-modal-content {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  animation: slideUp 0.3s ease-out;
}

.notification-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: scaleIn 0.4s ease-out;
}

.notification-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 20px 0;
  color: #1a1a1a;
}

.notification-message {
  font-size: 20px;
  line-height: 1.6;
  color: #444;
  margin: 0 0 30px 0;
  white-space: pre-wrap;
}

.notification-button {
  padding: 14px 40px;
  font-size: 18px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

/* Type-specific styles */
.notification-warning {
  border-top: 6px solid #f59e0b;
}

.notification-warning .notification-button {
  background: #f59e0b;
  color: white;
}

.notification-warning .notification-button:hover {
  background: #d97706;
  transform: translateY(-2px);
}

.notification-error {
  border-top: 6px solid #ef4444;
}

.notification-error .notification-button {
  background: #ef4444;
  color: white;
}

.notification-error .notification-button:hover {
  background: #dc2626;
  transform: translateY(-2px);
}

.notification-success {
  border-top: 6px solid #10b981;
}

.notification-success .notification-button {
  background: #10b981;
  color: white;
}

.notification-success .notification-button:hover {
  background: #059669;
  transform: translateY(-2px);
}

.notification-info {
  border-top: 6px solid #3b82f6;
}

.notification-info .notification-button {
  background: #3b82f6;
  color: white;
}

.notification-info .notification-button:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .notification-modal-content {
    padding: 30px 20px;
  }
  
  .notification-icon {
    font-size: 48px;
  }
  
  .notification-title {
    font-size: 22px;
  }
  
  .notification-message {
    font-size: 16px;
  }
  
  .notification-button {
    font-size: 16px;
    padding: 12px 32px;
  }
}
````

## File: src/components/NotificationModal.tsx

````tsx
import './NotificationModal.css';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'warning' | 'error' | 'success' | 'info';
}

export function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
}: NotificationModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="notification-modal-overlay" onClick={onClose}>
      <div 
        className={`notification-modal-content notification-${type}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notification-icon">{getIcon()}</div>
        <h2 className="notification-title">{title}</h2>
        <p className="notification-message">{message}</p>
        <button className="notification-button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
````

## File: src/components/OrderQuantityInput.tsx

````tsx
import { useState, useEffect } from 'react';

interface OrderQuantityInputProps {
  productArea: number; // m²
  onQuantityChange: (quantityPcs: number) => void;
  initialQuantityPcs?: number;
  showBothModes?: boolean; // if false, show only "per piece" input (default: true)
}

export function OrderQuantityInput({
  productArea,
  onQuantityChange,
  initialQuantityPcs = 0,
  showBothModes = true, // default: show both inputs
}: OrderQuantityInputProps) {
  const [quantityPcs, setQuantityPcs] = useState<number>(initialQuantityPcs);
  const [quantityM2, setQuantityM2] = useState<number>(0);

  // Sync when initial value or area changes
  useEffect(() => {
    setQuantityPcs(initialQuantityPcs);
    setQuantityM2(initialQuantityPcs * productArea);
  }, [initialQuantityPcs, productArea]);

  const handlePcsChange = (value: string) => {
    // Only allow whole numbers for pieces
    const pcs = Math.round(parseFloat(value) || 0);
    setQuantityPcs(pcs);
    setQuantityM2(pcs * productArea);
    onQuantityChange(pcs);
  };

  const handleM2Change = (value: string) => {
    // Allow empty string for better UX
    if (value === '') {
      setQuantityM2(0);
      setQuantityPcs(0);
      onQuantityChange(0);
      return;
    }
    
    const m2 = parseFloat(value) || 0;
    setQuantityM2(m2);
    // Always round pieces to whole number
    const pcs = productArea > 0 ? Math.round(m2 / productArea) : 0;
    setQuantityPcs(pcs);
    onQuantityChange(pcs);
  };

  return (
    <div className="order-quantity-input">
      <h3>Order Quantity</h3>
      {showBothModes ? (
        // Mode 1: Both pieces and m² inputs (for tiles)
        <div className="dual-input-group">
          <div className="input-field">
            <label>Quantity (pcs)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={quantityPcs === 0 ? '' : Math.round(quantityPcs)}
              onChange={(e) => handlePcsChange(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="input-separator">or</div>

          <div className="input-field">
            <label>Quantity (m²)</label>
            <input
              type="number"
              min="0"
              max="1000"
              step="0.01"
              value={quantityM2 === 0 ? '' : quantityM2}
              onChange={(e) => handleM2Change(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      ) : (
        // Mode 2: Only pieces input (for countertops, sinks, 3D products)
        <div className="single-input-group">
          <div className="input-field">
            <label>Quantity (pcs)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={quantityPcs === 0 ? '' : Math.round(quantityPcs)}
              onChange={(e) => handlePcsChange(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      )}
      <p className="info-text">
        <small>
          {productArea > 0 && (
            <>
              1 piece = {productArea.toFixed(4)} m² • Affects stone defect calculation
            </>
          )}
          {productArea === 0 && 'Calculate kiln loading first'}
        </small>
      </p>
    </div>
  );
}
````

## File: src/components/PriceConflictModal.css

````css
.price-conflict-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.price-conflict-modal-content {
  background: white;
  border-radius: 16px;
  padding: 2.5rem 3rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.conflict-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.conflict-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #F59E0B;
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.conflict-message {
  font-size: 1.05rem;
  color: #374151;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.conflict-message p {
  margin: 0;
}

.conflict-message strong {
  color: #1F2937;
  font-weight: 600;
}

.conflict-prices-list {
  background: #F9FAFB;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 2px solid #E5E7EB;
  text-align: left;
}

.price-entry {
  padding: 1rem;
  background: white;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  border: 1px solid #E5E7EB;
  transition: all 0.2s;
}

.price-entry:last-child {
  margin-bottom: 0;
}

.price-entry:hover {
  border-color: #2563EB;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.price-entry-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.price-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2563EB;
}

.price-date {
  font-size: 0.85rem;
  color: #6B7280;
}

.price-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.price-badge.oldest {
  background: #FEF3C7;
  color: #92400E;
}

.price-badge.newest {
  background: #DBEAFE;
  color: #1E40AF;
}

.conflict-question {
  margin-bottom: 1.5rem;
  font-size: 1.05rem;
  color: #374151;
  font-weight: 500;
}

.conflict-question p {
  margin: 0;
}

.conflict-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.conflict-button {
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  width: 100%;
}

.conflict-button.use-oldest {
  background: #FBBF24;
  color: white;
}

.conflict-button.use-oldest:hover {
  background: #F59E0B;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
}

.conflict-button.use-newest {
  background: #2563EB;
  color: white;
}

.conflict-button.use-newest:hover {
  background: #1D4ED8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}

.conflict-button.manual-entry {
  background: #10B981;
  color: white;
}

.conflict-button.manual-entry:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.conflict-button.cancel {
  background: transparent;
  color: #6B7280;
  border: 2px solid #E5E7EB;
}

.conflict-button.cancel:hover {
  background: #F3F4F6;
  border-color: #D1D5DB;
}

.conflict-button:active {
  transform: translateY(0);
}

@media (max-width: 640px) {
  .price-conflict-modal-content {
    padding: 2rem 1.5rem;
    width: 95%;
  }

  .conflict-title {
    font-size: 1.25rem;
  }

  .price-entry-info {
    flex-direction: column;
    align-items: flex-start;
  }
}
````

## File: src/components/PriceConflictModal.tsx

````tsx
import { StoneEntry, ProductType } from '../types';
import './PriceConflictModal.css';

interface PriceConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  prices: number[]; // mil Rp (per m² for tiles, per piece for others)
  entries: StoneEntry[];
  productType: ProductType; // to determine price unit display
  onSelectPrice: (price: number) => void;
  onManualEntry: () => void;
}

export function PriceConflictModal({
  isOpen,
  onClose,
  prices,
  entries,
  productType,
  onSelectPrice,
  onManualEntry
}: PriceConflictModalProps) {
  if (!isOpen) return null;

  const priceUnit = productType === 'tile' ? 'mil Rp/m²' : 'mil Rp/piece';
  const priceField = productType === 'tile' ? 'pricePerM2' : 'pricePerUnit';

  // Sort entries by date (oldest first, newest last)
  const sortedEntries = [...entries].sort((a, b) => 
    a.dateAdded.getTime() - b.dateAdded.getTime()
  );

  const oldestEntry = sortedEntries[0];
  const newestEntry = sortedEntries[sortedEntries.length - 1];
  const oldestPrice = oldestEntry[priceField];
  const newestPrice = newestEntry[priceField];

  return (
    <div className="price-conflict-modal-overlay" onClick={onClose}>
      <div className="price-conflict-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="conflict-icon">⚠️</div>
        
        <h2 className="conflict-title">
          Price Conflict Detected
        </h2>
        
        <div className="conflict-message">
          <p>
            Found <strong>{entries.length} entries</strong> for this product with{' '}
            <strong>{prices.length} different prices</strong>:
          </p>
        </div>

        <div className="conflict-prices-list">
          {sortedEntries.map((entry, index) => (
            <div key={entry.id} className="price-entry">
              <div className="price-entry-info">
                <span className="price-value">
                  {entry[priceField].toFixed(3)} {priceUnit}
                </span>
                <span className="price-date">
                  {entry.dateAdded.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {index === 0 && <span className="price-badge oldest">Oldest</span>}
                {index === sortedEntries.length - 1 && <span className="price-badge newest">Newest</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="conflict-question">
          <p>Which price would you like to use?</p>
        </div>

        <div className="conflict-buttons">
          <button
            className="conflict-button use-oldest"
            onClick={() => onSelectPrice(oldestPrice)}
          >
            Use Oldest ({oldestPrice.toFixed(3)})
          </button>
          
          <button
            className="conflict-button use-newest"
            onClick={() => onSelectPrice(newestPrice)}
          >
            Use Newest ({newestPrice.toFixed(3)})
          </button>
          
          <button
            className="conflict-button manual-entry"
            onClick={onManualEntry}
          >
            Enter Manually
          </button>
          
          <button
            className="conflict-button cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
````

## File: src/components/ProductInput.tsx

````tsx
import React, { useState, useEffect } from 'react';
import { ProductDimensions, TileShape, ManagerName, Market, ProductType } from '../types';

interface ProductInputProps {
  formRef?: React.RefObject<HTMLFormElement>;
  onCalculate: (product: ProductDimensions) => void;
  tileShape?: TileShape;
  productType?: ProductType;
  showButton?: boolean;
  initialLength?: string;
  initialWidth?: string;
  initialThickness?: string;
  onDimensionsChange?: (dimensions: { length: string; width: string; thickness: string }) => void;
  selectedManager?: ManagerName | '';
  onManagerChange?: (manager: ManagerName | '') => void;
  selectedMarket?: Market | '';
  onMarketChange?: (market: Market | '') => void;
}

export const ProductInput: React.FC<ProductInputProps> = ({ 
  formRef,
  onCalculate, 
  tileShape,
  productType,
  showButton = true,
  initialLength = '',
  initialWidth = '',
  initialThickness = '',
  onDimensionsChange,
  selectedManager = '',
  onManagerChange,
  selectedMarket = '',
  onMarketChange
}) => {
  const isRound = tileShape === 'round';
  const isSink = productType === 'sink';
  const thicknessLabel = isSink ? 'Height' : 'Thickness';
  // Always start empty; sync from parent when they pass values (e.g. from history)
  const [length, setLength] = useState<string>(() => '');
  const [width, setWidth] = useState<string>(() => '');
  const [thickness, setThickness] = useState<string>(() => '');

  // Sync from parent when initial values change (e.g. user picked from history)
  useEffect(() => {
    setLength(initialLength ?? '');
    setWidth(initialWidth ?? '');
    setThickness(initialThickness ?? '');
  }, [initialLength, initialWidth, initialThickness]);

  // Notify parent of dimension changes
  useEffect(() => {
    if (onDimensionsChange) {
      onDimensionsChange({ length, width, thickness });
    }
  }, [length, width, thickness, onDimensionsChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lengthNum = parseFloat(length);
    const widthNum = parseFloat(width);
    const thicknessNum = parseFloat(thickness);

    // Check minimum dimensions
    if (lengthNum < 3 || widthNum < 3) {
      alert('⚠️ Minimum product size: 3×3 cm\nSuch small sizes are not used in ceramics production.');
      return;
    }

    if (thicknessNum < 0.8) {
      alert('⚠️ Minimum product thickness: 0.8 cm (8 mm)\nSuch thin ceramics are not produced.');
      return;
    }

    if (lengthNum > 0 && widthNum > 0 && thicknessNum > 0) {
      onCalculate({
        length: lengthNum,
        width: widthNum,
        thickness: thicknessNum,
      });
    }
  };

  // For round shapes - automatically sync width with length (diameter)
  const handleDiameterChange = (value: string) => {
    setLength(value);
    setWidth(value); // automatically set width = length
  };

  const isRound = tileShape === 'round';

  return (
    <div className="product-input">
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="two-column-grid">
          <div className="column">
            <h3>Product Dimensions</h3>
            {isRound ? (
              <>
                <div className="input-group">
                  <label>
                    Diameter (cm): <span className="hint">min. 3 cm</span>
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      value={length}
                      onChange={(e) => handleDiameterChange(e.target.value)}
                      placeholder=""
                      required
                    />
                  </label>
                </div>

                <div className="input-group">
                  <label>
                    {thicknessLabel} (cm): <span className="hint">min. 0.8 cm</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.8"
                      value={thickness}
                      onChange={(e) => setThickness(e.target.value)}
                      placeholder=""
                      required
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="input-group">
                  <label>
                    Length (cm): <span className="hint">min. 3 cm</span>
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder=""
                      required
                    />
                  </label>
                </div>

                <div className="input-group">
                  <label>
                    Width (cm): <span className="hint">min. 3 cm</span>
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder=""
                      required
                    />
                  </label>
                </div>

                <div className="input-group">
                  <label>
                    {thicknessLabel} (cm): <span className="hint">min. 0.8 cm</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.8"
                      value={thickness}
                      onChange={(e) => setThickness(e.target.value)}
                      placeholder=""
                      required
                    />
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="column">
            <h3>Manager</h3>
            <div className="input-group manager-group">
              <label>
                <span className="hint">required</span>
                <select
                  value={selectedManager}
                  onChange={(e) => onManagerChange?.(e.target.value as ManagerName | '')}
                  className="manager-select"
                  required
                >
                  <option value="">Select Manager</option>
                  <option value="Stas">Stas</option>
                  <option value="Konstantin">Konstantin</option>
                  <option value="Febby">Febby</option>
                  <option value="Anna">Anna</option>
                </select>
              </label>
            </div>

            <h3 style={{marginTop: '1rem'}}>Market</h3>
            <div className="input-group market-group">
              <label>
                <span className="hint">required</span>
                <select
                  value={selectedMarket}
                  onChange={(e) => onMarketChange?.(e.target.value as Market | '')}
                  className="manager-select"
                  required
                >
                  <option value="">Select Market</option>
                  <option value="indonesia">🇮🇩 Indonesia</option>
                  <option value="abroad">🌍 Abroad</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {showButton && (
          <button type="submit" className="calculate-loading-button">
            Calculate Loading
          </button>
        )}
      </form>
    </div>
  );
};
````

## File: src/components/ProductTypeSelector.tsx

````tsx
import { ProductType, TileShape } from '../types';

interface ProductTypeSelectorProps {
  productType: ProductType;
  tileShape?: TileShape;
  onProductTypeChange: (type: ProductType) => void;
  onTileShapeChange?: (shape: TileShape) => void;
  showShapeForAllTypes?: boolean; // Show shape selection for all types
}

export function ProductTypeSelector({
  productType,
  tileShape,
  onProductTypeChange,
  onTileShapeChange,
  showShapeForAllTypes = true,
}: ProductTypeSelectorProps) {
  // Show shape for tiles, countertops and sinks
  const shouldShowShape = showShapeForAllTypes && 
    (productType === 'tile' || productType === 'countertop' || productType === 'sink') && 
    onTileShapeChange;

  return (
    <div className="product-type-selector">
      <div className="two-column-grid">
        <div className="column">
          <h3>Product Type</h3>
          <select 
            value={productType} 
            onChange={(e) => onProductTypeChange(e.target.value as ProductType)}
            className="select-field"
          >
            <option value="tile">Tile</option>
            <option value="countertop">Countertop</option>
            <option value="sink">Sink</option>
            <option value="3d">3D</option>
          </select>
        </div>

        {shouldShowShape && (
          <div className="column">
            <h3>Product Shape</h3>
            <select 
              value={tileShape} 
              onChange={(e) => onTileShapeChange!(e.target.value as TileShape)}
              className="select-field"
            >
              <option value="rectangle">Square / Rectangular</option>
              <option value="round">Round</option>
              <option value="freeform">Freeform</option>
              <option value="triangle">Triangular</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
````

## File: src/components/StoneCostInput.tsx

````tsx
import { useState, useEffect } from 'react';

interface StoneCostInputProps {
  productArea: number; // m² of one product (length × width / 10000)
  onStoneCostChange: (costPerSqM: number) => void;
  initialCostPerSqM?: number;
  onShowDB: () => void;
  onAutoFind: () => void;
  showDB: boolean;
  showBothInputs: boolean; // if false, show only "per piece"
  hideButtons?: boolean; // if true, don't render Database/Auto-select buttons
  hideProductArea?: boolean; // if true, don't render product area text
}

export function StoneCostInput({ 
  productArea,
  onStoneCostChange,
  initialCostPerSqM = 0,
  onShowDB,
  onAutoFind,
  showDB,
  showBothInputs,
  hideButtons = false,
  hideProductArea = false
}: StoneCostInputProps) {
  const [inputMode, setInputMode] = useState<'perSqM' | 'perPcs'>('perSqM');
  const [pricePerSqM, setPricePerSqM] = useState<number>(0);
  const [pricePerPcs, setPricePerPcs] = useState<number>(0);
  // String state so "0" and "0.0000" display correctly (number input with value 0 showed empty)
  const [pricePerSqMStr, setPricePerSqMStr] = useState<string>('');
  const [pricePerPcsStr, setPricePerPcsStr] = useState<string>('');

  // Sync from parent when initial value or productArea changes
  useEffect(() => {
    if (initialCostPerSqM > 0) {
      setPricePerSqM(initialCostPerSqM);
      setPricePerPcs(initialCostPerSqM * productArea);
      setPricePerSqMStr(String(initialCostPerSqM));
      setPricePerPcsStr(String(initialCostPerSqM * productArea));
    } else {
      setPricePerSqM(0);
      setPricePerPcs(0);
      setPricePerSqMStr('');
      setPricePerPcsStr('');
    }
  }, [initialCostPerSqM, productArea]);

  const handlePerSqMChange = (value: number) => {
    setPricePerSqM(value);
    const calculatedPricePerPcs = value * productArea;
    setPricePerPcs(calculatedPricePerPcs);
    // Don't update the other field's string during typing - only update numbers
    onStoneCostChange(value);
  };

  const handlePerSqMInputChange = (raw: string) => {
    // Validate: only digits and max one separator (comma or dot)
    const commaCount = (raw.match(/,/g) || []).length;
    const dotCount = (raw.match(/\./g) || []).length;
    
    // Allow only if: no separators, OR one comma, OR one dot (not both)
    if (commaCount > 1 || dotCount > 1 || (commaCount > 0 && dotCount > 0)) {
      return; // Invalid - multiple separators or both comma and dot
    }
    
    // Allow only numbers with optional single comma or dot
    if (!/^\d*[,.]?\d*$/.test(raw) && raw !== '') {
      return; // Invalid characters
    }
    
    // Replace comma with dot for calculation
    const normalized = raw.replace(',', '.');
    setPricePerSqMStr(raw); // Keep original input (with comma if user typed comma)
    
    // Parse and update values
    if (raw === '') {
      setPricePerSqM(0);
      setPricePerPcs(0);
      setPricePerPcsStr('');
      onStoneCostChange(0);
    } else {
      const value = parseFloat(normalized) || 0;
      setPricePerSqM(value);
      const calculatedPricePerPcs = value * productArea;
      setPricePerPcs(calculatedPricePerPcs);
      setPricePerPcsStr(calculatedPricePerPcs > 0 ? calculatedPricePerPcs.toFixed(4) : '');
      onStoneCostChange(value);
    }
  };

  const handlePerPcsInputChange = (raw: string) => {
    // Validate: only digits and max one separator (comma or dot)
    const commaCount = (raw.match(/,/g) || []).length;
    const dotCount = (raw.match(/\./g) || []).length;
    
    // Allow only if: no separators, OR one comma, OR one dot (not both)
    if (commaCount > 1 || dotCount > 1 || (commaCount > 0 && dotCount > 0)) {
      return; // Invalid - multiple separators or both comma and dot
    }
    
    // Allow only numbers with optional single comma or dot
    if (!/^\d*[,.]?\d*$/.test(raw) && raw !== '') {
      return; // Invalid characters
    }
    
    // Replace comma with dot for calculation
    const normalized = raw.replace(',', '.');
    setPricePerPcsStr(raw); // Keep original input (with comma if user typed comma)
    
    // Parse and update values
    if (raw === '') {
      setPricePerPcs(0);
      setPricePerSqM(0);
      setPricePerSqMStr('');
      onStoneCostChange(0);
    } else {
      const value = parseFloat(normalized) || 0;
      setPricePerPcs(value);
      const calculatedPricePerSqM = productArea > 0 ? value / productArea : 0;
      setPricePerSqM(calculatedPricePerSqM);
      // Don't update the other field's string - keep it as user typed
      onStoneCostChange(calculatedPricePerSqM);
    }
  };

  const handlePerPcsChange = (value: number) => {
    setPricePerPcs(value);
    const calculatedPricePerSqM = productArea > 0 ? value / productArea : 0;
    setPricePerSqM(calculatedPricePerSqM);
    // Don't update the other field's string during typing - only update numbers
    onStoneCostChange(calculatedPricePerSqM);
  };

  return (
    <div className="stone-cost-input">
      <h3>Stone Price</h3>
      
      {showBothInputs ? (
        <>
          {/* Mode toggle */}
          <div className="price-mode-toggle">
            <label className="price-mode-label">
              <input
                type="radio"
                name="stonePriceMode"
                checked={inputMode === 'perSqM'}
                onChange={() => setInputMode('perSqM')}
              />
              <span>Per 1 m² (mil Rp)</span>
            </label>
            <label className="price-mode-label">
              <input
                type="radio"
                name="stonePriceMode"
                checked={inputMode === 'perPcs'}
                onChange={() => setInputMode('perPcs')}
              />
              <span>Per 1 piece (mil Rp)</span>
            </label>
          </div>

          <div className="input-with-buttons">
            {/* Input depending on mode */}
            {inputMode === 'perSqM' ? (
              <div className="input-group">
                <label>Price per 1 m² (mil Rp)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={pricePerSqMStr}
                  onChange={(e) => handlePerSqMInputChange(e.target.value)}
                  onBlur={() => {
                    // Keep user input as is - no auto-formatting
                  }}
                  placeholder=""
                />
                <div className="calculated-info">
                  Per 1 pcs: <strong>{pricePerPcs.toFixed(4)} mil Rp</strong>
                </div>
              </div>
            ) : (
              <div className="input-group">
                <label>Price per 1 piece (mil Rp)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={pricePerPcsStr}
                  onChange={(e) => handlePerPcsInputChange(e.target.value)}
                  onBlur={() => {
                    // Keep user input as is - no auto-formatting
                  }}
                  placeholder=""
                />
                <div className="calculated-info">
                  Per 1 m²: <strong>{pricePerSqM.toFixed(4)} mil Rp</strong>
                </div>
              </div>
            )}
            
            {!hideButtons && (
              <>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={onShowDB}
                >
                  {showDB ? 'Hide database' : 'Database'}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={onAutoFind}
                >
                  Auto-select
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="input-with-buttons">
          {/* "Per piece only" mode */}
          <div className="input-group">
            <label>Price per 1 piece (mil Rp)</label>
            <input
              type="text"
              inputMode="decimal"
              value={pricePerPcsStr}
              onChange={(e) => handlePerPcsInputChange(e.target.value)}
              onBlur={() => setPricePerPcsStr(pricePerPcs > 0 ? pricePerPcs.toFixed(4) : '')}
              placeholder=""
            />
            <div className="calculated-info">
              Per 1 m²: <strong>{pricePerSqM.toFixed(4)} mil Rp</strong>
            </div>
          </div>
          
          {!hideButtons && (
            <>
              <button
                type="button"
                className="button-secondary"
                onClick={onShowDB}
              >
                {showDB ? 'Hide database' : 'Database'}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={onAutoFind}
              >
                Auto-select
              </button>
            </>
          )}
        </div>
      )}
      
      {!hideProductArea && (
        <div className="product-info">
          <small>Product area: {productArea.toFixed(4)} m²</small>
        </div>
      )}
    </div>
  );
}
````

## File: src/components/StoneDatabase.tsx

````tsx
import { useState, useEffect } from 'react';
import { StoneEntry, ProductType } from '../types';
import {
  getRecentStoneEntries,
  addStoneEntry,
  deleteStoneEntry,
} from '../utils/stoneDatabase';

interface StoneDatabaseProps {
  onSelectStone?: (stone: StoneEntry) => void;
  currentProductType?: ProductType;
}

export function StoneDatabase({ onSelectStone, currentProductType }: StoneDatabaseProps) {
  const [stones, setStones] = useState<StoneEntry[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newStone, setNewStone] = useState({
    name: '',
    pricePerUnit: '',
    pricePerM2: '',
    productType: currentProductType || 'tile' as ProductType,
    sizeRange: '',
    thickness: '',
  });

  useEffect(() => {
    loadStones();
  }, []);

  const loadStones = () => {
    const db = getRecentStoneEntries(20);
    setStones(db);
  };

  const handleAddStone = () => {
    if (!newStone.name || !newStone.pricePerUnit || !newStone.pricePerM2) {
      alert('Please fill in all required fields');
      return;
    }

    const entry = addStoneEntry({
      name: newStone.name,
      pricePerUnit: parseFloat(newStone.pricePerUnit),
      pricePerM2: parseFloat(newStone.pricePerM2),
      productType: newStone.productType,
      sizeRange: newStone.sizeRange || undefined,
      thickness: newStone.thickness ? parseFloat(newStone.thickness) : undefined,
    });

    setStones([entry, ...stones]);
    setIsAddingNew(false);
    setNewStone({
      name: '',
      pricePerUnit: '',
      pricePerM2: '',
      productType: currentProductType || 'tile',
      sizeRange: '',
      thickness: '',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this entry?')) {
      deleteStoneEntry(id);
      loadStones();
    }
  };

  return (
    <div className="stone-database">
      <div className="stone-database-header">
        <h3>Stone Database</h3>
        <button
          type="button"
          className="button-secondary"
          onClick={() => setIsAddingNew(!isAddingNew)}
        >
          {isAddingNew ? 'Cancel' : '+ Add Stone'}
        </button>
      </div>

      {isAddingNew && (
        <div className="stone-form">
          <div className="input-group">
            <label>Stone Name *</label>
            <input
              type="text"
              value={newStone.name}
              onChange={(e) => setNewStone({ ...newStone, name: e.target.value })}
              placeholder="Example: White Clay"
            />
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Price per unit (mil Rp) *</label>
              <input
                type="number"
                step="0.01"
                value={newStone.pricePerUnit}
                onChange={(e) =>
                  setNewStone({ ...newStone, pricePerUnit: e.target.value })
                }
                placeholder="1.095"
              />
            </div>

            <div className="input-group">
              <label>Price per m² (mil Rp) *</label>
              <input
                type="number"
                step="0.01"
                value={newStone.pricePerM2}
                onChange={(e) => setNewStone({ ...newStone, pricePerM2: e.target.value })}
                placeholder="1.19"
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Product Type</label>
              <select
                value={newStone.productType}
                onChange={(e) =>
                  setNewStone({ ...newStone, productType: e.target.value as ProductType })
                }
              >
                <option value="tile">Tile</option>
                <option value="countertop">Countertop</option>
                <option value="sink">Sink</option>
                <option value="3d">3D</option>
              </select>
            </div>

            <div className="input-group">
              <label>Size Range (optional)</label>
              <input
                type="text"
                value={newStone.sizeRange}
                onChange={(e) => setNewStone({ ...newStone, sizeRange: e.target.value })}
                placeholder="10x10-20x20"
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Thickness (cm, optional)</label>
              <input
                type="number"
                step="0.1"
                min="0.3"
                value={newStone.thickness}
                onChange={(e) => setNewStone({ ...newStone, thickness: e.target.value })}
                placeholder="1.0"
              />
            </div>
          </div>

          <button type="button" className="button" onClick={handleAddStone}>
            Save
          </button>
        </div>
      )}

      <div className="stone-list">
        {stones.length === 0 ? (
          <p className="empty-state">
            Database is empty. Add the first stone.
          </p>
        ) : (
          <table className="stone-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price/pcs (mil Rp)</th>
                <th>Price/m² (mil Rp)</th>
                <th>Type</th>
                <th>Sizes</th>
                <th>Thickness</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stones.map((stone) => (
                <tr key={stone.id}>
                  <td>{stone.name}</td>
                  <td>{stone.pricePerUnit.toFixed(3)}</td>
                  <td>{stone.pricePerM2.toFixed(2)}</td>
                  <td>{stone.productType || '-'}</td>
                  <td>{stone.sizeRange || '-'}</td>
                  <td>{stone.thickness ? `${stone.thickness} cm` : '-'}</td>
                  <td>
                    {onSelectStone && (
                      <button
                        type="button"
                        className="button-small"
                        onClick={() => onSelectStone(stone)}
                      >
                        Select
                      </button>
                    )}
                    <button
                      type="button"
                      className="button-small button-danger"
                      onClick={() => handleDelete(stone.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
````

## File: src/utils/backup.ts

````ts
import { StoneEntry } from '../types';
import { CalculationHistoryEntry } from '../types';

// Backup keys
const BACKUP_KEY_PREFIX = 'kiln_backup_';
const INCREMENTAL_BACKUP_KEY = `${BACKUP_KEY_PREFIX}incremental`;
const FULL_BACKUP_KEY = `${BACKUP_KEY_PREFIX}full`;
const LAST_BACKUP_TIME_KEY = `${BACKUP_KEY_PREFIX}last_time`;
const LAST_FULL_BACKUP_KEY = `${BACKUP_KEY_PREFIX}last_full_time`;

// Tracking changes
const CHANGES_TRACKER_KEY = `${BACKUP_KEY_PREFIX}changes`;

export interface BackupData {
  timestamp: Date;
  version: string;
  stoneDatabase: StoneEntry[];
  calculationHistory: CalculationHistoryEntry[];
}

export interface IncrementalBackupData {
  timestamp: Date;
  changes: {
    stoneDatabase?: {
      added?: StoneEntry[];
      modified?: StoneEntry[];
      deleted?: string[]; // IDs
    };
    calculationHistory?: {
      added?: CalculationHistoryEntry[];
      deleted?: string[]; // IDs
    };
  };
}

interface ChangeTracker {
  lastSnapshot: {
    stoneIds: string[];
    calculationIds: string[];
  };
  pendingChanges: {
    stoneAdded: string[];
    stoneDeleted: string[];
    calculationAdded: string[];
    calculationDeleted: string[];
  };
}

/**
 * Get current data from localStorage
 */
function getCurrentData(): { stones: StoneEntry[]; calculations: CalculationHistoryEntry[] } {
  const stonesData = localStorage.getItem('kiln_calculator_stone_database');
  const calcData = localStorage.getItem('kiln_calculator_history');
  
  const stones = stonesData ? JSON.parse(stonesData).map((e: any) => ({
    ...e,
    dateAdded: new Date(e.dateAdded)
  })) : [];
  
  const calculations = calcData ? JSON.parse(calcData).map((e: any) => ({
    ...e,
    dateCreated: new Date(e.dateCreated)
  })) : [];
  
  return { stones, calculations };
}

/**
 * Get or initialize change tracker
 */
function getChangeTracker(): ChangeTracker {
  const data = localStorage.getItem(CHANGES_TRACKER_KEY);
  if (data) {
    return JSON.parse(data);
  }
  
  const { stones, calculations } = getCurrentData();
  return {
    lastSnapshot: {
      stoneIds: stones.map(s => s.id),
      calculationIds: calculations.map(c => c.id)
    },
    pendingChanges: {
      stoneAdded: [],
      stoneDeleted: [],
      calculationAdded: [],
      calculationDeleted: []
    }
  };
}

/**
 * Save change tracker
 */
function saveChangeTracker(tracker: ChangeTracker): void {
  localStorage.setItem(CHANGES_TRACKER_KEY, JSON.stringify(tracker));
}

/**
 * Track changes since last backup
 */
export function trackChanges(): void {
  const tracker = getChangeTracker();
  const { stones, calculations } = getCurrentData();
  
  const currentStoneIds = new Set(stones.map(s => s.id));
  const currentCalcIds = new Set(calculations.map(c => c.id));
  
  const lastStoneIds = new Set(tracker.lastSnapshot.stoneIds);
  const lastCalcIds = new Set(tracker.lastSnapshot.calculationIds);
  
  // Find new stones
  stones.forEach(stone => {
    if (!lastStoneIds.has(stone.id) && !tracker.pendingChanges.stoneAdded.includes(stone.id)) {
      tracker.pendingChanges.stoneAdded.push(stone.id);
    }
  });
  
  // Find deleted stones
  tracker.lastSnapshot.stoneIds.forEach(id => {
    if (!currentStoneIds.has(id) && !tracker.pendingChanges.stoneDeleted.includes(id)) {
      tracker.pendingChanges.stoneDeleted.push(id);
    }
  });
  
  // Find new calculations
  calculations.forEach(calc => {
    if (!lastCalcIds.has(calc.id) && !tracker.pendingChanges.calculationAdded.includes(calc.id)) {
      tracker.pendingChanges.calculationAdded.push(calc.id);
    }
  });
  
  // Find deleted calculations
  tracker.lastSnapshot.calculationIds.forEach(id => {
    if (!currentCalcIds.has(id) && !tracker.pendingChanges.calculationDeleted.includes(id)) {
      tracker.pendingChanges.calculationDeleted.push(id);
    }
  });
  
  saveChangeTracker(tracker);
}

/**
 * Create full backup (all data)
 */
export function createFullBackup(): BackupData {
  const { stones, calculations } = getCurrentData();
  
  const backup: BackupData = {
    timestamp: new Date(),
    version: '1.0',
    stoneDatabase: stones,
    calculationHistory: calculations
  };
  
  localStorage.setItem(FULL_BACKUP_KEY, JSON.stringify(backup));
  localStorage.setItem(LAST_FULL_BACKUP_KEY, new Date().toISOString());
  
  // Reset change tracker after full backup
  const tracker = getChangeTracker();
  tracker.lastSnapshot = {
    stoneIds: stones.map(s => s.id),
    calculationIds: calculations.map(c => c.id)
  };
  tracker.pendingChanges = {
    stoneAdded: [],
    stoneDeleted: [],
    calculationAdded: [],
    calculationDeleted: []
  };
  saveChangeTracker(tracker);
  
  console.log('✅ Full backup created:', backup.timestamp);
  return backup;
}

/**
 * Create incremental backup (only changes)
 */
export function createIncrementalBackup(): IncrementalBackupData | null {
  const tracker = getChangeTracker();
  const { stones, calculations } = getCurrentData();
  
  // Check if there are any changes
  const hasChanges = 
    tracker.pendingChanges.stoneAdded.length > 0 ||
    tracker.pendingChanges.stoneDeleted.length > 0 ||
    tracker.pendingChanges.calculationAdded.length > 0 ||
    tracker.pendingChanges.calculationDeleted.length > 0;
  
  if (!hasChanges) {
    console.log('⏭️ No changes to backup');
    return null;
  }
  
  // Get actual data for added items
  const addedStones = stones.filter(s => tracker.pendingChanges.stoneAdded.includes(s.id));
  const addedCalculations = calculations.filter(c => tracker.pendingChanges.calculationAdded.includes(c.id));
  
  const backup: IncrementalBackupData = {
    timestamp: new Date(),
    changes: {
      stoneDatabase: {
        added: addedStones.length > 0 ? addedStones : undefined,
        deleted: tracker.pendingChanges.stoneDeleted.length > 0 ? tracker.pendingChanges.stoneDeleted : undefined
      },
      calculationHistory: {
        added: addedCalculations.length > 0 ? addedCalculations : undefined,
        deleted: tracker.pendingChanges.calculationDeleted.length > 0 ? tracker.pendingChanges.calculationDeleted : undefined
      }
    }
  };
  
  // Save incremental backup
  const existingBackups = getIncrementalBackups();
  existingBackups.push(backup);
  
  // Keep only last 100 incremental backups
  const recentBackups = existingBackups.slice(-100);
  localStorage.setItem(INCREMENTAL_BACKUP_KEY, JSON.stringify(recentBackups));
  localStorage.setItem(LAST_BACKUP_TIME_KEY, new Date().toISOString());
  
  // Reset pending changes
  tracker.lastSnapshot = {
    stoneIds: stones.map(s => s.id),
    calculationIds: calculations.map(c => c.id)
  };
  tracker.pendingChanges = {
    stoneAdded: [],
    stoneDeleted: [],
    calculationAdded: [],
    calculationDeleted: []
  };
  saveChangeTracker(tracker);
  
  console.log('💾 Incremental backup created:', backup.timestamp);
  return backup;
}

/**
 * Get all incremental backups
 */
function getIncrementalBackups(): IncrementalBackupData[] {
  const data = localStorage.getItem(INCREMENTAL_BACKUP_KEY);
  if (!data) return [];
  
  return JSON.parse(data).map((b: any) => ({
    ...b,
    timestamp: new Date(b.timestamp)
  }));
}

/**
 * Get last full backup
 */
export function getLastFullBackup(): BackupData | null {
  const data = localStorage.getItem(FULL_BACKUP_KEY);
  if (!data) return null;
  
  const backup = JSON.parse(data);
  return {
    ...backup,
    timestamp: new Date(backup.timestamp)
  };
}

/**
 * Export backup to downloadable file
 */
export function exportBackupToFile(backup: BackupData): void {
  const dataStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `kiln_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log('📥 Backup exported to file');
}

/**
 * Import backup from file
 */
export function importBackupFromFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        
        // Restore data
        localStorage.setItem('kiln_calculator_stone_database', JSON.stringify(backup.stoneDatabase));
        localStorage.setItem('kiln_calculator_history', JSON.stringify(backup.calculationHistory));
        
        // Create new full backup after restore
        createFullBackup();
        
        console.log('✅ Backup imported and restored');
        resolve(backup);
      } catch (error) {
        console.error('Error importing backup:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Get backup statistics
 */
export function getBackupStats(): {
  lastFullBackup: Date | null;
  lastIncrementalBackup: Date | null;
  incrementalBackupsCount: number;
  totalStones: number;
  totalCalculations: number;
} {
  const lastFull = localStorage.getItem(LAST_FULL_BACKUP_KEY);
  const lastIncremental = localStorage.getItem(LAST_BACKUP_TIME_KEY);
  const incrementalBackups = getIncrementalBackups();
  const { stones, calculations } = getCurrentData();
  
  return {
    lastFullBackup: lastFull ? new Date(lastFull) : null,
    lastIncrementalBackup: lastIncremental ? new Date(lastIncremental) : null,
    incrementalBackupsCount: incrementalBackups.length,
    totalStones: stones.length,
    totalCalculations: calculations.length
  };
}

/**
 * Clear all backups (for testing)
 */
export function clearAllBackups(): void {
  localStorage.removeItem(FULL_BACKUP_KEY);
  localStorage.removeItem(INCREMENTAL_BACKUP_KEY);
  localStorage.removeItem(LAST_BACKUP_TIME_KEY);
  localStorage.removeItem(LAST_FULL_BACKUP_KEY);
  localStorage.removeItem(CHANGES_TRACKER_KEY);
  console.log('🗑️ All backups cleared');
}
````

## File: src/utils/calculationHistory.ts

````ts
import { CalculationHistoryEntry } from '../types';

const HISTORY_DB_KEY = 'kiln_calculator_history';

/**
 * Get all calculation history from localStorage
 */
export function getCalculationHistory(): CalculationHistoryEntry[] {
  try {
    const data = localStorage.getItem(HISTORY_DB_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    // Convert date string back to Date object
    return parsed.map((entry: any) => ({
      ...entry,
      dateCreated: new Date(entry.dateCreated),
    }));
  } catch (error) {
    console.error('Error reading calculation history:', error);
    return [];
  }
}

/**
 * Save calculation history to localStorage
 */
function saveCalculationHistory(history: CalculationHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_DB_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving calculation history:', error);
  }
}

/**
 * Add new calculation to history
 */
export function addCalculationToHistory(
  entry: Omit<CalculationHistoryEntry, 'id' | 'dateCreated'>
): CalculationHistoryEntry {
  const history = getCalculationHistory();
  const newEntry: CalculationHistoryEntry = {
    ...entry,
    id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    dateCreated: new Date(),
  };
  history.unshift(newEntry); // Add to beginning (newest first)
  saveCalculationHistory(history);
  return newEntry;
}

/**
 * Delete calculation from history
 */
export function deleteCalculationFromHistory(id: string): boolean {
  const history = getCalculationHistory();
  const filtered = history.filter((entry) => entry.id !== id);
  
  if (filtered.length === history.length) return false;
  
  saveCalculationHistory(filtered);
  return true;
}

/**
 * Get recent N calculations
 */
export function getRecentCalculations(limit: number = 50): CalculationHistoryEntry[] {
  const history = getCalculationHistory();
  return history.slice(0, limit);
}

/**
 * Clear all calculation history (for testing)
 */
export function clearCalculationHistory(): void {
  localStorage.removeItem(HISTORY_DB_KEY);
}
````

## File: src/utils/constants.ts

````ts
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
````

## File: src/utils/costCalculations.ts

````ts
import {
  KilnConfig,
  LoadingCalculation,
  ProductWithType,
  CostParameters,
  CostCalculationResult,
} from '../types';
import { getAutoParameters } from './costLogic';

// Константы из таблицы
const CONSTANTS = {
  CAPEX: 405, // mil Rp
  OPEX: 235, // mil Rp / month
  ELECTRICITY_COST: 0.36, // mil Rp per firing
  SALARY_TAXES: 0.93, // mil Rp per firing
  FIRING_PER_MONTH: 22, // количество обжигов в месяц
  VAT_RATE: 0.12, // 12% НДС
  ANGOBE_GLAZES_STANDARD: 0.2, // mil Rp
  VAT_EXPENSES_RATE: 1.25, // VAT на расходы
  MARGIN_INDONESIA: 30.0, // % маржа для Indonesia
  MARGIN_ABROAD: 50.0, // % маржа для Abroad
};

/**
 * Основная функция расчета стоимости производства
 */
export function calculateCost(
  kiln: KilnConfig,
  product: ProductWithType,
  kilnLoading: LoadingCalculation,
  stoneCost: number, // mil Rp за м² - из базы или ввод пользователя
  customParams?: Partial<CostParameters>
): CostCalculationResult {
  // 1. Получаем автоматические параметры
  const autoParams = getAutoParameters(product, product.glaze);
  
  // 2. Базовые расчеты
  // Calculate product area based on shape
  let productArea: number;
  if (product.shape === 'round') {
    // For round products: π × (diameter/2)²
    const radiusInCm = product.length / 2;
    productArea = Math.PI * (radiusInCm * radiusInCm) / 10000; // m²
  } else if (product.shape === 'triangle') {
    // For triangles: (length × width) / 2
    productArea = (product.length * product.width) / 2 / 10000; // m²
  } else {
    // For rectangle, square, freeform: length × width
    productArea = (product.length * product.width) / 10000; // m²
  }
  // Pieces in kiln and volume available for production calculations
  // const pcsIn1Kiln = kilnLoading.totalPieces;
  // const volumeIn1Kiln = pcsIn1Kiln * productArea; // m2
  // Monthly production: volumeIn1Kiln * CONSTANTS.FIRING_PER_MONTH
  
  // 3. Price per 1 firing - базовые константы
  const electricityCost = CONSTANTS.ELECTRICITY_COST;
  const salaryTaxes = CONSTANTS.SALARY_TAXES;
  
  // 4. ИТОГО КАМЕНЬ = stoneCost + НДС + упаковка + доставка + брак + НДС на брак
  const packing = customParams?.packing ?? autoParams.packing;
  const vatOnStone = stoneCost * CONSTANTS.VAT_RATE;
  const deliveryCost = autoParams.deliveryCost;
  const stoneDefectPercent = customParams?.stoneDefectPercent ?? autoParams.stoneDefectPercent;
  const stoneDefectCost = stoneCost * (stoneDefectPercent / 100);
  const vatOnDefect = stoneDefectCost * CONSTANTS.VAT_RATE; // НДС на стоимость брака
  const totalStone = stoneCost + vatOnStone + packing + deliveryCost + stoneDefectCost + vatOnDefect;
  
  // 5. ИТОГО АНГОБ И ГЛАЗУРИ = (базовая × коэффициент) + кастомный цвет + кисть
  const angobeGlazesStandard = CONSTANTS.ANGOBE_GLAZES_STANDARD;
  const angobeCoefficient = customParams?.angobeCoefficient ?? autoParams.angobeCoefficient;
  let angobeGlazesTotal = angobeGlazesStandard * angobeCoefficient;
  
  // Добавляем стоимость кастомного цвета глазури (150,000 IDR/м² = 0.15 mil Rp/м²)
  if (product.customGlazeColor) {
    const customGlazeCost = 0.15; // mil Rp за м²
    angobeGlazesTotal += customGlazeCost;
  }
  
  // Добавляем стоимость использования кисти (100,000 IDR/м² = 0.1 mil Rp/м²)
  if (product.useBrush) {
    const brushCost = 0.1; // mil Rp за м²
    angobeGlazesTotal += brushCost;
  }
  
  // 6. СЕБЕСТОИМОСТЬ ОБЖИГА на 1 м²
  // Общая стоимость одного обжига печи (до деления на м²)
  const volumeIn1Kiln = kilnLoading.totalArea; // м² основного продукта в одном обжиге
  
  const capexPerFiring = CONSTANTS.CAPEX / 24 / CONSTANTS.FIRING_PER_MONTH / 2; // делим на 2 (две печи)
  const opexPerFiring = CONSTANTS.OPEX / CONSTANTS.FIRING_PER_MONTH / 2; // делим на 2 (две печи)
  const firingCostTotal = capexPerFiring + opexPerFiring + electricityCost + salaryTaxes;
  
  // Если есть доп. заполнение плитками 10×10 — вычитаем их себестоимость из обжига
  // Себестоимость обжига 10×10: 2.5 / 1.3 mil Rp за м²
  const FILLER_COST_PER_M2 = 2.5 / 1.3; // mil Rp per m² of 10×10 filler
  const fillerArea = kilnLoading.filler?.fillerArea ?? 0;
  const firingCostForMainProduct = firingCostTotal - fillerArea * FILLER_COST_PER_M2;
  
  const firingCostPerM2 = volumeIn1Kiln > 0
    ? Math.max(0, firingCostForMainProduct) / volumeIn1Kiln
    : 0;
  
  // 7. СЕБЕСТОИМОСТЬ 1 м² = себестоимость обжига + ИТОГО КАМЕНЬ + ИТОГО АНГОБ
  const basePricePerM2 = firingCostPerM2 + totalStone + angobeGlazesTotal;
  
  // 8. ПРОДАЖНАЯ ЦЕНА - правильная формула со сложением процентов
  // Формула: (себестоимость + дефект + продажи + прочие) + НДС, потом × маржа
  
  let defectExpensesPercent = autoParams.defectExpensesPercent;
  let salesExpensesPercent = autoParams.salesExpensesPercent;
  let otherExpensesPercent = autoParams.otherExpensesPercent;
  
  if (customParams) {
    defectExpensesPercent = customParams.defectExpensesPercent ?? defectExpensesPercent;
    salesExpensesPercent = customParams.salesExpensesPercent ?? salesExpensesPercent;
    otherExpensesPercent = customParams.otherExpensesPercent ?? otherExpensesPercent;
  }
  
  // Шаг 1-3: Считаем все проценты от себестоимости
  const defectExpensesCost = basePricePerM2 * (defectExpensesPercent / 100);
  const salesExpensesCost = basePricePerM2 * (salesExpensesPercent / 100);
  const otherExpensesCost = basePricePerM2 * (otherExpensesPercent / 100);
  
  // Шаг 4: ИТОГО ЗАТРАТЫ = себестоимость + все расходы
  const totalExpensesPrice = basePricePerM2 + defectExpensesCost + salesExpensesCost + otherExpensesCost;
  
  // Шаг 5: НДС от ИТОГО ЗАТРАТ
  const vatAmount = totalExpensesPrice * CONSTANTS.VAT_RATE;
  
  // Шаг 6: СУММА С НДС
  const priceWithVAT = totalExpensesPrice + vatAmount;
  
  // Шаг 7: Маржа для Indonesia — зависит от цены камня за м² (mil Rp)
  // > 4 mil → 20%, > 3 mil → 22%, > 2 mil → 25%, иначе базовая 30%
  const defaultMarginByStoneCost =
    stoneCost > 4 ? 20 : stoneCost > 3 ? 22 : stoneCost > 2 ? 25 : CONSTANTS.MARGIN_INDONESIA;
  const marginPercentIndonesia = customParams?.marginPercent ?? defaultMarginByStoneCost;
  const marginValueIndonesia = priceWithVAT * (marginPercentIndonesia / 100);
  const pricePerSqMIndonesia = priceWithVAT * (1 + marginPercentIndonesia / 100);
  
  // Для Abroad (50% margin)
  const marginPercentAbroad = CONSTANTS.MARGIN_ABROAD;
  const marginValueAbroad = priceWithVAT * (marginPercentAbroad / 100);
  const pricePerSqMAbroad = priceWithVAT * (1 + marginPercentAbroad / 100);
  
  // Для совместимости и отладки
  const totalExpenses = defectExpensesCost + salesExpensesCost + otherExpensesCost;
  
  // 9. Prices per 1 pcs
  const pricePerPcsIndonesia = pricePerSqMIndonesia * productArea;
  const pricePerPcsAbroad = pricePerSqMAbroad * productArea;
  
  // 12. Конвертация в IDR (рупии) - 1 mil Rp = 1,000,000 IDR
  const IDRperMilRp = 1000000;
  
  // 13. Собираем все параметры для результата
  const parameters: CostParameters = {
    capex: CONSTANTS.CAPEX,
    opex: CONSTANTS.OPEX,
    electricityCost,
    salaryTaxes,
    stoneCost,
    vat: vatOnStone, // НДС на камень
    packing,
    deliveryCost,
    stoneDefectPercent,
    stoneDefectCost,
    totalStone,
    angobeGlazesStandard,
    angobeCoefficient,
    angobeGlazesTotal,
    defectExpensesPercent,
    defectExpensesCost,
    salesExpensesPercent,
    salesExpensesCost,
    otherExpensesPercent,
    otherExpensesCost,
    totalExpenses,
    vatOnExpenses: vatAmount,
    marginPercent: marginPercentIndonesia,
    marginValue: marginValueIndonesia,
  };
  
  // 14. Детальная разбивка для отладки
  
  return {
    product,
    kiln,
    kilnLoading,
    orderQuantity: product.orderQuantity || 0,
    productArea,
    parameters,
    breakdown: {
      stoneCost,
      stoneWithDefect: stoneCost + stoneDefectCost + vatOnDefect,
      angobeGlazesTotal,
      electricity: electricityCost / volumeIn1Kiln, // per m²
      salary: salaryTaxes / volumeIn1Kiln, // per m²
      firingCost: firingCostPerM2, // per m² (включает CAPEX, OPEX, электричество, зарплату)
      baseCost: basePricePerM2, // Себестоимость до расчета цены
      defectCost: defectExpensesCost, // Расходы на дефект
      salesCost: salesExpensesCost, // Расходы на продажи
      otherCost: otherExpensesCost, // Прочие расходы
      totalExpenses: totalExpensesPrice, // ИТОГО ЗАТРАТЫ (себестоимость + все расходы)
      vatAmount: vatAmount, // НДС
      priceWithVAT: priceWithVAT, // СУММА С НДС
      finalPrice: pricePerSqMIndonesia, // ПРОДАЖНАЯ ЦЕНА
    },
    indonesia: {
      pricePerSqM: Math.round(pricePerSqMIndonesia * IDRperMilRp * 100) / 100,
      pricePerPcs: Math.round(pricePerPcsIndonesia * IDRperMilRp * 100) / 100,
      margin: Math.round(marginValueIndonesia * IDRperMilRp * 100) / 100,
      marginPercent: marginPercentIndonesia,
    },
    abroad: {
      pricePerSqM: Math.round(pricePerSqMAbroad * IDRperMilRp * 100) / 100,
      pricePerPcs: Math.round(pricePerPcsAbroad * IDRperMilRp * 100) / 100,
      margin: Math.round(marginValueAbroad * IDRperMilRp * 100) / 100,
      marginPercent: marginPercentAbroad,
    },
  };
}

/**
 * Форматирование цены в IDR с разделителями
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Форматирование числа с разделителями (без валюты)
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Быстрый расчет (используется с дефолтными параметрами)
 */
export function quickCalculate(
  kiln: KilnConfig,
  product: ProductWithType,
  kilnLoading: LoadingCalculation,
  stoneCost: number
): CostCalculationResult {
  return calculateCost(kiln, product, kilnLoading, stoneCost);
}
````

## File: src/utils/costLogic.ts

````ts
import { ProductDimensions, ProductType, TileShape, GlazePlacement } from '../types';

/**
 * Определяет стоимость упаковки на основе размеров изделия
 */
export function determinePackingCost(
  product: ProductDimensions & { type: ProductType }
): number {
  // Логика: чем больше изделие, тем выше стоимость упаковки
  const area = (product.length * product.width) / 10000; // m2
  const basePackingCost = 0.10; // mil Rp
  
  if (area < 0.01) return basePackingCost * 0.5;   // 0.05 mil Rp
  if (area < 0.05) return basePackingCost;         // 0.10 mil Rp
  if (area < 0.1) return basePackingCost * 1.5;    // 0.15 mil Rp
  if (area < 0.32) return basePackingCost * 2;     // 0.20 mil Rp (до 40×80 см)
  return basePackingCost * 3;                      // 0.30 mil Rp (больше 40×80 см)
}

/**
 * Определяет БАЗОВЫЙ процент брака камня (без учета количества)
 * Используется та же логика по размерам, что и для брака продукции
 */
export function determineStoneDefectPercent(
  product: ProductDimensions & { type: ProductType },
  _shape?: TileShape
): number {
  const { type, length, width } = product;
  
  // Для раковин и 3D изделий
  if (type === 'sink' || type === '3d') {
    const maxDim = Math.max(length, width);
    const minDim = Math.min(length, width);
    
    if (maxDim <= 35 && minDim <= 25) return 20.0;
    if (maxDim <= 60 && minDim <= 40) return 25.0;
    return 30.0;
  }
  
  // Для плитки и столешниц
  if (type === 'tile' || type === 'countertop') {
    const maxDim = Math.max(length, width);
    const minDim = Math.min(length, width);
    
    if (maxDim <= 40 && minDim <= 20) return 7.0;
    if (maxDim <= 60 && minDim <= 30) return 10.0;
    if (maxDim <= 80 && minDim <= 40) return 13.0;
    if (maxDim <= 100 && minDim <= 50) return 17.0;
    if (maxDim <= 120 && minDim <= 90) return 20.0;
    return 25.0;
  }
  
  return 10.0;
}

/**
 * Рассчитывает брак камня на основе количества штук в заказе
 * Логика: всегда +1 запасная штука, пока не достигнут базовый процент
 * 
 * Примеры:
 * - 1 шт → +1 запасная = 100% брак
 * - 2 шт → +1 запасная = 50% брак
 * - 10 шт → +1 запасная = 10% брак
 * - 100 шт → если базовый брак 8%, то 8%
 * 
 * @param baseDefectPercent - базовый процент брака для данного размера
 * @param orderQuantity - количество штук в заказе
 */
export function calculateStoneDefectByQuantity(
  baseDefectPercent: number,
  orderQuantity: number
): number {
  if (orderQuantity <= 0) {
    return baseDefectPercent;
  }
  
  // Брак от дополнительной штуки
  const defectFromExtra = (1 / orderQuantity) * 100;
  
  // Возвращаем максимум из базового и расчетного
  return Math.max(baseDefectPercent, defectFromExtra);
}

/**
 * Определяет коэффициент для ангоба и глазури
 * Зависит от типа изделия, формы, расположения глазури и толщины
 */
export function determineAngobeCoefficient(
  product: ProductDimensions & { type: ProductType },
  glaze: GlazePlacement,
  shape?: TileShape
): number {
  const { type, thickness } = product;
  
  let baseCoefficient = 1.0;
  
  // Определяем базовый коэффициент по типу изделия
  if (type === 'tile') {
    // Для плитки только если толщина <= 5 см
    if (thickness <= 5) {
      switch (glaze) {
        case 'face-only':
          baseCoefficient = 1.0;
          break;
        case 'face-1-2-edges':
          baseCoefficient = 1.1;
          break;
        case 'face-3-4-edges':
          baseCoefficient = 1.2;
          break;
        case 'face-with-back':
          baseCoefficient = 1.25;
          break;
      }
    } else {
      // Для плитки толщиной > 5 см используем 1.0
      baseCoefficient = 1.0;
    }
  } else if (type === 'sink') {
    // Для раковин
    if (glaze === 'face-only') {
      baseCoefficient = 1.5;
    } else if (glaze === 'face-3-4-edges') {
      baseCoefficient = 1.8;
    } else {
      // Если выбран другой вариант (не должно быть), используем face-only
      baseCoefficient = 1.5;
    }
  } else if (type === 'countertop') {
    // Для столешниц
    if (glaze === 'face-only') {
      baseCoefficient = 1.5;
    } else if (glaze === 'face-3-4-edges') {
      baseCoefficient = 1.6;
    } else if (glaze === 'face-with-back') {
      baseCoefficient = 1.8;
    } else {
      // Для других вариантов используем face-only
      baseCoefficient = 1.5;
    }
  } else if (type === '3d') {
    // Для 3D изделий: два варианта
    if (glaze === 'face-only') {
      baseCoefficient = 1.3;
    } else if (glaze === 'face-3-4-edges') {
      baseCoefficient = 1.5;
    } else {
      // Для других вариантов используем face-only
      baseCoefficient = 1.3;
    }
  }
  
  // Применяем дополнительный коэффициент 1.2 для специальных форм
  if (shape === 'round' || shape === 'freeform' || shape === 'triangle') {
    baseCoefficient *= 1.2;
  }
  
  return baseCoefficient;
}

/**
 * Определяет базовые затраты на брак (в процентах от базовой цены)
 * Зависит от типа изделия, формы и размеров
 */
export function determineDefectExpensesPercent(
  productWithType: { type: ProductType; thickness: number; length: number; width: number },
  _shape?: TileShape
): number {
  const { type, length, width } = productWithType;
  
  // Для раковин и 3D изделий - логика по размерам
  if (type === 'sink' || type === '3d') {
    const maxDim = Math.max(length, width);
    const minDim = Math.min(length, width);
    
    // до 25×35
    if (maxDim <= 35 && minDim <= 25) {
      return 20.0;
    }
    // до 40×60
    if (maxDim <= 60 && minDim <= 40) {
      return 25.0;
    }
    // свыше 40×60
    return 30.0;
  }
  
  // Для плитки и столешниц (квадрат/прямоугольник)
  if (type === 'tile' || type === 'countertop') {
    // Для круглых и треугольных используем ту же логику по размерам
    const maxDim = Math.max(length, width);
    const minDim = Math.min(length, width);
    
    // до 20×40
    if (maxDim <= 40 && minDim <= 20) {
      return 7.0;
    }
    // от 20×40 до 30×60
    if (maxDim <= 60 && minDim <= 30) {
      return 10.0;
    }
    // от 30×60 до 40×80
    if (maxDim <= 80 && minDim <= 40) {
      return 13.0;
    }
    // от 40×80 до 50×100
    if (maxDim <= 100 && minDim <= 50) {
      return 17.0;
    }
    // от 50×100 до 90×120
    if (maxDim <= 120 && minDim <= 90) {
      return 20.0;
    }
    // свыше 90×120
    return 25.0;
  }
  
  // По умолчанию
  return 10.0;
}

/**
 * Определяет затраты на продажи (в процентах)
 */
export function determineSalesExpensesPercent(
  _productWithType: { length: number; width: number; type: ProductType }
): number {
  // Фиксированный процент 10%
  return 10.0;
}

/**
 * Определяет прочие затраты (в процентах)
 */
export function determineOtherExpensesPercent(): number {
  // Фиксированный процент 5%
  return 5.0;
}

/**
 * Определяет стоимость доставки на основе толщины изделия
 * 1 м² × 1 см = 30 кг
 * Стоимость: 3000 IDR/кг = 0.003 mil Rp/кг
 * Формула: thickness × 30 × 0.003 = thickness × 0.09
 */
export function determineDeliveryCost(thickness: number): number {
  // Формула: thickness (см) × 30 (кг) × 0.003 (mil Rp/кг) = thickness × 0.09
  return thickness * 0.09; // mil Rp за м²
}

/**
 * Определяет, является ли плитка квадратной или прямоугольной
 */
export function determineShape(product: ProductDimensions): TileShape {
  const ratio = product.length / product.width;
  // Если соотношение близко к 1, то квадратная
  if (ratio >= 0.9 && ratio <= 1.1) {
    return 'square';
  }
  // Иначе прямоугольная (для автоопределения используем базовые формы)
  return 'rectangle';
}

/**
 * Получить все автоматические параметры для продукта
 */
export function getAutoParameters(
  product: ProductDimensions & { type: ProductType; shape?: TileShape; orderQuantity?: number },
  glaze?: GlazePlacement
) {
  const shape = product.shape || (product.type === 'tile' ? determineShape(product) : undefined);
  const baseStoneDefect = determineStoneDefectPercent(product, shape);
  const orderQuantity = product.orderQuantity || 1;
  
  return {
    packing: determinePackingCost(product),
    stoneDefectPercent: calculateStoneDefectByQuantity(baseStoneDefect, orderQuantity),
    angobeCoefficient: glaze 
      ? determineAngobeCoefficient(product, glaze, shape)
      : 1.0, // Дефолтное значение если glaze не передан
    defectExpensesPercent: determineDefectExpensesPercent(product, shape),
    salesExpensesPercent: determineSalesExpensesPercent(product),
    otherExpensesPercent: determineOtherExpensesPercent(),
    deliveryCost: determineDeliveryCost(product.thickness),
    shape,
  };
}
````

## File: src/utils/kilnCalculations.ts

````ts
import {
  KilnConfig,
  ProductDimensions,
  LoadingCalculation,
  CalculationResult,
  ProductWithType,
  TileShape,
  ProductType,
} from '../types';
import {
  TILE_GAP,
  AIR_GAP,
  SHELF_THICKNESS,
  FLAT_ON_EDGE_COEFFICIENT,
  MAX_FILLER_AREA,
} from './constants';

// Максимальная высота установки плитки на ребро
const MAX_EDGE_HEIGHT = 15; // см

// Максимальные размеры для большой печи (квадрат/прямоугольник)
const MAX_BIG_KILN_LENGTH = 40; // см
const MAX_BIG_KILN_WIDTH = 30; // см

// Максимальная высота для малой печи
const MAX_SMALL_KILN_HEIGHT = 30; // см

// Зазор между треугольниками при парной укладке
const TRIANGLE_PAIR_GAP = 1.5; // см

// Минимальные размеры изделий для валидации
const MIN_PRODUCT_SIZE = 3; // см - минимальный размер изделия (длина/ширина)
const MIN_THICKNESS = 0.8; // см - минимальная толщина

/**
 * Рассчитывает зазор между изделиями в зависимости от типа продукта
 * Для раковин и столешниц: минимум 10 см или половина высоты
 * Для плиток: стандартный TILE_GAP (1.2 см)
 */
function getProductGap(product: ProductDimensions, type?: ProductType): number {
  if (type === 'sink' || type === 'countertop') {
    // Минимум 10 см, но если высота > 20 см, берем половину высоты
    return Math.max(10, product.thickness / 2);
  }
  return TILE_GAP;
}

/**
 * Рассчитывает площадь изделия в м² с учетом его формы
 * - Прямоугольник/квадрат: length × width
 * - Круг: π × (diameter/2)²
 * - Криволинейная форма: length × width (как прямоугольник)
 * - Треугольник: (length × width) / 2
 */
function calculateProductArea(
  product: ProductDimensions,
  shape?: TileShape
): number {
  const lengthM = product.length / 100; // в метры
  const widthM = product.width / 100;   // в метры
  
  if (shape === 'round') {
    // Для круга используем diameter (length === width для круглых форм)
    const diameter = product.length;
    const radius = diameter / 2 / 100; // в метры
    return Math.PI * radius * radius;
  } else if (shape === 'freeform') {
    // Для криволинейной формы считаем как прямоугольник
    return lengthM * widthM;
  } else if (shape === 'triangle') {
    // Для треугольника: половина от прямоугольника
    return (lengthM * widthM) / 2;
  } else {
    // Для квадрата и прямоугольника
    return lengthM * widthM;
  }
}

/**
 * Получить эффективные размеры изделия с учетом его формы
 * - Rectangle/Square: length × width (как есть)
 * - Round: квадрат со стороной = диаметр
 * - Freeform: прямоугольник length × width (как есть)
 * - Triangle: пара треугольников (length+1.5) × (width+1.5)
 */
function getEffectiveDimensions(
  product: ProductDimensions,
  shape?: TileShape
): { effectiveLength: number; effectiveWidth: number; isTrianglePair: boolean } {
  // По умолчанию - прямоугольные размеры
  let effectiveLength = product.length;
  let effectiveWidth = product.width;
  let isTrianglePair = false;
  
  if (shape === 'round') {
    // Круг занимает место как квадрат с размером = диаметр
    const diameter = product.length; // length === width для круглых форм
    effectiveLength = diameter;
    effectiveWidth = diameter;
  } else if (shape === 'freeform') {
    // Криволинейная форма занимает прямоугольное пространство
    effectiveLength = product.length;
    effectiveWidth = product.width;
  } else if (shape === 'triangle') {
    // Треугольники кладутся парами с зазором 1.5 см
    // 2 треугольника занимают: (length + 1.5) × (width + 1.5)
    effectiveLength = product.length + TRIANGLE_PAIR_GAP;
    effectiveWidth = product.width + TRIANGLE_PAIR_GAP;
    isTrianglePair = true;
  }
  
  return { effectiveLength, effectiveWidth, isTrianglePair };
}

/**
 * Рассчитывает количество плиток по одному измерению с учетом зазоров
 */
function calculateTilesAlongDimension(
  availableSpace: number,
  tileSize: number,
  gap: number = TILE_GAP
): number {
  // Формула: floor((доступное_пространство + зазор) / (размер_плитки + зазор))
  return Math.floor((availableSpace + gap) / (tileSize + gap));
}

/**
 * Рассчитывает заполнение остатков пространства малой печи плитками 10×10 на ребро
 * Применяется для столешниц, раковин, 3D и других типов изделий
 */
function calculateSmallKilnFiller(
  kiln: KilnConfig,
  mainProduct: ProductDimensions,
  _mainProductQuantity: number,
  tilesAcrossWidth: number,
  tilesAcrossDepth: number
): {
  fillerPieces: number;
  fillerArea: number;
  fillerDetails: string;
} | null {
  // Только для малой печи
  if (kiln.name !== 'Small (new)') {
    return null;
  }
  
  // Константы
  const FILLER_SIZE = 10; // см (10×10)
  const FILLER_THICKNESS = 1; // см (предполагаемая толщина плитки 10×10)
  const MIN_SPACE_TO_FILL = 21; // см - минимальное свободное пространство для заполнения
  const FILLER_COEFFICIENT = 0.5; // коэффициент загрузки для заполнителя
  
  const { workingArea } = kiln;
  
  // Для малой печи используем расширенную зону (100×150) если изделие <= 100 см
  let effectiveWorkingWidth = workingArea.width;
  let effectiveWorkingDepth = workingArea.depth;
  
  // Рассчитываем занятое основным изделием пространство
  // Предполагаем, что изделие размещается плашмя
  const productWithShape = mainProduct as ProductWithType;
  const shape = productWithShape.shape;
  const { effectiveLength, effectiveWidth } = getEffectiveDimensions(mainProduct, shape);
  
  const maxDimension = Math.max(effectiveLength, effectiveWidth);
  if (maxDimension <= 100) {
    effectiveWorkingWidth = 100;
    effectiveWorkingDepth = 150;
  }
  
  // Получаем правильный зазор для типа продукта
  const productWithType = mainProduct as ProductWithType;
  const type = productWithType.type;
  const gap = getProductGap(mainProduct, type);
  
  // Рассчитываем РЕАЛЬНО занятое основным изделием пространство
  const occupiedDepth = (tilesAcrossDepth * effectiveLength) + 
                        ((tilesAcrossDepth - 1) * gap);
  const occupiedWidth = (tilesAcrossWidth * effectiveWidth) + 
                        ((tilesAcrossWidth - 1) * gap);
  
  // Проверяем свободное пространство по длине и ширине
  const remainingDepth = effectiveWorkingDepth - occupiedDepth;
  const remainingWidth = effectiveWorkingWidth - occupiedWidth;
  
  let fillerPieces = 0;
  const fillerDetails: string[] = [];
  
  // Заполняем остаток по глубине (если > 21 см)
  if (remainingDepth > MIN_SPACE_TO_FILL) {
    // Плитки 10×10 на ребро: высота = 10 см, ширина пары = 2 см
    const pairWidth = FILLER_THICKNESS * 2;
    const pairsAcrossWidth = calculateTilesAlongDimension(effectiveWorkingWidth, pairWidth);
    const rowsAcrossDepth = calculateTilesAlongDimension(remainingDepth, FILLER_SIZE);
    
    const fillerInDepth = pairsAcrossWidth * 2 * rowsAcrossDepth;
    fillerPieces += fillerInDepth;
    fillerDetails.push(`по глубине: ${fillerInDepth} шт`);
  }
  
  // Заполняем остаток по ширине (если > 21 см)
  if (remainingWidth > MIN_SPACE_TO_FILL) {
    // Плитки 10×10 на ребро: высота = 10 см, ширина пары = 2 см
    const pairWidth = FILLER_THICKNESS * 2;
    const pairsAcrossWidth = calculateTilesAlongDimension(remainingWidth, pairWidth);
    const rowsAcrossDepth = calculateTilesAlongDimension(effectiveLength, FILLER_SIZE);
    
    const fillerInWidth = pairsAcrossWidth * 2 * rowsAcrossDepth;
    fillerPieces += fillerInWidth;
    fillerDetails.push(`по ширине: ${fillerInWidth} шт`);
  }
  
  if (fillerPieces === 0) {
    return null; // Нет свободного пространства для заполнения
  }
  
  // Применяем коэффициент 0.5 и округляем вверх
  let adjustedFillerPieces = Math.ceil(fillerPieces * FILLER_COEFFICIENT);
  
  // Рассчитываем площадь заполнителя (10×10 см = 0.01 м²)
  let fillerArea = adjustedFillerPieces * 0.01;
  
  // ОГРАНИЧЕНИЕ: максимум 2 м² заполнителя
  if (fillerArea > MAX_FILLER_AREA) {
    fillerArea = MAX_FILLER_AREA;
    // Пересчитываем количество штук исходя из ограничения
    adjustedFillerPieces = Math.floor(MAX_FILLER_AREA / 0.01);
    return {
      fillerPieces: adjustedFillerPieces,
      fillerArea: MAX_FILLER_AREA,
      fillerDetails: fillerDetails.join(', ') + ' (ограничено до 2 м²)',
    };
  }
  
  return {
    fillerPieces: adjustedFillerPieces,
    fillerArea,
    fillerDetails: fillerDetails.join(', '),
  };
}

/**
 * Расчет загрузки плиток на ребре (спина к спине)
 */
function calculateEdgeLoading(
  kiln: KilnConfig,
  product: ProductDimensions
): LoadingCalculation | null {
  const { workingArea } = kiln;
  
  // ОГРАНИЧЕНИЕ: Раковины, столешницы и 3D изделия ТОЛЬКО плашмя
  const productWithType = product as ProductWithType;
  const type = productWithType.type;

  if (type === 'sink' || type === 'countertop' || type === '3d') {
    return null; // Раковины, столешницы и 3D изделия нельзя ставить на ребро
  }
  
  // ОГРАНИЧЕНИЕ: максимальная высота на ребро = 15 см
  if (product.length > MAX_EDGE_HEIGHT) {
    return null; // Не можем ставить на ребро, слишком высокое
  }
  
  // ОГРАНИЧЕНИЕ: для малой печи максимальная высота = 30 см
  if (kiln.name === 'Small (new)' && product.length > MAX_SMALL_KILN_HEIGHT) {
    return null; // Изделие слишком высокое для малой печи
  }
  
  // ОГРАНИЧЕНИЕ: Проверка глазури для установки на ребро
  const productWithGlaze = product as ProductWithType;
  const glaze = productWithGlaze.glaze;
  const shape = productWithGlaze.shape;
  
  // Глазурь: только face-3-4-edges и face-with-back блокируют ребро
  // face-only и face-1-2-edges разрешают установку на ребро
  if (glaze === 'face-3-4-edges' || glaze === 'face-with-back') {
    return null; // Нельзя на ребро с глазурью на всех торцах или обороте
  }
  
  // ОГРАНИЧЕНИЕ: Проверка формы для установки на ребро
  // Круглые и неправильные формы физически нельзя поставить на ребро
  if (shape === 'round') {
    return null; // Круглые только лёжа
  }
  
  // Формы rectangle и triangle могут на ребре
  // face-only и face-1-2-edges разрешают ребро
  
  // Для малой печи: если изделие не влезает в workingArea, но влезает в пределы 100 см,
  // используем расширенные размеры
  let effectiveWorkingWidth = workingArea.width;
  let effectiveWorkingDepth = workingArea.depth;
  
  if (kiln.name === 'Small (new)') {
    const maxDimension = Math.max(product.length, product.width);
    if (maxDimension <= 100) {
      effectiveWorkingWidth = 100;
      effectiveWorkingDepth = 150;
    }
  }
  
  // Ширина пары плиток на ребре
  const pairWidth = product.thickness * 2;
  
  // Количество пар по ширине
  const pairsAcrossWidth = calculateTilesAlongDimension(
    effectiveWorkingWidth,
    pairWidth
  );
  
  // Количество рядов по глубине
  const rowsAcrossDepth = calculateTilesAlongDimension(
    effectiveWorkingDepth,
    product.width
  );
  
  // Общее количество плиток на ребре на одном уровне (2 плитки в паре)
  const edgePiecesPerLevel = pairsAcrossWidth * 2 * rowsAcrossDepth;
  
  if (edgePiecesPerLevel === 0) {
    return null; // Не помещается ни одна плитка
  }
  
  // Площадь полки (используем эффективные размеры)
  const shelfArea = (effectiveWorkingWidth * effectiveWorkingDepth) / 10000; // в м²
  
  // Плитки плашмя поверх ребра (30% площади полки)
  const flatAreaAvailable = shelfArea * FLAT_ON_EDGE_COEFFICIENT;
  
  // Для очень маленьких изделий ограничиваем количество плашмя
  const productAreaM2 = calculateProductArea(product, shape);
  let flatPiecesPerLevel = Math.floor(flatAreaAvailable / productAreaM2);
  
  // Ограничение: не больше чем edgePiecesPerLevel * 2 (иначе нереалистично)
  // Это физическое ограничение пространства
  if (flatPiecesPerLevel > edgePiecesPerLevel * 2) {
    flatPiecesPerLevel = edgePiecesPerLevel * 2;
  }
  
  // Высота одного уровня: длина (на ребре) + воздушный зазор + полка + толщина (плашмя)
  const levelHeight = product.length + AIR_GAP + SHELF_THICKNESS + product.thickness;
  
  // Количество уровней (только для многоуровневых печей)
  let levels = 1;
  if (kiln.multiLevel && workingArea.height) {
    levels = Math.floor(workingArea.height / levelHeight);
  }
  
  // Общее количество плиток
  const totalEdgePieces = edgePiecesPerLevel * levels;
  const totalFlatPieces = flatPiecesPerLevel * levels;
  const totalPieces = totalEdgePieces + totalFlatPieces;
  
  // Применяем коэффициент печи (округление вверх)
  const adjustedTotalPieces = Math.ceil(totalPieces * kiln.coefficient);
  const adjustedEdgePieces = Math.ceil(totalEdgePieces * kiln.coefficient);
  const adjustedFlatPieces = Math.ceil(totalFlatPieces * kiln.coefficient);
  
  // Площадь рассчитываем от финального количества штук с учетом формы
  const productArea = calculateProductArea(product, shape);
  const adjustedEdgeArea = adjustedEdgePieces * productArea;
  const adjustedFlatArea = adjustedFlatPieces * productArea;
  const adjustedTotalArea = adjustedEdgeArea + adjustedFlatArea;
  
  return {
    method: 'combined',
    methodName: 'On edge + flat',
    totalPieces: adjustedTotalPieces,
    totalArea: adjustedTotalArea,
    levels,
    edgePieces: adjustedEdgePieces,
    flatPieces: adjustedFlatPieces,
    edgeArea: adjustedEdgeArea,
    flatArea: adjustedFlatArea,
  };
}

/**
 * Расчет загрузки плиток плашмя (лицом вверх)
 */
function calculateFlatLoading(
  kiln: KilnConfig,
  product: ProductDimensions
): LoadingCalculation | null {
  const { workingArea } = kiln;
  
  // ОГРАНИЧЕНИЕ: для малой печи максимальная высота = 30 см
  if (kiln.name === 'Small (new)' && product.thickness > MAX_SMALL_KILN_HEIGHT) {
    return null; // Изделие слишком толстое для малой печи
  }
  
  // ОГРАНИЧЕНИЕ: Проверка глазури для укладки плашмя
  const productWithGlaze = product as ProductWithType;
  const glaze = productWithGlaze.glaze;
  
  // Если глазурь заходит на оборотную сторону - нельзя укладывать в несколько уровней
  const hasBackGlaze = glaze === 'face-with-back';
  
  // Получаем эффективные размеры с учетом формы изделия
  const shape = productWithGlaze.shape;
  const { effectiveLength, effectiveWidth, isTrianglePair } = getEffectiveDimensions(product, shape);
  
  // Получаем правильный зазор для типа продукта
  const productWithType = product as ProductWithType;
  const type = productWithType.type;
  const gap = getProductGap(product, type);
  
  // Для малой печи: если изделие не влезает в workingArea, но влезает в пределах рабочих размеров,
  // используем расширенные размеры (пользователь кладет с торцов)
  let effectiveWorkingWidth = workingArea.width;
  let effectiveWorkingDepth = workingArea.depth;
  
  if (kiln.name === 'Small (new)') {
    const maxDimension = Math.max(effectiveLength, effectiveWidth);
    const minDimension = Math.min(effectiveLength, effectiveWidth);
    
    // Для столешниц/раковин: используем полные рабочие размеры 150×100
    // Для остальных: используем 100×150, но max <= 100
    if (type === 'sink' || type === 'countertop') {
      if (maxDimension <= 150 && minDimension <= 100) {
        // Можем использовать полную рабочую зону для столешниц
        effectiveWorkingWidth = 100;
        effectiveWorkingDepth = 150;
      }
    } else {
      if (maxDimension <= 100) {
        // Можем использовать расширенную зону для обычных изделий
        effectiveWorkingWidth = 100;
        effectiveWorkingDepth = 150;
      }
    }
  }
  
  // Количество плиток по ширине и глубине
  let tilesAcrossWidth = calculateTilesAlongDimension(
    effectiveWorkingWidth,
    effectiveWidth,
    gap
  );
  
  let tilesAcrossDepth = calculateTilesAlongDimension(
    effectiveWorkingDepth,
    effectiveLength,
    gap
  );
  
  // Для столешниц/раковин в малой печи: проверяем оба варианта раскладки
  if (kiln.name === 'Small (new)' && (type === 'sink' || type === 'countertop')) {
    // Вариант 1: как есть (effectiveLength вдоль depth, effectiveWidth вдоль width)
    const option1Width = calculateTilesAlongDimension(effectiveWorkingWidth, effectiveWidth, gap);
    const option1Depth = calculateTilesAlongDimension(effectiveWorkingDepth, effectiveLength, gap);
    const option1Total = option1Width * option1Depth;
    
    // Вариант 2: развернуть (effectiveLength вдоль width, effectiveWidth вдоль depth)
    const option2Width = calculateTilesAlongDimension(effectiveWorkingWidth, effectiveLength, gap);
    const option2Depth = calculateTilesAlongDimension(effectiveWorkingDepth, effectiveWidth, gap);
    const option2Total = option2Width * option2Depth;
    
    // Выбираем вариант с большим количеством
    if (option2Total > option1Total) {
      tilesAcrossWidth = option2Width;
      tilesAcrossDepth = option2Depth;
    }
  }
  
  // Базовое количество (для треугольников это пары, поэтому умножаем на 2)
  let piecesPerLevel = tilesAcrossWidth * tilesAcrossDepth;
  if (isTrianglePair) {
    piecesPerLevel = piecesPerLevel * 2; // В каждой паре 2 треугольника
  }
  
  if (piecesPerLevel === 0) {
    return null; // Не помещается ни одна плитка
  }
  
  // Высота одного уровня: толщина + воздушный зазор + полка
  const levelHeight = product.thickness + AIR_GAP + SHELF_THICKNESS;
  
  // Количество уровней (только для многоуровневых печей)
  // ОГРАНИЧЕНИЕ: если глазурь на обороте - только один уровень
  let levels = 1;
  if (kiln.multiLevel && workingArea.height && !hasBackGlaze) {
    levels = Math.floor(workingArea.height / levelHeight);
  }
  
  // Для малой печи принудительно 1 уровень
  if (kiln.name === 'Small (new)') {
    levels = 1;
  }
  
  // Общее количество плиток
  const totalPieces = piecesPerLevel * levels;
  
  // Применяем коэффициент печи (округление вверх)
  // Для раковин и столешниц коэффициент = 1.0 (не применяется)
  const effectiveCoefficient = (type === 'sink' || type === 'countertop') ? 1.0 : kiln.coefficient;
  const adjustedTotalPieces = Math.ceil(totalPieces * effectiveCoefficient);
  
  // Площадь рассчитываем от финального количества штук с учетом формы
  const productArea = calculateProductArea(product, shape);
  const adjustedTotalArea = adjustedTotalPieces * productArea;
  
  // Для малой печи проверяем возможность заполнения остатков
  let fillerData: {
    fillerPieces: number;
    fillerArea: number;
    fillerDetails: string;
  } | undefined = undefined;
  
  if (kiln.name === 'Small (new)') {
    // Применяем filler для ВСЕХ форм в малой печи
    // (круглые, треугольные, криволинейные, квадратные, прямоугольные)
    const result = calculateSmallKilnFiller(
      kiln, 
      product, 
      adjustedTotalPieces,
      tilesAcrossWidth,
      tilesAcrossDepth
    );
    if (result) {
      fillerData = result;
    }
  }
  
  return {
    method: 'flat',
    methodName: 'Flat (face up)',
    totalPieces: adjustedTotalPieces,
    totalArea: adjustedTotalArea,
    levels,
    filler: fillerData,
  };
}

/**
 * Основная функция расчета оптимальной загрузки печи
 */
export function calculateKilnLoading(
  kiln: KilnConfig,
  product: ProductDimensions | ProductWithType
): CalculationResult | null {
  // Валидация входных данных
  if (
    product.length <= 0 ||
    product.width <= 0 ||
    product.thickness <= 0
  ) {
    return null;
  }
  
  // Валидация минимальных размеров
  if (
    product.length < MIN_PRODUCT_SIZE ||
    product.width < MIN_PRODUCT_SIZE ||
    product.thickness < MIN_THICKNESS
  ) {
    return null; // Изделие слишком маленькое
  }
  
  // ОГРАНИЧЕНИЕ: для большой печи
  if (kiln.name === 'Large (old)') {
    const productWithShape = product as ProductWithType;
    const shape = productWithShape.shape;
    const type = productWithShape.type;
    
    // Для раковин и столешниц: max разворот 20×40 см
    if (type === 'sink' || type === 'countertop') {
      const maxDimension = Math.max(product.length, product.width);
      const minDimension = Math.min(product.length, product.width);
      
      if (maxDimension > 40 || minDimension > 20) {
        return null; // Не помещается в большую печь
      }
    }
    // Для квадратных и прямоугольных плиток: max 30×40 см
    else if (shape === 'square' || shape === 'rectangle') {
      // Проверяем оба измерения - любое не должно превышать max
      const maxDimension = Math.max(product.length, product.width);
      const minDimension = Math.min(product.length, product.width);
      
      if (maxDimension > MAX_BIG_KILN_LENGTH || minDimension > MAX_BIG_KILN_WIDTH) {
        return null; // Не помещается в большую печь
      }
    }
  }
  
  // ОГРАНИЧЕНИЕ: для малой печи
  if (kiln.name === 'Small (new)') {
    const productWithShape = product as ProductWithType;
    const type = productWithShape.type;
    const maxDimension = Math.max(product.length, product.width);
    const minDimension = Math.min(product.length, product.width);
    
    // Фактические размеры печи: 105×160 см
    // Рабочие размеры (для расчетов): 100×150 см
    // Для столешниц и раковин: можем использовать полные 100×150 см
    // Для остальных изделий: максимальное изделие 100 см (нужны отступы)
    if (type === 'sink' || type === 'countertop') {
      // Для столешниц/раковин: max 150×100 см (можно класть вручную)
      // Проверяем, что изделие помещается в 150×100 (любая ориентация)
      if (maxDimension > 150 || minDimension > 100) {
        return null; // Не помещается в малую печь
      }
    } else {
      // Для всех остальных: max 100 см по любому размеру
      if (maxDimension > 100) {
        return null; // Не помещается в малую печь (макс. 100 см)
      }
    }
  }
  
  // Рассчитываем оба варианта загрузки
  const edgeLoading = calculateEdgeLoading(kiln, product);
  const flatLoading = calculateFlatLoading(kiln, product);
  
  // Если ни один вариант не подходит
  if (!edgeLoading && !flatLoading) {
    return null;
  }
  
  // Выбираем оптимальный вариант (по максимальной площади)
  let optimalLoading: LoadingCalculation;
  let alternativeLoading: LoadingCalculation | undefined;
  
  if (!edgeLoading) {
    optimalLoading = flatLoading!;
  } else if (!flatLoading) {
    optimalLoading = edgeLoading;
  } else {
    // Сравниваем по площади
    if (edgeLoading.totalArea >= flatLoading.totalArea) {
      optimalLoading = edgeLoading;
      alternativeLoading = flatLoading;
    } else {
      optimalLoading = flatLoading;
      alternativeLoading = edgeLoading;
    }
  }
  
  return {
    kiln,
    product,
    optimalLoading,
    alternativeLoading,
  };
}
````

## File: src/utils/stoneDatabase.ts

````ts
import { StoneEntry, ProductType } from '../types';

const STONE_DB_KEY = 'kiln_calculator_stone_database';

/**
 * Получить всю базу данных камней из LocalStorage
 */
export function getStoneDatabase(): StoneEntry[] {
  try {
    const data = localStorage.getItem(STONE_DB_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    // Преобразуем строку даты обратно в Date объект
    return parsed.map((entry: any) => ({
      ...entry,
      dateAdded: new Date(entry.dateAdded),
    }));
  } catch (error) {
    console.error('Error reading stone database:', error);
    return [];
  }
}

/**
 * Сохранить базу данных в LocalStorage
 */
function saveStoneDatabase(db: StoneEntry[]): void {
  try {
    localStorage.setItem(STONE_DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Error saving stone database:', error);
  }
}

/**
 * Добавить новую запись о камне в базу
 */
export function addStoneEntry(
  entry: Omit<StoneEntry, 'id' | 'dateAdded'>
): StoneEntry {
  const db = getStoneDatabase();
  const newEntry: StoneEntry = {
    ...entry,
    id: `stone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    dateAdded: new Date(),
  };
  db.push(newEntry);
  saveStoneDatabase(db);
  return newEntry;
}

/**
 * Обновить существующую запись о камне
 */
export function updateStoneEntry(
  id: string,
  updates: Partial<Omit<StoneEntry, 'id' | 'dateAdded'>>
): StoneEntry | null {
  const db = getStoneDatabase();
  const index = db.findIndex((entry) => entry.id === id);
  
  if (index === -1) return null;
  
  db[index] = {
    ...db[index],
    ...updates,
  };
  
  saveStoneDatabase(db);
  return db[index];
}

/**
 * Удалить запись о камне из базы
 */
export function deleteStoneEntry(id: string): boolean {
  const db = getStoneDatabase();
  const filteredDb = db.filter((entry) => entry.id !== id);
  
  if (filteredDb.length === db.length) return false;
  
  saveStoneDatabase(filteredDb);
  return true;
}

/**
 * Получить запись о камне по ID
 */
export function getStoneEntryById(id: string): StoneEntry | null {
  const db = getStoneDatabase();
  return db.find((entry) => entry.id === id) || null;
}

/**
 * Найти подходящий камень по критериям
 */
export function findStoneByCriteria(
  productType: ProductType,
  size: { length: number; width: number }
): StoneEntry | null {
  const db = getStoneDatabase();
  
  // Фильтруем по типу продукта, если указан
  let filtered = db.filter((entry) => {
    if (!entry.productType) return true; // Если тип не указан, подходит для всех
    return entry.productType === productType;
  });
  
  // Проверяем диапазон размеров, если указан
  filtered = filtered.filter((entry) => {
    if (!entry.sizeRange) return true; // Если диапазон не указан, подходит для всех размеров
    
    // Парсим диапазон вида "10x10-20x20"
    const rangeMatch = entry.sizeRange.match(/(\d+)x(\d+)-(\d+)x(\d+)/);
    if (!rangeMatch) return true;
    
    const [, minL, minW, maxL, maxW] = rangeMatch.map(Number);
    
    // Проверяем, попадает ли размер в диапазон
    const length = size.length;
    const width = size.width;
    
    return (
      length >= minL &&
      length <= maxL &&
      width >= minW &&
      width <= maxW
    );
  });
  
  // Сортируем по дате добавления (новые сначала) и возвращаем первый
  filtered.sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime());
  
  return filtered[0] || null;
}

/**
 * Поиск камней по названию
 */
export function searchStonesByName(query: string): StoneEntry[] {
  const db = getStoneDatabase();
  const lowerQuery = query.toLowerCase();
  
  return db.filter((entry) =>
    entry.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Получить последние N записей
 */
export function getRecentStoneEntries(limit: number = 10): StoneEntry[] {
  const db = getStoneDatabase();
  return db
    .sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime())
    .slice(0, limit);
}

/**
 * Очистить всю базу данных (для тестирования)
 */
export function clearStoneDatabase(): void {
  localStorage.removeItem(STONE_DB_KEY);
}

/**
 * Find stones by exact dimensions and product parameters
 * Returns array of all matching entries (to detect duplicates)
 */
export function findStonesByExactMatch(
  productType: ProductType,
  _shape: string, // Currently not used in matching logic
  length: number,
  width: number,
  thickness: number
): StoneEntry[] {
  const db = getStoneDatabase();
  
  return db.filter((entry) => {
    // Match product type
    if (!entry.productType || entry.productType !== productType) return false;
    
    // Parse dimensions from sizeRange
    // Format: "100x72-100x72" (exact match stored as min=max)
    if (!entry.sizeRange) return false;
    
    const rangeMatch = entry.sizeRange.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
    if (!rangeMatch) return false;
    
    const [, minL, minW] = rangeMatch.map(Number);
    
    // Check if dimensions match exactly (with small tolerance for floating point)
    const lengthMatch = Math.abs(minL - length) < 0.01;
    const widthMatch = Math.abs(minW - width) < 0.01;
    
    // Check thickness match (with backward compatibility)
    // If entry has no thickness stored, consider it a match for backward compatibility
    const thicknessMatch = entry.thickness 
      ? Math.abs(entry.thickness - thickness) < 0.01
      : true;
    
    return lengthMatch && widthMatch && thicknessMatch;
  });
}

/**
 * Detect if there are multiple prices for the same product
 * Returns: null if no conflict, or { prices: [...], entries: [...] }
 * 
 * For tiles: compares pricePerM2
 * For countertops/sinks/3d: compares pricePerUnit
 */
export function detectPriceConflict(
  matches: StoneEntry[],
  productType: ProductType
): { prices: number[]; entries: StoneEntry[] } | null {
  if (matches.length <= 1) return null;
  
  // Determine which price field to compare
  const priceField = (productType === 'tile') ? 'pricePerM2' : 'pricePerUnit';
  
  // Get unique prices (with tolerance for floating point comparison)
  const prices = matches.map(e => e[priceField]);
  const uniquePrices: number[] = [];
  
  prices.forEach(price => {
    const exists = uniquePrices.some(p => Math.abs(p - price) < 0.001);
    if (!exists) {
      uniquePrices.push(price);
    }
  });
  
  if (uniquePrices.length > 1) {
    return {
      prices: uniquePrices.sort((a, b) => a - b),
      entries: matches
    };
  }
  
  return null; // Same price, no conflict
}
````

## File: src/utils/telegram.ts

````ts
import { CalculationHistoryEntry } from '../types';

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

/**
 * Send calculation result to Telegram group
 */
export async function sendCalculationToTelegram(
  entry: CalculationHistoryEntry
): Promise<boolean> {
  // Skip if no token or chat ID configured
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram integration not configured. Set VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID');
    console.log('Token:', TELEGRAM_BOT_TOKEN ? 'Present' : 'Missing');
    console.log('Chat ID:', TELEGRAM_CHAT_ID ? 'Present' : 'Missing');
    return false;
  }

  console.log('📤 Sending to Telegram...');
  console.log('Bot Token:', TELEGRAM_BOT_TOKEN.substring(0, 10) + '...');
  console.log('Chat ID:', TELEGRAM_CHAT_ID);

  try {
    const message = formatCalculationMessage(entry);
    console.log('Message prepared, length:', message.length);
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    console.log('Sending to URL:', url.substring(0, 50) + '...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API error response:', errorText);
      throw new Error(`Telegram API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Calculation sent to Telegram successfully!', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to send to Telegram:', error);
    return false;
  }
}

/**
 * Format IDR with dot thousand separators
 * Example: 20726921.42 → "20.726.921"
 */
function formatIDRforTelegram(value: number): string {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format million Rp with 3 decimal places and comma separator
 * Example: 0.1234 → "0,123"
 * Example: 2.5678 → "2,568"
 */
function formatMillionRpForTelegram(value: number): string {
  return value.toFixed(3).replace('.', ',');
}

/**
 * Format calculation entry as Telegram message
 */
function formatCalculationMessage(entry: CalculationHistoryEntry): string {
  const date = new Date(entry.dateCreated).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const productInfo = entry.tileShape
    ? `${entry.productType} (${entry.tileShape})`
    : entry.productType;

  const kilnName = entry.kilnUsed === 'average' 
    ? 'Average of kilns' 
    : entry.kilnUsed === 'big' 
      ? 'Large (old)' 
      : 'Small (new)';

  return `
🔥 <b>New Calculation by ${entry.manager}</b>

📅 Date: ${date}

📦 <b>Product:</b> ${productInfo}
📏 <b>Dimensions:</b> ${entry.dimensions.length} × ${entry.dimensions.width} × ${entry.dimensions.thickness} cm
🎨 <b>Glaze:</b> ${entry.glazePlacement}

🏭 <b>Kiln:</b> ${kilnName}
📊 <b>Loading:</b> ${entry.loadingArea.toFixed(2)} m² (${entry.loadingPieces} pcs)

💰 <b>Stone Cost:</b> ${formatMillionRpForTelegram(entry.stoneCost)} mil Rp/m²
📦 <b>Order Qty:</b> ${entry.orderQuantity} pcs

💵 <b>Indonesia Market:</b>
  • Per piece: ${formatIDRforTelegram(entry.costResult.indonesia.pricePerPcs)} IDR
  • Per m²: ${formatIDRforTelegram(entry.costResult.indonesia.pricePerSqM)} IDR
  • Margin: ${entry.costResult.indonesia.marginPercent.toFixed(1)}%

💎 <b>Abroad Market:</b>
  • Per piece: ${formatIDRforTelegram(entry.costResult.abroad.pricePerPcs)} IDR
  • Per m²: ${formatIDRforTelegram(entry.costResult.abroad.pricePerSqM)} IDR
  • Margin: ${entry.costResult.abroad.marginPercent.toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━
🆔 ID: ${entry.id}
`.trim();
}

/**
 * Test Telegram connection
 */
export async function testTelegramConnection(): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: '✅ Moonjar Calculator connected successfully!',
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('❌ Telegram connection test failed:', error);
    return false;
  }
}
````

