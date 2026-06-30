/**
 * Example Request Handler
 * Shows how to integrate with the Paymob backend
 * Can be used in your frontend or backend
 */

// Example 1: Simple Payment Creation
const createSimplePayment = async (email, phone, amount) => {
  try {
    const response = await fetch('http://localhost:3000/api/payment/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to cents
        currency: 'EGP',
        customer_email: email,
        customer_phone: phone,
        customer_first_name: 'Customer',
        customer_last_name: 'Name',
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
};

// Example 2: Complete Payment Flow with Error Handling
const createPaymentWithErrorHandling = async (paymentDetails) => {
  const {
    amount,
    email,
    phone,
    firstName,
    lastName,
    items = []
  } = paymentDetails;

  // Validation
  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }
  if (!email || !phone) {
    throw new Error('Email and phone are required');
  }

  try {
    const response = await fetch('http://localhost:3000/api/payment/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'EGP',
        customer_email: email,
        customer_phone: phone,
        customer_first_name: firstName || 'Customer',
        customer_last_name: lastName || 'User',
        items: items.map(item => ({
          name: item.name,
          amount: Math.round(item.amount * 100),
          description: item.description || '',
          quantity: item.quantity || '1'
        }))
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Payment creation failed');
    }

    return data.data;
  } catch (error) {
    console.error('Payment error:', error.message);
    throw error;
  }
};

// Example 3: Integration with HTML Form
const handlePaymentForm = async (formData) => {
  try {
    // Show loading state
    const submitButton = document.getElementById('payButton');
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

    // Get form values
    const paymentData = {
      amount: parseFloat(document.getElementById('amount').value),
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      items: [
        {
          name: document.getElementById('productName').value,
          amount: parseFloat(document.getElementById('amount').value),
          description: document.getElementById('productDescription').value
        }
      ]
    };

    // Create payment
    const paymentInfo = await createPaymentWithErrorHandling(paymentData);

    // Load iframe
    const iframe = document.getElementById('paymentFrame');
    iframe.src = paymentInfo.payment_url;
    iframe.style.display = 'block';

    // Hide form
    document.getElementById('paymentForm').style.display = 'none';

    // Reset button
    submitButton.disabled = false;
    submitButton.textContent = 'Pay Now';

  } catch (error) {
    alert('Payment creation failed: ' + error.message);
    submitButton.disabled = false;
    submitButton.textContent = 'Pay Now';
  }
};

// Example 4: Using Axios (if available)
const createPaymentWithAxios = async (paymentDetails) => {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/payment/create-payment',
      {
        amount: paymentDetails.amount * 100,
        currency: 'EGP',
        customer_email: paymentDetails.email,
        customer_phone: paymentDetails.phone,
        customer_first_name: paymentDetails.firstName || 'Customer',
        customer_last_name: paymentDetails.lastName || 'User',
        items: paymentDetails.items || []
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error);
    }
  } catch (error) {
    throw new Error(`Payment Error: ${error.message}`);
  }
};

// Example 5: Payment with Retry Logic
const createPaymentWithRetry = async (paymentDetails, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);
      return await createPaymentWithErrorHandling(paymentDetails);
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
};

// Example 6: React Hook for Payment
const usePayment = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [paymentUrl, setPaymentUrl] = React.useState(null);

  const createPayment = async (paymentDetails) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createPaymentWithErrorHandling(paymentDetails);
      setPaymentUrl(result.payment_url);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createPayment, loading, error, paymentUrl };
};

// Example 7: Vue 3 Composable for Payment
const usePaymentComposable = () => {
  const loading = Vue.ref(false);
  const error = Vue.ref(null);
  const paymentUrl = Vue.ref(null);

  const createPayment = async (paymentDetails) => {
    loading.value = true;
    error.value = null;
    try {
      const result = await createPaymentWithErrorHandling(paymentDetails);
      paymentUrl.value = result.payment_url;
      return result;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { createPayment, loading, error, paymentUrl };
};

// Example Usage in HTML
/*
<!DOCTYPE html>
<html>
<head>
    <title>Payment Form</title>
    <style>
        .payment-form {
            max-width: 500px;
            margin: 50px auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 12px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
        }
        button:hover {
            background-color: #0056b3;
        }
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        #paymentFrame {
            width: 100%;
            height: 600px;
            margin-top: 20px;
            border: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="payment-form">
        <h2>Payment Form</h2>
        <form id="paymentForm" onsubmit="handlePaymentForm(event)">
            <div class="form-group">
                <label for="amount">Amount (EGP):</label>
                <input type="number" id="amount" required min="1" step="0.01">
            </div>
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" required>
            </div>
            <div class="form-group">
                <label for="phone">Phone:</label>
                <input type="tel" id="phone" required>
            </div>
            <div class="form-group">
                <label for="firstName">First Name:</label>
                <input type="text" id="firstName" required>
            </div>
            <div class="form-group">
                <label for="lastName">Last Name:</label>
                <input type="text" id="lastName" required>
            </div>
            <button type="submit" id="payButton">Pay Now</button>
        </form>
    </div>

    <iframe id="paymentFrame" style="display: none;"></iframe>

    <script src="path/to/examples.js"></script>
</body>
</html>
*/

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSimplePayment,
    createPaymentWithErrorHandling,
    createPaymentWithAxios,
    createPaymentWithRetry,
    handlePaymentForm,
    usePayment,
    usePaymentComposable
  };
}
