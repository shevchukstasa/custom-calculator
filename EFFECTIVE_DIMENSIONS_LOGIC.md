# Логика занимаемого места для разных форм изделий

## Дата: 2 февраля 2026

## Обзор

Реализована правильная логика расчета занимаемого места в печи для разных форм изделий:
- **Квадрат/Прямоугольник** — занимают свои размеры
- **Круг/Неправильная** — занимают место как квадрат
- **Треугольник** — размещаются парами с зазором 1.5 см

## Правила размещения

### 1. Квадрат и Прямоугольник (rectangle)

**Логика:**
- Занимают **ровно столько** площади, сколько есть
- Эффективные размеры = фактические размеры

**Формула:**
```
Занимаемая площадь в печи: length × width
```

**Пример:**
```
Плитка 30×40×2 см
→ Занимает: 30×40 = 1200 см²
```

---

### 2. Круг (round)

**Логика:**
- Круг занимает место как **квадрат** с размерами, равными диаметру
- Диаметр = максимальный из двух размеров (length, width)

**Формула:**
```
diameter = max(length, width)
Занимаемая площадь: diameter × diameter
```

**Пример:**
```
Круглая плитка ø30 см (введено как 30×30×2)
→ diameter = max(30, 30) = 30 см
→ Занимает: 30×30 = 900 см² (квадрат)

Овальная плитка 40×30 см (неправильная форма)
→ diameter = max(40, 30) = 40 см
→ Занимает: 40×40 = 1600 см² (квадрат)
```

**Почему так:**
- Круг нельзя плотно уложить
- Между кругами остаются промежутки
- Проще считать как квадрат с размером = диаметр

---

### 3. Треугольник (triangle)

**Логика:**
- **2 треугольника** образуют пару
- Один треугольник переворачивается, кладется рядом
- Между ними зазор **1.5 см**
- Из пары получается прямоугольник: `(length + 1.5) × (width + 1.5)`

**Формула:**
```
Эффективные размеры ПАРЫ:
- effectiveLength = length + 1.5 см
- effectiveWidth = width + 1.5 см

Количество ПАРЫ в печи:
- pairsAcrossWidth = floor((kilnWidth + 0.5) / (effectiveWidth + 0.5))
- pairsAcrossDepth = floor((kilnDepth + 0.5) / (effectiveLength + 0.5))

Общее количество ТРЕУГОЛЬНИКОВ:
- totalTriangles = pairsAcrossWidth × pairsAcrossDepth × 2
```

**Пример 1: Треугольник 30×30×2 см**
```
Эффективные размеры пары:
- effectiveLength = 30 + 1.5 = 31.5 см
- effectiveWidth = 30 + 1.5 = 31.5 см

Большая печь (62×42 см):
- Пар по ширине: floor((62 + 0.5) / (31.5 + 0.5)) = floor(62.5 / 32) = 1 пара
- Пар по глубине: floor((42 + 0.5) / (31.5 + 0.5)) = floor(42.5 / 32) = 1 пара
- Всего пар: 1 × 1 = 1 пара
- Всего треугольников: 1 × 2 = 2 шт

Малая печь (40×40 см):
- Пар по ширине: floor(40.5 / 32) = 1 пара
- Пар по глубине: floor(40.5 / 32) = 1 пара
- Всего пар: 1 × 1 = 1 пара
- Всего треугольников: 1 × 2 = 2 шт
```

**Пример 2: Треугольник 15×15×1 см**
```
Эффективные размеры пары:
- effectiveLength = 15 + 1.5 = 16.5 см
- effectiveWidth = 15 + 1.5 = 16.5 см

Большая печь (62×42 см):
- Пар по ширине: floor(62.5 / 17) = 3 пары
- Пар по глубине: floor(42.5 / 17) = 2 пары
- Всего пар: 3 × 2 = 6 пар
- Всего треугольников: 6 × 2 = 12 шт

Малая печь (40×40 см):
- Пар по ширине: floor(40.5 / 17) = 2 пары
- Пар по глубине: floor(40.5 / 17) = 2 пары
- Всего пар: 2 × 2 = 4 пары
- Всего треугольников: 4 × 2 = 8 шт
```

**Визуализация пары треугольников:**
```
┌─────────────────────────┐
│         ▲               │
│        ╱ ╲              │
│       ╱   ╲             │
│      ╱─────╲            │
│     length  |←1.5см→|   │
│              ╲─────╱    │
│               ╲   ╱     │
│                ╲ ╱      │
│                 ▼       │
└─────────────────────────┘
     width + 1.5 см
```

---

## Изменения в коде

### Файл: `src/utils/kilnCalculations.ts`

