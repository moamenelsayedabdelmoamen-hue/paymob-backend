# Cloud Firestore setup

The backend uses the Firebase Admin SDK to write payment records to **Cloud Firestore**. It stores the latest payment state in the `payments` collection, audit entries in `operation_logs`, and verified Paymob webhook receipts in `webhook_events`.

## Configure Firebase credentials

1. In Firebase Console, open project `el-batal-express-956ae` and create a Cloud Firestore database if one does not already exist.
2. In Project settings → Service accounts, generate a private key JSON file. Keep this file private; never commit it or share it in chat.
3. Ensure the service account has permission to access Cloud Firestore (for example, the Cloud Datastore User role, or an appropriately scoped custom role).
4. Set `FIREBASE_SERVICE_ACCOUNT_BASE64` to the Base64 encoding of the entire service-account JSON file. On macOS/Linux:

   ```bash
   base64 < serviceAccountKey.json | tr -d '\n'
   ```

   On PowerShell:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes('serviceAccountKey.json'))
   ```

5. Add the resulting value to your local `.env` or to Render's environment variables. The service-account JSON includes the project ID; no Firebase web-app configuration or Realtime Database URL is needed by this server.

## Render environment variables

Add these in the Render service's Environment settings:

- `FIREBASE_SERVICE_ACCOUNT_BASE64`
- `PAYMOB_API_KEY`
- `PAYMOB_HMAC_SECRET`
- `CARD_INTEGRATION_ID`
- `WALLET_INTEGRATION_ID`
- `CARD_IFRAME_ID`

Set `NODE_ENV` to `production` (the included `render.yaml` sets this). Do not use the Firebase web `apiKey` as a server credential. If an API key was exposed publicly, rotate it if it is being used as a secret; service-account private keys must always remain private.

## Run locally

```bash
npm install
npm start
```

`GET /health` reports whether Firestore credentials were initialized. `POST /pay` and `/webhook` require Firestore and their respective Paymob configuration. The first successful Firestore write may require the database to be created and the service account to have the correct IAM permissions.
