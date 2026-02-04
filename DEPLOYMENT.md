# Инструкция по деплою Kiln Calculator

## Подготовка завершена ✅

- ✅ Production build создан (`npm run build`)
- ✅ Полный backup создан (`FULL_PROJECT_EXPORT.md`)
- ✅ Database функции отключены (только ручной ввод цены)
- ✅ Все изменения сохранены

## Вариант 1: Firebase Hosting (рекомендуется - Google сервис)

### Установка Firebase CLI

```bash
npm install -g firebase-tools
```

### Логин в Firebase

```bash
firebase login
```

### Инициализация проекта (если первый раз)

```bash
firebase init hosting
```

При настройке выбери:
- Public directory: `dist`
- Single-page app: `Yes`
- Автодеплой GitHub: `No` (или `Yes` если хочешь)

### Деплой

```bash
npm run deploy
```

Или напрямую:

```bash
npm run build
firebase deploy --only hosting
```

## Вариант 2: Vercel (быстрый деплой без CLI)

### Через веб-интерфейс:

1. Зайди на https://vercel.com
2. Зарегистрируйся/войди через GitHub
3. Нажми "Add New Project"
4. Импортируй репозиторий или загрузи папку
5. Vercel автоматически определит Vite проект
6. Нажми "Deploy"

### Через CLI (если установишь):

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Вариант 3: Netlify (тоже простой)

1. Зайди на https://netlify.com
2. Перетащи папку `dist` в веб-интерфейс
3. Готово!

Или через CLI:

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

## Вариант 4: GitHub Pages (бесплатно, но требует GitHub)

1. Создай GitHub репозиторий
2. Добавь в `package.json`:
   ```json
   "homepage": "https://твой-username.github.io/kiln-calculator",
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
3. Установи gh-pages: `npm install -D gh-pages`
4. Запусти: `npm run deploy`

## После деплоя

Приложение будет доступно по URL:
- Firebase: `https://твой-проект.web.app`
- Vercel: `https://kiln-calculator.vercel.app`
- Netlify: `https://твой-сайт.netlify.app`
- GitHub Pages: `https://твой-username.github.io/kiln-calculator`

## Настройка переменных окружения (.env)

Если используешь Telegram бот, добавь переменные в настройках хостинга:

```
VITE_TELEGRAM_BOT_TOKEN=твой_токен
VITE_TELEGRAM_CHAT_ID=твой_chat_id
```

Firebase: Firebase Console → Hosting → Environment Variables
Vercel: Project Settings → Environment Variables
Netlify: Site Settings → Environment Variables