#### 1. Удалена неправильная константа (БЫЛО):
```typescript
// УДАЛЕНО:
const TRIANGLE_PACKING_EFFICIENCY = 0.85; // НЕПРАВИЛЬНО!
```

#### 2. Добавлена новая константа (строка 25):
```typescript
// Зазор между треугольниками при парной укладке
const TRIANGLE_PAIR_GAP = 1.5; // см
```

#### 3. Добавлена функция `getEffectiveDimensions` (строки 27-59):
```typescript
/**
 * Получить эффективные размеры изделия с учетом его формы
 * - Rectangle: length × width (как есть)
 * - Round: квадрат со стороной = диаметр (max размер)
 * - Triangle: пара треугольников (length+1.5) × (width+1.5)
 */
function getEffectiveDimensions(
  product: ProductDimensions,
  shape?: TileShape
): { effectiveLength: number; effectiveWidth: number; isTrianglePair: boolean } {
  let effectiveLength = product.length;
  let effectiveWidth = product.width;
  let isTrianglePair = false;
  
  if (shape === 'round') {
    // Круг занимает место как квадрат с размером = диаметр
    const diameter = Math.max(product.length, product.width);
    effectiveLength = diameter;
    effectiveWidth = diameter;
  } else if (shape === 'triangle') {
    // Треугольники кладутся парами с зазором 1.5 см
    effectiveLength = product.length + TRIANGLE_PAIR_GAP;
    effectiveWidth = product.width + TRIANGLE_PAIR_GAP;
    isTrianglePair = true;
  }
  
  return { effectiveLength, effectiveWidth, isTrianglePair };
}
```

#### 4. Обновлена функция `calculateFlatLoading` (строки 180-202):

**БЫЛО (неправильно):**
```typescript
// Треугольники при укладке лёжа занимают ~15% меньше места
const packingCoefficient = shape === 'triangle' ? TRIANGLE_PACKING_EFFICIENCY : 1.0;

const tilesAcrossWidth = calculateTilesAlongDimension(workingArea.width, product.width);
const tilesAcrossDepth = calculateTilesAlongDimension(workingArea.depth, product.length);

const basePiecesPerLevel = tilesAcrossWidth * tilesAcrossDepth;
const piecesPerLevel = shape === 'triangle' 
  ? Math.floor(basePiecesPerLevel / packingCoefficient)
  : basePiecesPerLevel;
```

**СТАЛО (правильно):**
```typescript
// Получаем эффективные размеры с учетом формы изделия
const productWithShape = product as ProductWithType;
const shape = productWithShape.shape;
const { effectiveLength, effectiveWidth, isTrianglePair } = getEffectiveDimensions(product, shape);

// Количество плиток по ширине (используем эффективные размеры)
const tilesAcrossWidth = calculateTilesAlongDimension(workingArea.width, effectiveWidth);

// Количество плиток по глубине (используем эффективные размеры)
const tilesAcrossDepth = calculateTilesAlongDimension(workingArea.depth, effectiveLength);

// Базовое количество (для треугольников это пары, поэтому умножаем на 2)
let piecesPerLevel = tilesAcrossWidth * tilesAcrossDepth;
if (isTrianglePair) {
  piecesPerLevel = piecesPerLevel * 2; // В каждой паре 2 треугольника
}
```

---

## Сравнение старой и новой логики

### Треугольник 30×30×2 см в большой печи (62×42×80)

**СТАРАЯ ЛОГИКА (неправильно):**
```
Без учета формы:
- Ширина: floor(62.5 / 30.5) = 2 шт
- Глубина: floor(42.5 / 30.5) = 1 шт
- На уровень: 2 × 1 = 2 шт
- С коэффициентом 0.85: floor(2 / 0.85) = 2 шт
→ 2 шт на уровень (НЕПРАВИЛЬНО!)
```

**НОВАЯ ЛОГИКА (правильно):**
```
Эффективные размеры пары: 31.5×31.5
- Пар по ширине: floor(62.5 / 32) = 1 пара
- Пар по глубине: floor(42.5 / 32) = 1 пара
- Пар на уровень: 1 × 1 = 1 пара
- Треугольников: 1 × 2 = 2 шт
→ 2 шт на уровень (ПРАВИЛЬНО!)
```

В данном случае результат совпал, но логика стала корректной!

### Круг ø40 см в большой печи (62×42)

**СТАРАЯ ЛОГИКА (неправильно):**
```
Используются размеры 40×40 как есть:
- Ширина: floor(62.5 / 40.5) = 1 шт
- Глубина: floor(42.5 / 40.5) = 1 шт
→ 1 шт (может быть неправильно, если введен не диаметр)
```

