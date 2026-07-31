export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number; // cents or units — choose one convention
  inventory: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
}
