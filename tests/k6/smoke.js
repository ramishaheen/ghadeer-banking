import http from "k6/http";
import { check, sleep } from "k6";

// Smoke test: 1 VU, 30s — sanity that all key endpoints work under no load.
export const options = {
  vus: 1,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const jar = http.cookieJar();

  const me = http.get(`${BASE}/api/me`, { tags: { name: "me" } });
  check(me, {
    "me 200": (r) => r.status === 200,
    "me has accounts": (r) => r.json("data.accounts.0.id") !== undefined,
  });

  const products = http.get(`${BASE}/api/gold/products`, { tags: { name: "gold-products" } });
  check(products, {
    "products 200": (r) => r.status === 200,
    "has 6 products": (r) => r.json("data.products").length === 6,
  });

  const price = http.get(`${BASE}/api/gold/price?history=1`, { tags: { name: "gold-price" } });
  check(price, { "price 200": (r) => r.status === 200 });

  const summary = http.get(`${BASE}/api/summary`, { tags: { name: "summary" } });
  check(summary, { "summary 200": (r) => r.status === 200 });

  const txns = http.get(`${BASE}/api/transactions?limit=10`, { tags: { name: "transactions" } });
  check(txns, { "transactions 200": (r) => r.status === 200 });

  const coaching = http.get(`${BASE}/api/rafiq/coaching`, { tags: { name: "coaching" } });
  check(coaching, { "coaching 200": (r) => r.status === 200 });

  const chat = http.post(
    `${BASE}/api/rafiq/chat`,
    JSON.stringify({ message: "Check balance" }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "chat" } }
  );
  check(chat, {
    "chat 200": (r) => r.status === 200,
    "chat replies": (r) => r.json("data.rafiqMessage.content") !== undefined,
  });

  const home = http.get(`${BASE}/`, { tags: { name: "home-page" } });
  check(home, { "home 200": (r) => r.status === 200 });

  sleep(1);
}
