// Детальная проверка расчетов
const TILE_GAP = 1.5;
const AIR_GAP = 2;
const SHELF_THICKNESS = 3;

const KILNS = {
  big: {
    name: 'Большая печь',
    workingArea: { width: 54, depth: 84, height: 80 },
    coefficient: 0.8,
    multiLevel: true,
  },
  small: {
    name: 'Малая печь',
    workingArea: { width: 95, depth: 150 },
    coefficient: 0.92,
    multiLevel: false,
  },
};

function calculateTilesAlongDimension(availableSpace, tileSize, gap = TILE_GAP) {
  return Math.floor((availableSpace + gap) / (tileSize + gap));
}

function calculateFlatLoadingDetailed(kiln, product) {
  const { workingArea } = kiln;
  
  console.log(`  Рабочая зона: ${workingArea.width} × ${workingArea.depth} см`);
  
  const tilesAcrossWidth = calculateTilesAlongDimension(workingArea.width, product.width);
  const tilesAcrossDepth = calculateTilesAlongDimension(workingArea.depth, product.length);
  
  console.log(`  Плиток по ширине: ${tilesAcrossWidth}`);
  console.log(`  Плиток по глубине: ${tilesAcrossDepth}`);
  
  const piecesPerLevel = tilesAcrossWidth * tilesAcrossDepth;
  console.log(`  Плиток на уровне: ${piecesPerLevel}`);
  
  const levelHeight = product.thickness + AIR_GAP + SHELF_THICKNESS;
  console.log(`  Высота уровня: ${levelHeight} см`);
  
  let levels = 1;
  if (kiln.multiLevel && workingArea.height) {
    levels = Math.floor(workingArea.height / levelHeight);
    console.log(`  Количество уровней: ${levels}`);
  }
  
  const totalPieces = piecesPerLevel * levels;
  const productArea = (product.length * product.width) / 10000;
  const totalArea = totalPieces * productArea;
  
  console.log(`  Всего плиток (до коэффициента): ${totalPieces}`);
  console.log(`  Площадь (до коэффициента): ${totalArea.toFixed(2)} м²`);
  console.log(`  Коэффициент: ${kiln.coefficient}`);
  
  const adjustedPieces = Math.floor(totalPieces * kiln.coefficient);
  const adjustedArea = totalArea * kiln.coefficient;
  
  console.log(`  Итого плиток: ${adjustedPieces}`);
  console.log(`  Итого площадь: ${adjustedArea.toFixed(2)} м²`);
  
  return {
    totalPieces: adjustedPieces,
    totalArea: adjustedArea,
    levels,
  };
}

console.log('=== ДЕТАЛЬНЫЙ ТЕСТ: Только плашмя ===\n');

console.log('Тест 1: Большая печь, плитка 10×10×1.5 см (ПЛАШМЯ)');
const product1 = { length: 10, width: 10, thickness: 1.5 };
const result1 = calculateFlatLoadingDetailed(KILNS.big, product1);
console.log('ОЖИДАЕТСЯ: ~10 м²\n');
console.log('---\n');

console.log('Тест 2: Малая печь, плитка 10×10×1.5 см (ПЛАШМЯ)');
const product2 = { length: 10, width: 10, thickness: 1.5 };
const result2 = calculateFlatLoadingDetailed(KILNS.small, product2);
console.log('ОЖИДАЕТСЯ: ~7 м²\n');
