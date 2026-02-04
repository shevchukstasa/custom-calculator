import { KILNS } from './utils/constants';
import { calculateKilnLoading } from './utils/kilnCalculations';

console.log('=== Тестирование калькулятора загрузки печей ===\n');

// Тест 1: Большая печь, плитка 10x10x1.5
console.log('Тест 1: Большая печь, плитка 10×10×1.5 см');
const bigKilnTest = calculateKilnLoading(KILNS.big, {
  length: 10,
  width: 10,
  thickness: 1.5,
});

if (bigKilnTest) {
  console.log('Метод:', bigKilnTest.optimalLoading.methodName);
  console.log('Количество:', bigKilnTest.optimalLoading.totalPieces, 'шт');
  console.log('Площадь:', bigKilnTest.optimalLoading.totalArea.toFixed(2), 'м²');
  console.log('Уровней:', bigKilnTest.optimalLoading.levels);
  console.log('ОЖИДАЕТСЯ: ~10 м²');
  console.log('---\n');
}

// Тест 2: Малая печь, плитка 10x10x1.5
console.log('Тест 2: Малая печь, плитка 10×10×1.5 см');
const smallKilnTest = calculateKilnLoading(KILNS.small, {
  length: 10,
  width: 10,
  thickness: 1.5,
});

if (smallKilnTest) {
  console.log('Метод:', smallKilnTest.optimalLoading.methodName);
  console.log('Количество:', smallKilnTest.optimalLoading.totalPieces, 'шт');
  console.log('Площадь:', smallKilnTest.optimalLoading.totalArea.toFixed(2), 'м²');
  console.log('Уровней:', smallKilnTest.optimalLoading.levels);
  console.log('ОЖИДАЕТСЯ: ~7 м²');
  console.log('---\n');
}

// Тест 3: Большая печь, большая плитка 30x40x2
console.log('Тест 3: Большая печь, плитка 30×40×2 см');
const bigTileTest = calculateKilnLoading(KILNS.big, {
  length: 30,
  width: 40,
  thickness: 2,
});

if (bigTileTest) {
  console.log('Метод:', bigTileTest.optimalLoading.methodName);
  console.log('Количество:', bigTileTest.optimalLoading.totalPieces, 'шт');
  console.log('Площадь:', bigTileTest.optimalLoading.totalArea.toFixed(2), 'м²');
  console.log('Уровней:', bigTileTest.optimalLoading.levels);
  if (bigTileTest.optimalLoading.edgePieces) {
    console.log('На ребре:', bigTileTest.optimalLoading.edgePieces, 'шт');
    console.log('Плашмя:', bigTileTest.optimalLoading.flatPieces, 'шт');
  }
  console.log('---\n');
}

console.log('=== Тестирование завершено ===');
