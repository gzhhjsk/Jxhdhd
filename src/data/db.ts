import { Product, Order } from "../models/product";
import { v4 as uuid } from "uuid";

const products: Product[] = [
  { id: uuid(), title: "T-shirt", description: "Cotton T-shirt", price: 1999, inventory: 10 },
  { id: uuid(), title: "Mug", description: "Ceramic mug", price: 999, inventory: 20 },
  { id: uuid(), title: "Sticker", description: "Laptop sticker", price: 199, inventory: 100 }
];

const orders: Order[] = [];

export function listProducts(): Product[] {
  return products;
}

export function getProduct(id: string): Product | undefined {
  return products.find(p => p.id === id);
}

export function addProduct(p: Omit<Product, "id">): Product {
  const prod = { ...p, id: uuid() };
  products.push(prod);
  return prod;
}

export function createOrder(items: { productId: string; quantity: number }[]): Order {
  let total = 0;
  const orderItems = items.map(i => {
    const prod = getProduct(i.productId);
    const unitPrice = prod ? prod.price : 0;
    total += unitPrice * i.quantity;
    // reduce inventory if available
    if (prod) {
      prod.inventory = Math.max(0, prod.inventory - i.quantity);
    }
    return { productId: i.productId, quantity: i.quantity, unitPrice };
  });

  const order: Order = {
    id: uuid(),
    items: orderItems,
    total,
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  return order;
}

export function listOrders(): Order[] {
  return orders;
}
