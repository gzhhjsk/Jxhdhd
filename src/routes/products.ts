import express from "express";
import { listProducts, getProduct, addProduct } from "../data/db";

const router = express.Router();

// GET /products
router.get("/", (req, res) => {
  res.json(listProducts());
});

// GET /products/:id
router.get("/:id", (req, res) => {
  const p = getProduct(req.params.id);
  if (!p) return res.status(404).json({ message: "Product not found" });
  res.json(p);
});

// POST /products  (simple: adds a product)
router.post("/", (req, res) => {
  const { title, description, price, inventory } = req.body;
  if (!title || typeof price !== "number") {
    return res.status(400).json({ message: "title and price are required" });
  }
  const newP = addProduct({ title, description, price, inventory: inventory || 0 });
  res.status(201).json(newP);
});

export default router;