**НОВАЯ ЛОГИКА (правильно):**
```
Эффективный размер = max(40, 40) = 40 см (квадрат):
- Ширина: floor(62.5 / 40.5) = 1 шт
- Глубина: floor(42.5 / 40.5) = 1 шт
→ 1 шт (ВСЕГДА правильно!)
```

---

## Матрица форм (обновленная)

| Форма | Эффективные размеры | Расчет количества | Примечание |
|-------|---------------------|-------------------|------------|
| rectangle | length × width | Стандартный | Без изменений |
| round | diameter × diameter | Как квадрат | diameter = max(length, width) |
| triangle | (length+1.5) × (width+1.5) | Пары × 2 | 2 треугольника = 1 пара |

---

## Примеры расчетов

### Пример 1: Сравнение форм 30×30×2 в малой печи (40×40)

**Rectangle 30×30:**
```
Эффективные: 30×30
Количество: floor(40.5/30.5) × floor(40.5/30.5) = 1 × 1 = 1 шт
```

**Round ø30:**
```
Эффективные: 30×30 (diameter = max(30, 30))
Количество: floor(40.5/30.5) × floor(40.5/30.5) = 1 × 1 = 1 шт
```

**Triangle 30×30:**
```
Эффективные пары: 31.5×31.5
Пар: floor(40.5/32) × floor(40.5/32) = 1 × 1 = 1 пара
Треугольников: 1 × 2 = 2 шт (!)
```

**Вывод:** Треугольники эффективнее при небольших размерах!

---

### Пример 2: Малые изделия 10×10×1 в большой печи (62×42)

**Rectangle 10×10:**
```
Количество: floor(62.5/10.5) × floor(42.5/10.5) = 5 × 4 = 20 шт/уровень
```

**Round ø10:**
```
Эффективные: 10×10
Количество: floor(62.5/10.5) × floor(42.5/10.5) = 5 × 4 = 20 шт/уровень
```

**Triangle 10×10:**
```
Эффективные пары: 11.5×11.5
Пар: floor(62.5/12) × floor(42.5/12) = 5 × 3 = 15 пар
Треугольников: 15 × 2 = 30 шт/уровень (!)
```

**Вывод:** Треугольников помещается на 50% больше! (30 vs 20)

---

## Логика работы (блок-схема)

```
Входные данные: product (length, width, thickness), shape

↓

getEffectiveDimensions(product, shape)
  ├─ if shape === 'rectangle':
  │    → effectiveLength = length
  │    → effectiveWidth = width
  │
  ├─ if shape === 'round':
  │    → diameter = max(length, width)
  │    → effectiveLength = diameter
  │    → effectiveWidth = diameter
  │
  └─ if shape === 'triangle':
       → effectiveLength = length + 1.5
       → effectiveWidth = width + 1.5
       → isTrianglePair = true

↓

calculateTilesAlongDimension(kilnWidth, effectiveWidth)
calculateTilesAlongDimension(kilnDepth, effectiveLength)

↓

piecesPerLevel = tilesAcrossWidth × tilesAcrossDepth

↓

if isTrianglePair:
    piecesPerLevel = piecesPerLevel × 2  // В паре 2 треугольника

↓

Результат: количество штук
```

---

## Файлы изменены

1. **`src/utils/kilnCalculations.ts`**
   - Строка 1-7: Добавлен импорт `TileShape`
   - Строка 25: Добавлена константа `TRIANGLE_PAIR_GAP = 1.5`
   - Строки 27-59: Новая функция `getEffectiveDimensions`
   - Строки 180-202: Обновлена логика `calculateFlatLoading`

---

## Статус сборки

✅ **Сборка успешна**  
✅ **TypeScript**: Без ошибок  
✅ **Bundle**: 173.82 kB (53.86 kB gzipped)  
✅ **CSS**: 17.17 kB (3.51 kB gzipped)

---

## Тестирование

### Тест 1: Треугольник 30×30×2

**Ожидаемый результат:**
- Эффективные размеры пары: 31.5×31.5 см
- В малой печи: 2 шт (1 пара)
- В большой печи: 2 шт на уровень (1 пара)

### Тест 2: Круг ø30 (30×30×2)

**Ожидаемый результат:**
- Эффективные размеры: 30×30 см (как квадрат)
- Такое же количество, как прямоугольник 30×30

### Тест 3: Треугольник 10×10×1

**Ожидаемый результат:**
- Эффективные размеры пары: 11.5×11.5 см
- Больше штук, чем прямоугольник 10×10
- В большой печи: ~30 шт vs 20 шт прямоугольников (+50%!)

---

**Обновите страницу:** http://localhost:5178/

Проверьте треугольники — теперь они должны рассчитываться по новой логике с парами!
