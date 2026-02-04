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
