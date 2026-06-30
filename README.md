# Paymob Backend Integration

A Node.js Express backend for Paymob payment integration. This API handles the complete payment flow including authentication, order creation, payment key generation, and iframe URL generation.

## Features

✅ Paymob API Integration  
✅ OAuth Token Management  
✅ Order Creation  
✅ Payment Key Generation  
✅ iframe Payment URL Generation  
✅ Error Handling & Validation  
✅ CORS Support  
✅ Environment Configuration  

## Requirements

- Node.js (v14 or higher)
- npm or yarn
- Paymob Account with API credentials

## Installation

1. **Clone/Setup the repository**
   ```bash
   cd paymob-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```
   - Fill in your Paymob credentials:
     ```
     PAYMOB_API_KEY=your_api_key
     PAYMOB_MERCHANT_ID=your_merchant_id
     PAYMOB_IFRAME_ID=your_iframe_id
     PORT=3000
     NODE_ENV=development
     ```

## Running the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT)

## API Endpoints

### Health Check
- **Endpoint**: `GET /health`
- **Response**: Server health status

### Create Payment
- **Endpoint**: `POST /api/payment/create-payment`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "amount": 10000,
  "currency": "EGP",
  "customer_email": "customer@example.com",
  "customer_phone": "+201234567890",
  "customer_first_name": "John",
  "customer_last_name": "Doe",
  "items": [
    {
      "name": "Product Name",
      "amount": 10000,
      "description": "Product Description",
      "quantity": "1"
    }
  ]
}
```

**Note**: 
- `amount` is in **cents** (e.g., 10000 = 100.00 EGP)
- `customer_phone` must include country code (e.g., +20)
- `items` is optional; if not provided, a default item is created

#### Response (Success)
```json
{
  "success": true,
  "data": {
    "payment_url": "https://accept.paymobsolutions.com/api/acceptance/iframes/...?payment_token=...",
    "payment_key": "eJydUsFuwjAM/RXL57...",
    "order_id": 123456789,
    "amount_cents": 10000,
    "currency": "EGP",
    "iframe_id": "your_iframe_id",
    "merchant_order_id": "order_1625097600000"
  },
  "message": "Payment URL generated successfully. Use the payment_url in an iframe."
}
```

#### Response (Error)
```json
{
  "success": false,
  "error": "Missing required fields: amount, customer_email, customer_phone"
}
```

## Frontend Integration

Use the `payment_url` in an iframe on your frontend:

```html
<iframe
  id="paymentFrame"
  src="https://accept.paymobsolutions.com/api/acceptance/iframes/YOUR_IFRAME_ID?payment_token=PAYMENT_TOKEN"
  style="width: 100%; height: 600px; border: none;"
></iframe>
```

### Complete Frontend Example

```javascript
async function createPayment() {
  try {
    const response = await fetch('http://localhost:3000/api/payment/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 10000, // 100 EGP in cents
        currency: 'EGP',
        customer_email: 'customer@example.com',
        customer_phone: '+201001234567',
        customer_first_name: 'John',
        customer_last_name: 'Doe'
      })
    });

    const data = await response.json();

    if (data.success) {
      // Load payment iframe
      document.getElementById('paymentFrame').src = data.data.payment_url;
    } else {
      console.error('Payment creation failed:', data.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Project Structure

```
paymob-backend/
├── server.js                 # Main Express app
├── package.json              # Dependencies
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── routes/
│   └── payment.js            # Payment routes
├── controllers/
│   └── paymobController.js   # Payment logic controller
├── middleware/
│   └── errorHandler.js       # Error handling middleware
├── utils/
│   └── paymobService.js      # Paymob API service
└── README.md                 # Documentation
```

## Dependencies

- **express** - Web framework
- **axios** - HTTP client for API calls
- **dotenv** - Environment variable management
- **cors** - Cross-Origin Resource Sharing
- **body-parser** - Request body parser
- **nodemon** - Auto-restart during development

## Paymob API Integration Flow

```
1. GET AUTH TOKEN
   POST /auth/tokens → Paymob
   
2. CREATE ORDER
   POST /ecommerce/orders → Paymob
   
3. GENERATE PAYMENT KEY
   POST /acceptance/payment_keys → Paymob
   
4. RETURN PAYMENT URL
   https://accept.paymobsolutions.com/api/acceptance/iframes/{IFRAME_ID}?payment_token={TOKEN}
```

## Error Handling

All errors are caught and returned with appropriate HTTP status codes:

- `400` - Bad Request (missing/invalid fields)
- `401` - Unauthorized (invalid API key)
- `500` - Server Error (Paymob API issues)

## Security Considerations

⚠️ **Important**:
- Never commit `.env` file to version control
- Keep `PAYMOB_API_KEY` secure
- Use HTTPS in production
- Validate all inputs on the backend
- Implement proper authentication for your API
- Add rate limiting for production
- Implement request logging and monitoring

## Debugging

To enable debug logging:
```bash
NODE_ENV=development npm run dev
```

Check logs for:
- ✅ Success messages (auth token, order creation, payment key)
- ❌ Error details from Paymob API
- 📡 API call information

## Deployment

### Heroku
```bash
# Add environment variables
heroku config:set PAYMOB_API_KEY=your_key

# Deploy
git push heroku main
```

### Docker
Create a `Dockerfile`:
```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Support

For Paymob API documentation: https://paymob.com/developers

## License

ISC
