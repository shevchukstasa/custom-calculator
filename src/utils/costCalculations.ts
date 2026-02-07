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
  
  // 12. Конвертация в IDR (рупии) - 1 mil Rp = 1,000,000 IDR
  const IDRperMilRp = 1000000;

  // Минимальная цена за м² в IDR — в финальном результате не показываем меньше.
  // Цена за штуку пересчитывается из этой финальной цены за м²: штука = цена_за_м² × площадь_изделия.
  const MIN_PRICE_PER_SQ_M_IDR = 2_500_000;
  const indonesiaPricePerSqMIdr = Math.round(pricePerSqMIndonesia * IDRperMilRp * 100) / 100;
  const abroadPricePerSqMIdr = Math.round(pricePerSqMAbroad * IDRperMilRp * 100) / 100;
  const indonesiaPricePerSqMFinal = Math.max(indonesiaPricePerSqMIdr, MIN_PRICE_PER_SQ_M_IDR);
  const abroadPricePerSqMFinal = Math.max(abroadPricePerSqMIdr, MIN_PRICE_PER_SQ_M_IDR);
  const indonesiaPricePerPcsFinal = Math.round(indonesiaPricePerSqMFinal * productArea * 100) / 100;
  const abroadPricePerPcsFinal = Math.round(abroadPricePerSqMFinal * productArea * 100) / 100;
  
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
      pricePerSqM: indonesiaPricePerSqMFinal,
      pricePerPcs: indonesiaPricePerPcsFinal,
      margin: Math.round(marginValueIndonesia * IDRperMilRp * 100) / 100,
      marginPercent: marginPercentIndonesia,
    },
    abroad: {
      pricePerSqM: abroadPricePerSqMFinal,
      pricePerPcs: abroadPricePerPcsFinal,
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

/** Итоговая цена в целых рупиях (без копеек), для отображения в результате */
export function formatIDRWhole(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
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
