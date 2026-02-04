// Простой тестовый скрипт на чистом JavaScript
const TILE_GAP = 1.5;
const AIR_GAP = 2;
const SHELF_THICKNESS = 3;
const FLAT_ON_EDGE_COEFFICIENT = 0.3;

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

function calculateEdgeLoading(kiln, product) {
  const { workingArea } = kiln;
  const pairWidth = product.thickness * 2;
  
  const pairsAcrossWidth = calculateTilesAlongDimension(workingArea.width, pairWidth);
  const rowsAcrossDepth = calculateTilesAlongDimension(workingArea.depth, product.length);
  const edgePiecesPerLevel = pairsAcrossWidth * 2 * rowsAcrossDepth;
  
  if (edgePiecesPerLevel === 0) return null;
  
  const shelfArea = (workingArea.width * workingArea.depth) / 10000;
  const flatAreaAvailable = shelfArea * FLAT_ON_EDGE_COEFFICIENT;
  const productArea = (product.length * product.width) / 10000;
  const flatPiecesPerLevel = Math.floor(flatAreaAvailable / productArea);
  
  const levelHeight = product.thickness + AIR_GAP + SHELF_THICKNESS + product.thickness;
  let levels = 1;
  if (kiln.multiLevel && workingArea.height) {
    levels = Math.floor(workingArea.height / levelHeight);
  }
  
  const totalEdgePieces = edgePiecesPerLevel * levels;
  const totalFlatPieces = flatPiecesPerLevel * levels;
  const totalPieces = totalEdgePieces + totalFlatPieces;
  
  const edgeArea = totalEdgePieces * productArea;
  const flatArea = totalFlatPieces * productArea;
  const totalArea = edgeArea + flatArea;
  
  return {
    method: 'combined',
    methodName: 'На ребре + плашмя',
    totalPieces: Math.floor(totalPieces * kiln.coefficient),
    totalArea: totalArea * kiln.coefficient,
    levels,
  };
}

function calculateFlatLoading(kiln, product) {
  const { workingArea } = kiln;
  
  const tilesAcrossWidth = calculateTilesAlongDimension(workingArea.width, product.width);
  const tilesAcrossDepth = calculateTilesAlongDimension(workingArea.depth, product.length);
  const piecesPerLevel = tilesAcrossWidth * tilesAcrossDepth;
  
  if (piecesPerLevel === 0) return null;
  
  const levelHeight = product.thickness + AIR_GAP + SHELF_THICKNESS;
  let levels = 1;
  if (kiln.multiLevel && workingArea.height) {
    levels = Math.floor(workingArea.height / levelHeight);
  }
  
  const totalPieces = piecesPerLevel * levels;
  const productArea = (product.length * product.width) / 10000;
  const totalArea = totalPieces * productArea;
  
  return {
    method: 'flat',
    methodName: 'Плашмя (лицом вверх)',
    totalPieces: Math.floor(totalPieces * kiln.coefficient),
    totalArea: totalArea * kiln.coefficient,
    levels,
  };
}

console.log('=== Тестирование калькулятора загрузки печей ===\n');

// Тест 1: Большая печь, плитка 10x10x1.5
console.log('Тест 1: Большая печь, плитка 10×10×1.5 см');
const product1 = { length: 10, width: 10, thickness: 1.5 };
const edge1 = calculateEdgeLoading(KILNS.big, product1);
const flat1 = calculateFlatLoading(KILNS.big, product1);
const optimal1 = edge1.totalArea >= flat1.totalArea ? edge1 : flat1;
console.log('Метод:', optimal1.methodName);
console.log('Количество:', optimal1.totalPieces, 'шт');
console.log('Площадь:', optimal1.totalArea.toFixed(2), 'м²');
console.log('Уровней:', optimal1.levels);
console.log('ОЖИДАЕТСЯ: ~10 м²');
console.log('---\n');

// Тест 2: Малая печь, плитка 10x10x1.5
console.log('Тест 2: Малая печь, плитка 10×10×1.5 см');
const product2 = { length: 10, width: 10, thickness: 1.5 };
const edge2 = calculateEdgeLoading(KILNS.small, product2);
const flat2 = calculateFlatLoading(KILNS.small, product2);
const optimal2 = edge2.totalArea >= flat2.totalArea ? edge2 : flat2;
console.log('Метод:', optimal2.methodName);
console.log('Количество:', optimal2.totalPieces, 'шт');
console.log('Площадь:', optimal2.totalArea.toFixed(2), 'м²');
console.log('Уровней:', optimal2.levels);
console.log('ОЖИДАЕТСЯ: ~7 м²');
console.log('---\n');

console.log('=== Тестирование завершено ===');
