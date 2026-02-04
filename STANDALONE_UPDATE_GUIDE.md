# Обновление standalone.html - Руководство

## Текущее состояние

Файл `standalone.html` содержит базовый калькулятор загрузки печей с исправленной формулой расчета высоты уровня.

## Что нужно добавить для полной функциональности

### 1. Функции базы данных камней (LocalStorage)

Добавить в `<script>` секцию:

```javascript
// Stone Database Functions
const STONE_DB_KEY = 'kiln_calculator_stone_database';

function getStoneDatabase() {
    const data = localStorage.getItem(STONE_DB_KEY);
    return data ? JSON.parse(data) : [];
}

function addStoneEntry(entry) {
    const db = getStoneDatabase();
    const newEntry = {
        ...entry,
        id: `stone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dateAdded: new Date().toISOString(),
    };
    db.push(newEntry);
    localStorage.setItem(STONE_DB_KEY, JSON.stringify(db));
    return newEntry;
}
```

### 2. Функции автоопределения параметров

```javascript
// Cost Logic Functions
function determinePackingCost(product) {
    const area = (product.length * product.width) / 10000;
    const basePackingCost = 0.10;
    
    if (area < 0.01) return basePackingCost * 0.5;
    if (area < 0.05) return basePackingCost;
    if (area < 0.1) return basePackingCost * 1.5;
    return basePackingCost * 2;
}

function determineStoneDefectPercent(productType, shape) {
    if (productType === 'tile') {
        return shape === 'square' ? 15.0 : 20.0;
    }
    return 20.0;
}

function determineAngobeCoefficient(product) {
    const volume = product.length * product.width * product.thickness;
    
    if (volume < 100) return 0.8;
    if (volume < 500) return 1.0;
    if (volume < 1000) return 1.2;
    if (volume < 2000) return 1.5;
    return 1.8;
}
```

### 3. Функции расчета стоимости

```javascript
// Constants
const CONSTANTS = {
    CAPEX: 405,
    OPEX: 235,
    ELECTRICITY_COST: 0.36,
    SALARY_TAXES: 0.93,
    FIRING_PER_MONTH: 22,
    VAT_RATE: 0.13,
    ANGOBE_GLAZES_STANDARD: 0.2,
    MARGIN_INDONESIA: 30.0,
    MARGIN_ABROAD: 50.0,
};

function calculateCost(kiln, product, kilnLoading, mode, stoneCost, customParams = {}) {
    // Implement full cost calculation logic from costCalculations.ts
    // ... (copy logic from TypeScript file)
}
```

### 4. HTML интерфейс

Добавить после существующей формы:

```html
<!-- Cost Calculator Section -->
<div class="card" id="costCalculator" style="display:none;">
    <h2>Расчет стоимости</h2>
    
    <!-- Mode Toggle -->
    <div class="mode-toggle">
        <label>
            <input type="radio" name="mode" value="simple" checked> Простой режим
        </label>
        <label>
            <input type="radio" name="mode" value="hard"> Расширенный
        </label>
    </div>
    
    <!-- Product Type -->
    <div class="product-type">
        <label>Тип изделия:</label>
        <select id="productType">
            <option value="tile">Плитка</option>
            <option value="plate">Тарелка</option>
            <option value="cup">Чашка</option>
            <option value="bowl">Миска</option>
        </select>
    </div>
    
    <!-- Stone Cost -->
    <div class="input-group">
        <label>Цена камня (mil Rp):</label>
        <input type="number" id="stoneCost" step="0.001" value="1.095">
    </div>
    
    <button onclick="calculateProductCost()">Рассчитать стоимость</button>
    
    <!-- Results -->
    <div id="costResults"></div>
</div>
```

### 5. CSS для новых элементов

Добавить стили для:
- Mode toggle
- Product type selector
- Cost results (Indonesia/Abroad)
- Stone database table
- Tabs/navigation

## Альтернативный подход

Поскольку React приложение уже полностью функционально:

1. **Рекомендуется**: Использовать собранную версию React приложения (`npm run build`)
2. Развернуть `dist/` папку на веб-сервере
3. Standalone.html оставить только для простых расчетов загрузки печи

## Текущий статус

- ✅ Исправлена формула расчета высоты уровня в standalone.html
- ✅ React приложение полностью функционально с расчетом стоимости
- ⏳ Дублирование всех функций в standalone.html требует значительного объема работы
- 💡 Рекомендуется использовать собранное React приложение для production

## Команды для деплоя

```bash
# Собрать production версию
npm run build

# Результат в папке dist/
# Загрузить содержимое dist/ на веб-сервер
```

## Примечание

Все новые функции уже реализованы в:
- `/src/utils/costCalculations.ts` - формулы расчета
- `/src/utils/costLogic.ts` - автоматические параметры
- `/src/utils/stoneDatabase.ts` - база данных камней
- `/src/components/*` - UI компоненты

Для standalone.html нужно только портировать эти функции в чистый JavaScript.
