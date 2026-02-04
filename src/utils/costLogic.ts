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
