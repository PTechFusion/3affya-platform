#!/usr/bin/env bash
# Task 1.8 done-when check with the Stripe CLI (lane L2): `stripe trigger payment_intent.succeeded` twice against a local
# server, then one more delivery of a real event, and a row count per event id. Needs Stripe test keys (L0 item 2).
#
# Two triggers create two different PaymentIntents, so two different events and two rows; what must hold is one row per
# event id however often it is delivered. So the script also re-delivers the first event (fetched from Stripe, signed
# with the same secret by scripts/stripe-webhook-replay.mjs) and checks each id still has exactly one row.
#
# Before running, in three terminals (Git Bash), with the local Supabase stack up:
#   1. stripe login                                                     (once; test mode)
#   2. stripe listen --forward-to localhost:3000/api/stripe/webhook     (leave running; prints the whsec_ secret)
#   3. export STRIPE_WEBHOOK_SECRET="$(stripe listen --print-secret)"
#      export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...            (npx supabase status -o env: API_URL, SERVICE_ROLE_KEY)
#      npm run build && npm run start                                   (same shell: the server reads these from env)
#   then, from a shell with the same three variables:
#      bash scripts/stripe-trigger-twice.sh
set -euo pipefail

cd "$(dirname "$0")/.."
: "${STRIPE_WEBHOOK_SECRET:?set it to the output of: stripe listen --print-secret}"
: "${SUPABASE_URL:?set it from: npx supabase status -o env (API_URL)}"
: "${SUPABASE_SERVICE_ROLE_KEY:?set it from: npx supabase status -o env (SERVICE_ROLE_KEY)}"
export BASE_URL="${BASE_URL:-http://localhost:3000}"
command -v stripe >/dev/null || { echo "The Stripe CLI is not installed (https://docs.stripe.com/stripe-cli)"; exit 2; }

echo "Triggering payment_intent.succeeded twice (test mode)..."
stripe trigger payment_intent.succeeded >/dev/null
stripe trigger payment_intent.succeeded >/dev/null

# The two newest payment_intent.succeeded events: the ones just triggered.
ids=$(stripe get /v1/events -d type=payment_intent.succeeded -d limit=2 \
  | node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>console.log(JSON.parse(s).data.map((e)=>e.id).join(" ")))')
read -r first second <<<"$ids"
echo "Events: $first $second"

# Wait for stripe listen to forward both (up to 30 s each).
for id in $first $second; do
  for _ in $(seq 1 30); do
    if node scripts/stripe-webhook-replay.mjs --count "$id" >/dev/null 2>&1; then break; fi
    sleep 1
  done
done

# A second delivery of the first event, the duplicate Stripe may send.
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
stripe get "/v1/events/$first" >"$tmp"
node scripts/stripe-webhook-replay.mjs --event "$tmp" --times 1

status=0
for id in $first $second; do
  node scripts/stripe-webhook-replay.mjs --count "$id" || status=1
done
if [ "$status" -eq 0 ]; then
  echo "PASS: two triggers, one extra delivery, exactly one stripe_events row per event id"
else
  echo "FAIL: see the counts above"
fi
exit "$status"
