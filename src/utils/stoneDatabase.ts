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
