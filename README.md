# Simple Shop Backend (TypeScript + Express)

این یک نمونه بک‌اند ساده برای فروشگاه است که از دیتابیس در حافظه استفاده می‌کند.

نصب و اجرا:
1. npm install
2. npm run dev

نقطه‌های انتهایی (endpoints):
- GET /products            - لیست محصولات
- GET /products/:id        - مشاهده محصول
- POST /products           - افزودن محصول (body: { title, description?, price, inventory? })
- POST /orders             - ایجاد سفارش (body: { items: [{ productId, quantity }] })
- GET /orders              - لیست سفارش‌ها

مثال curl:
- دریافت محصولات:
  curl http://localhost:3000/products

- ایجاد سفارش:
  curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"items":[{"productId":"<id>","quantity":2}]}'
