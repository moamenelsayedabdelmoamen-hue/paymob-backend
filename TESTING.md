# API Testing Examples

## Test the server is running

```bash
curl -X GET http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## Create a Payment (Basic)

```bash
curl -X POST http://localhost:3000/api/payment/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "EGP",
    "customer_email": "customer@example.com",
    "customer_phone": "+201001234567",
    "customer_first_name": "John",
    "customer_last_name": "Doe"
  }'
```

---

## Create a Payment (With Items)

```bash
curl -X POST http://localhost:3000/api/payment/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25000,
    "currency": "EGP",
    "customer_email": "customer@example.com",
    "customer_phone": "+201001234567",
    "customer_first_name": "Ahmed",
    "customer_last_name": "Hassan",
    "items": [
      {
        "name": "Laptop",
        "amount": 15000,
        "description": "MacBook Pro 13 inch",
        "quantity": "1"
      },
      {
        "name": "Mouse",
        "amount": 10000,
        "description": "Wireless Mouse",
        "quantity": "1"
      }
    ]
  }'
```

---

## Using Python

```python
import requests
import json

url = "http://localhost:3000/api/payment/create-payment"

payload = {
    "amount": 10000,
    "currency": "EGP",
    "customer_email": "test@example.com",
    "customer_phone": "+201001234567",
    "customer_first_name": "Test",
    "customer_last_name": "User"
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
print(json.dumps(response.json(), indent=2))
```

---

## Using JavaScript (Fetch API)

```javascript
const createPayment = async () => {
  const payload = {
    amount: 10000,
    currency: "EGP",
    customer_email: "test@example.com",
    customer_phone: "+201001234567",
    customer_first_name: "Test",
    customer_last_name: "User"
  };

  try {
    const response = await fetch("http://localhost:3000/api/payment/create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(data);

    if (data.success) {
      // Load the payment iframe
      document.getElementById("paymentFrame").src = data.data.payment_url;
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

createPayment();
```

---

## Using JavaScript (Axios)

```javascript
const axios = require("axios");

const createPayment = async () => {
  try {
    const response = await axios.post(
      "http://localhost:3000/api/payment/create-payment",
      {
        amount: 10000,
        currency: "EGP",
        customer_email: "test@example.com",
        customer_phone: "+201001234567",
        customer_first_name: "Test",
        customer_last_name: "User"
      }
    );

    console.log(response.data);

    if (response.data.success) {
      const paymentUrl = response.data.data.payment_url;
      console.log("Payment URL:", paymentUrl);
    }
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
};

createPayment();
```

---

## Response Success Example

```json
{
  "success": true,
  "data": {
    "payment_url": "https://accept.paymobsolutions.com/api/acceptance/iframes/123456?payment_token=eJydUsFuwjAM_RXL57CmrdN2VRxgoF0mTdNhYBIJ7YJjJ5r+",
    "payment_key": "eJydUsFuwjAM_RXL57CmrdN2VRxgoF0mTdNhYBIJ7YJjJ5r+VzKhjoJhJ5r+",
    "order_id": 1234567890,
    "amount_cents": 10000,
    "currency": "EGP",
    "iframe_id": "123456",
    "merchant_order_id": "order_1234567890"
  },
  "message": "Payment URL generated successfully. Use the payment_url in an iframe."
}
```

---

## Response Error Example

```json
{
  "success": false,
  "error": "Missing required fields: amount, customer_email, customer_phone"
}
```

---

## Common Issues

### Issue: "Invalid auth token"
- **Solution**: Check that `PAYMOB_API_KEY` in `.env` is correct

### Issue: "Missing integration_id"
- **Solution**: Make sure `PAYMOB_IFRAME_ID` is set in `.env`

### Issue: "CORS Error"
- **Solution**: Add frontend URL to `FRONTEND_URL` in `.env`, or use the provided CORS configuration

### Issue: "Connection Refused"
- **Solution**: Make sure the server is running with `npm run dev` or `npm start`

---

## Next Steps

1. Set up your `.env` file with actual Paymob credentials
2. Run `npm install` to install dependencies
3. Start the server with `npm run dev`
4. Test endpoints using examples above
5. Integrate the payment URL in your frontend application
