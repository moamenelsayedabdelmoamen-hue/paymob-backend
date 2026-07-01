const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// تفعيل الـ CORS لتفادي مشاكل حظر المتصفح أثناء المعاينة
app.use(cors());
app.use(express.json());

// ==========================================
// ⚙️ إعدادات وبيانات حساب PAYMOB الخاصة بك
// ==========================================
const PAYMOB_API_KEY = "ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TWpBM056a3hMQ0p1WVcxbElqb2lhVzVwZEdsaGJDSjkuay1jOWpMUlJKMDBmWHNMZkVUdXFXdnltcllOejdhWFRyeTg4ZlJXcHE4VVg2MkFINE1aN3FuSkRFVXBPWFJYOVhEMVpDaENZS3FzZFVxN2w4WmVFWHc=";

// معرفات التكامل (Integration IDs) الخاصة بحسابك
const CARD_INTEGRATION_ID = "313047";   // معرف تكامل الفيزا أونلاين
const WALLET_INTEGRATION_ID = "313046"; // معرف تكامل المحفظة الإلكترونية

// معرف الإطار (Iframe ID) الخاص بالفيزا
const CARD_IFRAME_ID = "706974";       // معرف الـ Iframe الخاص بالـ Card


// ==========================================
// 💳 1. مسار إنشاء طلب الدفع (POST /pay)
// ==========================================
app.post('/pay', async (req, res) => {
  try {
    const { amount, email, first_name, last_name, payment_method, phone_number } = req.body;

    // التحقق من وجود البيانات الأساسية المطلوبة للطلب
    if (!amount || !email || !first_name || !last_name || !payment_method) {
      return res.status(400).json({ error: "Missing required data" });
    }

    // إذا كان الاختيار محفظة ولم يتم إرسال رقم الهاتف
    if (payment_method === 'wallet' && !phone_number) {
      return res.status(400).json({ error: "Phone number is required for wallet payments" });
    }

    console.log(`🔄 بدء معالجة طلب دفع بمبلغ ${amount} جنيه عبر (${payment_method})...`);

    // --- الخطوة الأولى: الحصول على Auth Token من Paymob ---
    const authResponse = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: PAYMOB_API_KEY
    });
    const authToken = authResponse.data.token;

    // --- الخطوة الثانية: تسجيل الطلب (Order Registration) ---
    const amountInCents = amount * 100; // بايموب يتعامل بالقروش (الجنيه = 100 قرش)
    const orderResponse = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: authToken,
      delivery_needed: "false",
      amount_cents: amountInCents.toString(),
      currency: "EGP",
      items: []
    });
    const orderId = orderResponse.data.id;

    // تحديد الـ Integration ID بناءً على طريقة الدفع المختارة
    const integrationId = (payment_method === 'wallet') ? WALLET_INTEGRATION_ID : CARD_INTEGRATION_ID;

    // --- الخطوة الثالثة: إصدار مفتاح الدفع (Payment Key Generation) ---
    const paymentKeyResponse = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: authToken,
      amount_cents: amountInCents.toString(),
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        apartment: "NA",
        email: email,
        floor: "NA",
        first_name: first_name,
        street: "NA",
        building: "NA",
        phone_number: phone_number || "01000000000", // قيمة افتراضية للفيزا إذا لم تتوفر
        shipping_method: "NA",
        postal_code: "NA",
        city: "Sadat City",
        country: "EG",
        last_name: last_name,
        state: "NA"
      },
      currency: "EGP",
      integration_id: integrationId,
      lock_order_when_paid: "true"
    });
    const paymentToken = paymentKeyResponse.data.token;

    // --- الخطوة الرابعة: إنشاء الرابط النهائي بناءً على طريقة الدفع ---
    if (payment_method === 'wallet') {
      // طلب رابط الدفع الخاص بالمحافظ الإلكترونية
      const walletPayResponse = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
        source: {
          identifier: phone_number,
          subtype: "WALLET"
        },
        payment_token: paymentToken
      });

      // الرابط الذي سيتوجه إليه العميل لوضع الـ OTP الخاص بالمحفظة
      const redirectUrl = walletPayResponse.data.iframe_redirection_url;
      return res.status(200).json({ url: redirectUrl, type: "wallet" });

    } else {
      // للدفع بالبطاقات (الفيزا/الماستر كارد): ندمج الـ Token داخل رابط الـ Iframe مباشرة
      const cardIframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${CARD_IFRAME_ID}?payment_token=${paymentToken}`;
      return res.status(200).json({ url: cardIframeUrl, type: "card" });
    }

  } catch (error) {
    console.error("❌ حدث خطأ أثناء معالجة عملية الدفع:", error.response ? error.response.data : error.message);
    return res.status(500).json({
      error: "Payment failed",
      details: error.response ? error.response.data : error.message
    });
  }
});


// ==========================================
// 🌐 2. مسار استقبال الويب هوك (POST /webhook)
// ==========================================
app.post('/webhook', (req, res) => {
  const data = req.body;
  
  console.log("\n=========================================");
  console.log("📥 الإشعار (WEBHOOK) تم استقباله من PAYMOB");
  console.log("=========================================");
  
  // استخراج تفاصيل المعاملة المالية
  const isSuccess = data.obj?.success;
  const orderId = data.obj?.order?.id;
  const amount = data.obj?.amount_cents / 100;
  const userEmail = data.obj?.billing_data?.email;
  const transactionId = data.obj?.id;

  if (isSuccess === true) {
    console.log(`✅ [عملية ناجحة]`);
    console.log(`👤 العميل: ${userEmail}`);
    console.log(`💰 المبلغ: ${amount} جنيه مصري`);
    console.log(`📦 رقم الطلب (Order ID): ${orderId}`);
    console.log(`🎫 رقم الإيصال (Transaction ID): ${transactionId}`);
    
    // 💡 (هنا مستقبلاً تضع كود تحديث الـ Database الخاص بتطبيقك لتفعيل اشتراك العميل تلقائياً)

  } else {
    console.log(`❌ [عملية فاشلة / مرفوضة]`);
    console.log(`📦 رقم الطلب (Order ID): ${orderId}`);
    console.log(`💬 سبب الرفض: ${data.obj?.data?.message || "غير محدد"}`);
  }

  // 🚨 هام جداً: الرد بـ 200 لتأكيد استلام الإشعار لـ Paymob
  res.status(200).send('OK');
});


// ==========================================
// 🏠 3. مسار إعادة توجيه العميل (GET /callback)
// ==========================================
app.get('/callback', (req, res) => {
  res.send(`
    <div style="text-align:center; margin-top:100px; font-family:sans-serif;">
      <h1 style="color:#2ecc71; font-size: 32px; margin-bottom: 10px;">🎉 تم اكتمال العملية بنجاح!</h1>
      <p style="color:#34495e; font-size: 18px;">شكراً لك، يمكنك العودة إلى التطبيق الآن ومتابعة استخدام حسابك.</p>
    </div>
  `);
});


// ==========================================
// 🚀 تشغيل السيرفر على المنفذ المحدد
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل بنجاح على بورت: ${PORT}`);
});