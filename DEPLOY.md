# Deploy Kiln Calculator to the Web (Firebase Hosting)

Firebase Hosting gives a free HTTPS URL so you can open the app from any device.

## 1. Prerequisites

- Node.js and npm installed (you already have this)
- A **Google account**

## 2. Create a Firebase project

1. Open **[Firebase Console](https://console.firebase.google.com/)**
2. Click **"Create a project"** (or choose an existing one)
3. Enter a name (e.g. `kiln-calculator`) and follow the steps (Analytics optional)
4. When the project is ready, note the **Project ID** (e.g. `kiln-calculator-xxxxx`)

## 3. Install Firebase CLI and log in

In a terminal:

```bash
npm install -g firebase-tools
firebase login
```

Log in in the browser when it opens.

## 4. Link this folder to your Firebase project

From the project root (`kiln-calculator`):

```bash
firebase use --add
```

- Select the project you created
- When asked for an alias, press Enter (default is fine)

Or, if you already know the project ID:

```bash
firebase use YOUR_PROJECT_ID
```

## 5. Build and deploy

```bash
npm run build
firebase deploy
```

When it finishes, you’ll see something like:

```
Hosting URL: https://YOUR_PROJECT_ID.web.app
```

Open that URL in a browser on any device to use the app.

## 6. Later: update the deployed app

After code changes:

```bash
npm run build
firebase deploy
```

## Notes

- **Data:** Stone database and calculation history are stored in the **browser’s localStorage** on each device. They are not synced between devices or backed up on the server.
- **Telegram:** To keep Telegram working in production, ensure `VITE_TELEGRAM_BOT_TOKEN` and `VITE_TELEGRAM_CHAT_ID` are set when you run `npm run build` (e.g. in `.env`). The built app will then contain those values (they are public in the front-end bundle).
- **Free tier:** Firebase Hosting free tier is usually enough for this app (e.g. 10 GB storage, 360 MB/day transfer).
