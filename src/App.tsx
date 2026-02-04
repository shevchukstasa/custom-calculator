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
// Stone database functions removed - using manual price input only
// import { findStoneByCriteria, findStonesByExactMatch, detectPriceConflict } from './utils/stoneDatabase';
// import { addStoneEntry } from './utils/stoneDatabase';
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
  const [selectedMarket, setSelectedMarket] = useState<Market | ''>('indonesia');
  
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
    // Database removed - performAutoLookup(product);
    
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
      // Database removed - autoSaveStoneToDatabase(productWithType);
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
      // Database removed - autoSaveStoneToDatabase(productWithType);
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

  /* Database removed
  /* Database removed
  const autoSaveStoneToDatabase = (product: ProductWithType) => {
    // Function disabled - database features removed for deployment
  };
  */

  // Database functions removed - manual stone price input only
  // const handleStoneSelect = (stone: StoneEntry) => { ... };
  // const handleAutoFindStone = (product: ProductDimensions) => { ... };

  /* Database removed
  const performAutoLookup = (product: ProductDimensions) => {
    // Function disabled - database features removed for deployment
  };
  */

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
                                onShowDB={() => {}}
                                onAutoFind={() => {}}
                                showDB={false}
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
