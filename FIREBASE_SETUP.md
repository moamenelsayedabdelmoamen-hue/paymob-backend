# Firebase Realtime Database setup

The backend uses the Firebase Admin SDK (server-side credentials) and Firebase Realtime Database. It stores payment state in `payments`, verified Paymob webhook receipts in `webhook_events`, and an audit entry for each payment state change in `operation_logs`.

## Firebase credentials

1. In Firebase Console, open the `el-batal-express-956ae` project and enable Realtime Database.
2. In Project settings → Service accounts, generate a private key JSON file. Keep this file private and never commit it.
3. Set `FIREBASE_DATABASE_URL` to `https://el-batal-express-956ae-default-rtdb.firebaseio.com`.
4. Set `FIREBASE_SERVICE_ACCOUNT_BASE64` to the Base64 encoding of the entire service-account JSON file. For example, on macOS/Linux:

   ```bash
   base64 < serviceAccountKey.json | tr -d '\n'
   ```

   On PowerShell:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes('serviceAccountKey.json'))
   ```

5. Put these values in local `.env` for development and in your hosting provider's secret/environment-variable settings for production. Do not send the private key in chat or commit it to GitHub.

## Paymob variables

Set `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET`, `CARD_INTEGRATION_ID`, `WALLET_INTEGRATION_ID`, and `CARD_IFRAME_ID` in the same secure environment settings. The webhook endpoint rejects callbacks when the HMAC secret is absent or the signature is invalid. Configure Paymob to call `https://YOUR_BACKEND_HOST/webhook` and provide its HMAC secret.

The old API key was embedded in `server.js`. If it was a real key, revoke/rotate it in Paymob before deploying; storing a replacement in environment variables does not remove it from Git history.

## Run

```bash
npm install
npm start
```

`GET /health` reports whether Firebase initialized. `POST /pay` is disabled with HTTP 503 until Firebase and Paymob environment variables are set. Payment records use Paymob's order ID as the key. Stored audit records intentionally exclude email, phone, card data, and payment tokens.
