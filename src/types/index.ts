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
