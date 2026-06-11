#!/usr/bin/env bash
# Backend smoke test: exercises every API endpoint with a session cookie jar.
set -u
BASE="http://localhost:3000"
JAR="/tmp/kf-cookies.txt"
rm -f "$JAR"
pass=0; fail=0

check() {
  local name="$1"; local expected="$2"; shift 2
  local code
  code=$(curl -s -o /tmp/kf-last.json -w "%{http_code}" -b "$JAR" -c "$JAR" "$@")
  if [ "$code" = "$expected" ]; then
    echo "PASS $name ($code)"; pass=$((pass+1))
  else
    echo "FAIL $name (got $code, want $expected)"; head -c 300 /tmp/kf-last.json; echo; fail=$((fail+1))
  fi
}

check "GET /api/me"                 200 "$BASE/api/me"
check "GET /api/accounts"           200 "$BASE/api/accounts"
check "GET /api/transactions"       200 "$BASE/api/transactions?limit=5"
check "GET /api/summary"            200 "$BASE/api/summary"
check "GET /api/gold/price"         200 "$BASE/api/gold/price?history=1"
check "GET /api/gold/products"      200 "$BASE/api/gold/products"
check "GET /api/gold/products/5g"   200 "$BASE/api/gold/products/PAMP-5G"
check "GET /api/gold/products/404"  404 "$BASE/api/gold/products/NOPE"
check "GET /api/gold/orders"        200 "$BASE/api/gold/orders"
check "GET /api/rafiq/chat"         200 "$BASE/api/rafiq/chat"
check "POST /api/rafiq/chat"        200 -X POST -H "content-type: application/json" -d '{"message":"Why was I charged 10.99 yesterday?"}' "$BASE/api/rafiq/chat"
check "POST chat balance"           200 -X POST -H "content-type: application/json" -d '{"message":"Check balance"}' "$BASE/api/rafiq/chat"
check "POST chat invalid"           400 -X POST -H "content-type: application/json" -d '{"message":""}' "$BASE/api/rafiq/chat"
check "GET /api/rafiq/insights"     200 "$BASE/api/rafiq/insights"
check "GET /api/rafiq/coaching"     200 "$BASE/api/rafiq/coaching"
check "POST /api/rafiq/command"     200 -X POST -H "content-type: application/json" -d '{"transcript":"Transfer 500 JOD to my savings account"}' "$BASE/api/rafiq/command"
check "GET /api/goals"              200 "$BASE/api/goals"
check "GET /api/kyc"                200 "$BASE/api/kyc"
check "POST /api/kyc step3"         200 -X POST -H "content-type: application/json" -d '{"step":3,"personal":{"maritalStatus":"Married","spouseName":"Layla","nationality":"Jordanian","dependents":2}}' "$BASE/api/kyc"
check "POST /api/kyc married no-spouse" 400 -X POST -H "content-type: application/json" -d '{"step":3,"personal":{"maritalStatus":"Married","spouseName":"","nationality":"Jordanian"}}' "$BASE/api/kyc"
check "GET /api/tutorials"          200 "$BASE/api/tutorials"
check "POST /api/tutorials"         200 -X POST -H "content-type: application/json" -d '{"key":"GOLD_BUY","step":2}' "$BASE/api/tutorials"
check "GET /api/alerts"             200 "$BASE/api/alerts"
check "POST /api/alerts"            201 -X POST -H "content-type: application/json" -d '{"thresholdMils":106000,"direction":"BELOW"}' "$BASE/api/alerts"

# Transfer flow: fetch account ids, transfer 100 JOD, verify balances changed.
FROM=$(curl -s -b "$JAR" "$BASE/api/accounts" | python3 -c "import sys,json; a=json.load(sys.stdin)['data']['accounts']; print([x['id'] for x in a if x['type']=='CHECKING'][0])")
TO=$(curl -s -b "$JAR" "$BASE/api/accounts" | python3 -c "import sys,json; a=json.load(sys.stdin)['data']['accounts']; print([x['id'] for x in a if x['type']=='SAVINGS'][0])")
check "POST /api/transfers 100 JOD" 200 -X POST -H "content-type: application/json" -d "{\"fromAccountId\":\"$FROM\",\"toAccountId\":\"$TO\",\"amountMils\":100000}" "$BASE/api/transfers"
check "POST transfer insufficient"  422 -X POST -H "content-type: application/json" -d "{\"fromAccountId\":\"$FROM\",\"toAccountId\":\"$TO\",\"amountMils\":999999000}" "$BASE/api/transfers"
check "POST transfer same account"  400 -X POST -H "content-type: application/json" -d "{\"fromAccountId\":\"$FROM\",\"toAccountId\":\"$FROM\",\"amountMils\":1000}" "$BASE/api/transfers"

# Gold order: buy 1 × 5g bar from checking; verify 201.
PROD=$(curl -s -b "$JAR" "$BASE/api/gold/products" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['products']; print([x['id'] for x in p if x['sku']=='PAMP-5G'][0])")
check "POST /api/gold/orders"       201 -X POST -H "content-type: application/json" -d "{\"productId\":\"$PROD\",\"qty\":1,\"fulfillment\":\"VAULT\",\"sourceAccountId\":\"$FROM\"}" "$BASE/api/gold/orders"
OOS=$(curl -s -b "$JAR" "$BASE/api/gold/products" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['products']; print([x['id'] for x in p if x['sku']=='PAMP-1G'][0])")
check "POST order out-of-stock"     422 -X POST -H "content-type: application/json" -d "{\"productId\":\"$OOS\",\"qty\":1,\"fulfillment\":\"VAULT\",\"sourceAccountId\":\"$FROM\"}" "$BASE/api/gold/orders"

check "POST /api/bills/pay"         200 -X POST -H "content-type: application/json" -d "{\"accountId\":\"$FROM\",\"merchant\":\"Jordan Electric Power Co.\",\"amountMils\":28500}" "$BASE/api/bills/pay"

echo
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
