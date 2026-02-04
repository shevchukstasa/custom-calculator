# План: Полноэкранный layout с горизонтальным распределением

## Цель
Использовать **ВСЮ** ширину экрана для обеих вкладок. Все элементы располагаются горизонтально в одну строку.

## Вкладка 1: Загрузка печи

### Текущая структура
```
[Узкая колонка 320px]  [Широкая колонка]
- Тип изделия          - Результаты
- Форма
- Глазурь
- Размеры
```

### Новая структура (на всю ширину)
```
[Тип | Форма | Глазурь | Размеры]  [Результаты расчета]
         ~50% ширины                    ~50% ширины
```

Или:
```
[Тип/Форма/Глазурь]  [Размеры]  [Результаты]
      ~30%              ~20%        ~50%
```

## Вкладка 2: Расчет стоимости

### Текущая структура
```
[Узкая колонка 350px]     [Широкая колонка]
- Режим                   - Результаты
- Выбор печи
- Цена камня
- Количество штук
- Параметры (hard mode)
```

### Новая структура (на всю ширину)
```
[Режим + Печь]  [Цена + Кол-во]  [Параметры]  [Результаты]
     ~20%            ~20%            ~20%          ~40%
```

## Изменения в CSS

### 1. Изменить grid layout на flex с равномерным распределением

**Файл:** `src/App.css`, строки 159-172

Было:
```css
.kiln-calculation-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1rem;
  height: 100%;
  overflow: hidden;
}
```

Станет:
```css
.kiln-calculation-layout {
  display: flex;
  gap: 1rem;
  height: 100%;
  overflow: hidden;
  flex-wrap: wrap;
}
```

### 2. Изменить input-section и results-section

**Файл:** `src/App.css`, строки 190-206

Было:
```css
.input-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding-right: 0.5rem;
}
```

Станет:
```css
.input-section {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  flex: 1;
  flex-wrap: wrap;
  align-items: flex-start;
}

.results-section {
  flex: 1;
  min-width: 45%;
  overflow-y: auto;
  padding-right: 0.5rem;
}
```

### 3. Карточки в input-section располагаются горизонтально

```css
.product-type-selector,
.glaze-placement-selector,
.product-input {
  flex: 1;
  min-width: 200px;
  max-width: 350px;
}
```

### 4. Аналогично для cost-calculation-layout

**Файл:** `src/App.css`, строки 175-188

```css
.cost-calculation-layout {
  display: flex;
  gap: 1rem;
  height: 100%;
  overflow: hidden;
  flex-wrap: wrap;
}

.cost-inputs {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  flex: 1;
  flex-wrap: wrap;
  align-items: flex-start;
}

.cost-results-section {
  flex: 1;
  min-width: 40%;
  overflow-y: auto;
  padding-right: 0.5rem;
}
```

### 5. Карточки cost секции горизонтально

```css
.cost-kiln-selector,
.stone-cost-input,
.order-quantity-input,
.mode-toggle {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.cost-parameters {
  flex: 1;
  min-width: 250px;
  max-width: 400px;
}
```

## Результат

- **100% ширины экрана используется**
- Все элементы расположены горизонтально
- Результаты занимают ~40-50% справа
- Инпуты распределены слева горизонтально
- Нет пустого пространства
- Минимальный или отсутствующий скроллинг
