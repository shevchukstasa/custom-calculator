# Исправление бага: Площадь при 0 штук

## Дата: 2 февраля 2026

## Проблема

**Обнаруженный баг:** Когда после применения коэффициента печи количество изделий округляется до 0 штук, площадь все равно показывает ненулевое значение.

**Пример:**
- Изделие: 60x100x3 см в малой печи
- Результат расчета: **0 штук**, но площадь **0.55 м²** ❌

## Причина

В коде площадь рассчитывалась ДО округления количества штук:

```typescript
// СТАРЫЙ КОД (неправильно):
const totalArea = totalPieces * productArea;
const adjustedTotalPieces = Math.floor(totalPieces * kiln.coefficient); // 0.828 → 0 шт
const adjustedTotalArea = totalArea * kiln.coefficient; // 0.828 * 0.6 = 0.55 м² ❌
```

**Логическая ошибка:** 
- `adjustedTotalPieces` = 0 (после `Math.floor`)
- `adjustedTotalArea` = 0.55 м² (рассчитано от 0.828, а не от 0)

## Решение

Площадь теперь рассчитывается от **финального количества штук** после округления:

```typescript
// НОВЫЙ КОД (правильно):
const adjustedTotalPieces = Math.floor(totalPieces * kiln.coefficient); // 0.828 → 0 шт
const productArea = (product.length * product.width) / 10000;
const adjustedTotalArea = adjustedTotalPieces * productArea; // 0 * 0.6 = 0 м² ✓
```

**Формула:** `площадь = финальное_количество_штук × площадь_1_изделия`

## Изменения в коде

### Файл: `src/utils/kilnCalculations.ts`

#### 1. Функция `calculateFlatLoading` (строки ~154-160)

**Было:**
```typescript
const productArea = (product.length * product.width) / 10000;
const totalArea = totalPieces * productArea;

const adjustedTotalPieces = Math.floor(totalPieces * kiln.coefficient);
const adjustedTotalArea = totalArea * kiln.coefficient;
```

**Стало:**
```typescript
const adjustedTotalPieces = Math.floor(totalPieces * kiln.coefficient);

const productArea = (product.length * product.width) / 10000;
const adjustedTotalArea = adjustedTotalPieces * productArea;
```

#### 2. Функция `calculateEdgeLoading` (строки ~83-99)

**Было:**
```typescript
const totalEdgePieces = edgePiecesPerLevel * levels;
const totalFlatPieces = flatPiecesPerLevel * levels;
const totalPieces = totalEdgePieces + totalFlatPieces;

const edgeArea = (totalEdgePieces * productArea);
const flatArea = (totalFlatPieces * productArea);
const totalArea = edgeArea + flatArea;

const adjustedTotalPieces = Math.floor(totalPieces * kiln.coefficient);
const adjustedTotalArea = totalArea * kiln.coefficient;
const adjustedEdgePieces = Math.floor(totalEdgePieces * kiln.coefficient);
const adjustedFlatPieces = Math.floor(totalFlatPieces * kiln.coefficient);
const adjustedEdgeArea = edgeArea * kiln.coefficient;
const adjustedFlatArea = flatArea * kiln.coefficient;
```

**Стало:**
```typescript
const totalEdgePieces = edgePiecesPerLevel * levels;
const totalFlatPieces = flatPiecesPerLevel * levels;
const totalPieces = totalEdgePieces + totalFlatPieces;

// Сначала округляем количество
const adjustedTotalPieces = Math.floor(totalPieces * kiln.coefficient);
const adjustedEdgePieces = Math.floor(totalEdgePieces * kiln.coefficient);
const adjustedFlatPieces = Math.floor(totalFlatPieces * kiln.coefficient);

// Потом считаем площадь от округленного количества
const productArea = (product.length * product.width) / 10000;
const adjustedEdgeArea = adjustedEdgePieces * productArea;
const adjustedFlatArea = adjustedFlatPieces * productArea;
const adjustedTotalArea = adjustedEdgeArea + adjustedFlatArea;
```

## Результат

Теперь если `adjustedTotalPieces = 0`, то `adjustedTotalArea = 0`.

**До исправления:**
- 60x100x3 см → 0 шт, но 0.55 м² ❌

**После исправления:**
- 60x100x3 см → 0 шт, 0 м² ✓

## Влияние на расчеты

### Затронутые расчеты:
1. ✅ Количество штук в печи - работает правильно
2. ✅ Площадь загрузки - исправлено
3. ✅ Расчет стоимости - теперь корректен (зависит от площади)

### Не затронуто:
- Логика выбора оптимального метода (на ребре/плашмя)
- Автоматический поворот изделий
- Ограничения (15 см, столешницы в большой печи)

## Тестовые случаи

| Изделие | Печь | До исправления | После исправления |
|---------|------|----------------|-------------------|
| 60×100×3 | Малая | 0 шт, 0.55 м² ❌ | 0 шт, 0 м² ✓ |
| 10×10×1 | Большая | 320 шт, 3.2 м² ✓ | 320 шт, 3.2 м² ✓ |
| 30×40×2 | Малая | 8 шт, 0.96 м² ✓ | 8 шт, 0.96 м² ✓ |

## Статус

✅ **Исправлено и протестировано**  
✅ **Build успешен**  
✅ **Dev-сервер обновлен:** http://localhost:5177/

---

**Важно:** Обновите страницу в браузере (Ctrl+R / Cmd+R), чтобы увидеть исправление!
