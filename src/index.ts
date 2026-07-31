import express from "express";
import cors from "cors";
import productsRouter from "./routes/products";
import ordersRouter from "./routes/orders";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Simple shop backend is running"));

app.use("/products", productsRouter);
app.use("/orders", ordersRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
