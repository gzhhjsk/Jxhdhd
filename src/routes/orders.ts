import express from "express";
import { createOrder, listOrders, getProduct } from "../data/db";

const router = express.Router();

// POST /orders
// body: { items: [{ productId, quantity }] }
router.post("/", (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "items array is required" });
  }

  // basic validation: ensure products exist
  for (const it of items) {
    const prod = getProduct(it.productId);
    if (!prod) return res.status(400).json({ message: `Product ${it.productId} not found` });
    if (it.quantity <= 0) return res.status(400).json({ message: "quantity must be > 0" });
  }

  const order = createOrder(items);
  res.status(201).json(order);
});

// GET /orders
router.get("/", (req, res) => {
  res.json(listOrders());
});

export default router;
