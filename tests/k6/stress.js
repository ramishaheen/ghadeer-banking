import http from "k6/http";
import { check, sleep } from "k6";

// Stress test: push beyond expected load to find the breaking point.
export const options = {
  stages: [
    { duration: "30s", target: 25 },
    { duration: "1m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const r1 = http.get(`${BASE}/api/me`, { tags: { name: "me" } });
  check(r1, { "me ok": (r) => r.status === 200 });
  http.get(`${BASE}/api/gold/products`, { tags: { name: "gold-products" } });
  http.get(`${BASE}/api/summary`, { tags: { name: "summary" } });
  sleep(0.3);
}
