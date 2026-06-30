# Quick Start Guide for Paymob Backend

## Prerequisites
- Node.js v14 or higher
- npm or yarn
- Paymob account with API credentials

## Step-by-Step Setup

### 1. Clone and Navigate
```bash
cd paymob-backend
```

### 2. Install Dependencies
```bash
npm install
```

Expected output:
```
added XX packages, and audited XX packages
```

### 3. Get Paymob Credentials

Visit [Paymob Developer Dashboard](https://merchant.paymobsolutions.com) and get:
- **API Key**: Found in Account Settings > API Keys
- **Merchant ID**: Found in Account Settings > Profile
- **iframe ID**: Found in Integration > iframe Setup

### 4. Create .env File
```bash
cp .env.example .env
```

### 5. Edit .env File
```bash
# Edit .env with your credentials
nano .env
# or use your preferred editor
```

Add your credentials:
```
PAYMOB_API_KEY=sk_live_xxxxxxxxxxxxx
PAYMOB_MERCHANT_ID=your_merchant_id
PAYMOB_IFRAME_ID=123456
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 6. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

Expected output:
```
🚀 Paymob Backend Server running on port 3000
Environment: development
✅ Configuration validated successfully
```

### 7. Test the API

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Create Payment:**
```bash
curl -X POST http://localhost:3000/api/payment/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "EGP",
    "customer_email": "test@example.com",
    "customer_phone": "+201001234567",
    "customer_first_name": "Test",
    "customer_last_name": "User"
  }'
```

### 8. Use in Frontend

```html
<!DOCTYPE html>
<html>
<head>
    <title>Payment Integration</title>
</head>
<body>
    <button onclick="createPayment()">Pay Now</button>
    <iframe id="paymentFrame" style="width: 100%; height: 600px; display: none;"></iframe>

    <script>
        async function createPayment() {
            const response = await fetch('http://localhost:3000/api/payment/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: 10000,
                    currency: 'EGP',
                    customer_email: 'customer@example.com',
                    customer_phone: '+201001234567',
                    customer_first_name: 'John',
                    customer_last_name: 'Doe'
                })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('paymentFrame').src = data.data.payment_url;
                document.getElementById('paymentFrame').style.display = 'block';
            }
        }
    </script>
</body>
</html>
```

## Troubleshooting

### Port Already in Use
```bash
# Use a different port
PORT=3001 npm run dev

# Or kill the process using the port
lsof -i :3000
kill -9 <PID>
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Authentication Failed
- Verify `PAYMOB_API_KEY` is correct
- Check that the API key hasn't expired
- Ensure the API key is for the correct environment (test/production)

### CORS Errors
- Add your frontend URL to `FRONTEND_URL` in `.env`
- Or use `FRONTEND_URL=*` to allow all origins (development only)

### No Response from Paymob
- Check internet connection
- Verify Paymob is not under maintenance
- Check that `PAYMOB_API_URL` is correct

## Project Structure

```
├── server.js                 # Express app entry point
├── config.js                 # Configuration module
├── package.json              # Dependencies
├── .env.example              # Environment template
│
├── routes/
│   └── payment.js            # Payment endpoints
│
├── controllers/
│   └── paymobController.js   # Payment logic
│
├── middleware/
│   └── errorHandler.js       # Error handling
│
├── utils/
│   └── paymobService.js      # Paymob API service
│
└── docs/
    ├── README.md             # Full documentation
    ├── TESTING.md            # Testing examples
    └── QUICKSTART.md         # This file
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure environment variables
3. ✅ Test health endpoint
4. ✅ Create a test payment
5. ⬜ Integrate with your frontend
6. ⬜ Set up database to store orders (optional)
7. ⬜ Add webhook handler for payment notifications (optional)
8. ⬜ Deploy to production

## Additional Resources

- [Paymob Documentation](https://paymob.com/developers)
- [Express.js Guide](https://expressjs.com/)
- [Axios Documentation](https://axios-http.com/)

## Need Help?

- Check [TESTING.md](TESTING.md) for API examples
- Review server logs for error details
- Check Paymob developer dashboard for API status

Happy coding! 🚀
