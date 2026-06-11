import http from "k6/http";
import { check, sleep, group } from "k6";

// Load test: ramp to expected production load (20 VUs), hold 5m.
// Read-heavy mix (realistic banking traffic) + chat interactions.
export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 20 },
    { duration: "5m", target: 20 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
    "http_req_duration{name:chat}": ["p(95)<800"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  group("dashboard", () => {
    const me = http.get(`${BASE}/api/me`, { tags: { name: "me" } });
    check(me, { "me 200": (r) => r.status === 200 });
    http.get(`${BASE}/api/summary`, { tags: { name: "summary" } });
    http.get(`${BASE}/api/transactions?limit=4`, { tags: { name: "transactions" } });
  });
  sleep(Math.random() * 2 + 0.5);

  group("gold", () => {
    const products = http.get(`${BASE}/api/gold/products`, { tags: { name: "gold-products" } });
    check(products, { "products 200": (r) => r.status === 200 });
    http.get(`${BASE}/api/gold/products/PAMP-5G`, { tags: { name: "gold-detail" } });
    http.get(`${BASE}/api/gold/orders`, { tags: { name: "gold-orders" } });
  });
  sleep(Math.random() * 2 + 0.5);

  group("rafiq", () => {
    http.get(`${BASE}/api/rafiq/insights`, { tags: { name: "insights" } });
    http.get(`${BASE}/api/rafiq/coaching`, { tags: { name: "coaching" } });
    // ~30% of users chat each cycle
    if (Math.random() < 0.3) {
      const chat = http.post(
        `${BASE}/api/rafiq/chat`,
        JSON.stringify({ message: "Check balance" }),
        { headers: { "Content-Type": "application/json" }, tags: { name: "chat" } }
      );
      check(chat, { "chat 200": (r) => r.status === 200 });
    }
  });
  sleep(Math.random() * 3 + 1);
}
