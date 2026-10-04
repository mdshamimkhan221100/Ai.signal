# AI Signal v1

Android Forex signal app starter.

## Features
- BUY / SELL / WAIT dashboard
- Currency pair selector
- Timeframe selector
- Entry / Stop Loss / Take Profit
- Confidence score
- Technical-analysis signal engine
- Optional backend API for live market data and AI analysis

## Important
Do not put a private market-data or AI API key inside the Android app.
Use the included backend and store secrets in environment variables.

## Run Android
Open this folder in Android Studio and let Gradle sync.
Run the `app` configuration on an Android device/emulator.

## Run backend
```bash
cd backend
npm install
cp .env.example .env
# add your API key(s)
npm start
```

The Android app currently uses a local demo signal engine so the UI can be tested immediately.
Connect the backend in `ApiConfig.kt` when you have a market-data provider/API.


## Live v2
1. Create a Twelve Data account and obtain an API key.
2. Put it in `backend/.env` as `TWELVE_DATA_API_KEY`.
3. Deploy the `backend` to an HTTPS server.
4. Set `ApiConfig.BASE_URL` in `LiveApi.kt` to that backend URL.
5. Build the Android app.

The app polls the backend every 10 seconds and shows the latest returned signal.
For true tick-level streaming, replace polling with a backend WebSocket pipeline.
