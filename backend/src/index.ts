import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import babies from "./routes/babies";
import expenses from "./routes/expenses";
import records from "./routes/records";
import family from "./routes/family";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors({
  origin: ["https://baby.rocdo.app", "http://localhost:5173", "http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.route("/api/auth", auth);
app.route("/api/babies", babies);
app.route("/api/expenses", expenses);
app.route("/api/records", records);
app.route("/api/family", family);

app.get("/api/health", (c) => {
  return c.json({ success: true, data: { status: "ok", timestamp: Date.now() } });
});

app.notFound((c) => {
  return c.json({ success: false, data: null, message: "接口不存在" }, 404);
});

app.onError((err, c) => {
  return c.json({ success: false, data: null, message: err.message }, 500);
});

export default app;
