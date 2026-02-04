// Проверка загрузки на ребре
const TILE_GAP = 1.5;
const AIR_GAP = 2;
const SHELF_THICKNESS = 3;
const FLAT_ON_EDGE_COEFFICIENT = 0.3;

const BIG_KILN = {
  name: 'Большая печь',
  workingArea: { width: 54, depth: 84, height: 80 },
  coefficient: 0.8,
};

function calculateTilesAlongDimension(availableSpace, tileSize, gap = TILE_GAP) {
  return Math.floor((availableSpace + gap) / (tileSize + gap));
}

console.log('=== ЗАГРУЗКА НА РЕБРЕ ДЛЯ БОЛЬШОЙ ПЕЧИ ===\n');
console.log('Плитка: 10×10×1.5 см\n');

const product = { length: 10, width: 10, thickness: 1.5 };

// Загрузка на ребре
const pairWidth = product.thickness * 2; // 3 см
console.log(`Ширина пары (2 плитки спина к спине): ${pairWidth} см`);

const pairsAcrossWidth = calculateTilesAlongDimension(BIG_KILN.workingArea.width, pairWidth);
console.log(`Пар по ширине: ${pairsAcrossWidth}`);
console.log(`  Расчет: floor((54 + 1.5) / (3 + 1.5)) = floor(55.5 / 4.5) = ${pairsAcrossWidth}`);

const rowsAcrossDepth = calculateTilesAlongDimension(BIG_KILN.workingArea.depth, product.length);
console.log(`Рядов по глубине: ${rowsAcrossDepth}`);
console.log(`  Расчет: floor((84 + 1.5) / (10 + 1.5)) = floor(85.5 / 11.5) = ${rowsAcrossDepth}`);

const edgePiecesPerLevel = pairsAcrossWidth * 2 * rowsAcrossDepth;
console.log(`\nПлиток на ребре на 1 уровне: ${edgePiecesPerLevel} шт`);
console.log(`  Расчет: ${pairsAcrossWidth} пар × 2 × ${rowsAcrossDepth} рядов = ${edgePiecesPerLevel}`);

// Плитки плашмя поверх
const shelfArea = (BIG_KILN.workingArea.width * BIG_KILN.workingArea.depth) / 10000;
console.log(`\nПлощадь полки: ${shelfArea.toFixed(2)} м²`);

const flatAreaAvailable = shelfArea * FLAT_ON_EDGE_COEFFICIENT;
console.log(`Площадь для плиток плашмя (30%): ${flatAreaAvailable.toFixed(2)} м²`);

const productArea = (product.length * product.width) / 10000;
console.log(`Площадь 1 плитки: ${productArea} м²`);

const flatPiecesPerLevel = Math.floor(flatAreaAvailable / productArea);
console.log(`Плиток плашмя на 1 уровне: ${flatPiecesPerLevel} шт`);

// Высота уровня
const levelHeight = product.thickness + AIR_GAP + SHELF_THICKNESS + product.thickness;
console.log(`\nВысота 1 уровня: ${levelHeight} см`);
console.log(`  (толщина ${product.thickness} + зазор ${AIR_GAP} + полка ${SHELF_THICKNESS} + толщина ${product.thickness})`);

const levels = Math.floor(BIG_KILN.workingArea.height / levelHeight);
console.log(`Количество уровней: ${levels}`);
console.log(`  Расчет: floor(80 / ${levelHeight}) = ${levels}`);

// Итого
const totalEdge = edgePiecesPerLevel * levels;
const totalFlat = flatPiecesPerLevel * levels;
const totalPieces = totalEdge + totalFlat;

console.log(`\n=== ИТОГО (до коэффициента) ===`);
console.log(`Плиток на ребре: ${totalEdge} шт`);
console.log(`Плиток плашмя: ${totalFlat} шт`);
console.log(`Всего плиток: ${totalPieces} шт`);

const edgeArea = totalEdge * productArea;
const flatArea = totalFlat * productArea;
const totalArea = edgeArea + flatArea;

console.log(`\nПлощадь на ребре: ${edgeArea.toFixed(2)} м²`);
console.log(`Площадь плашмя: ${flatArea.toFixed(2)} м²`);
console.log(`Общая площадь: ${totalArea.toFixed(2)} м²`);

console.log(`\n=== ИТОГО (с коэффициентом ${BIG_KILN.coefficient}) ===`);
console.log(`Плиток: ${Math.floor(totalPieces * BIG_KILN.coefficient)} шт`);
console.log(`Площадь: ${(totalArea * BIG_KILN.coefficient).toFixed(2)} м²`);
console.log(`\nОЖИДАЕТСЯ: ~10 м²`);
