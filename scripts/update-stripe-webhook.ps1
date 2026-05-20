# update-stripe-webhook.ps1
# Updates Stripe webhook URL from old Railway URL to jobsy.lv
# Usage: .\scripts\update-stripe-webhook.ps1 -StripeSecretKey "sk_live_xxx"

param(
  [Parameter(Mandatory=$true)]
  [string]$StripeSecretKey
)

$WEBHOOK_ID  = "we_1TY6ePQhnJ4iHdoqo4xLfSTx"
$NEW_URL     = "https://jobsy.lv/api/webhook"
$EVENTS      = "checkout.session.completed,payment_intent.succeeded,payment_intent.payment_failed"

Write-Host "==> Updating Stripe webhook URL to $NEW_URL ..." -ForegroundColor Cyan

$headers = @{
  "Authorization" = "Bearer $StripeSecretKey"
  "Content-Type"  = "application/x-www-form-urlencoded"
}

$body = "url=$([uri]::EscapeDataString($NEW_URL))&enabled_events[]=$($EVENTS -replace ',', '&enabled_events[]=')"

try {
  $res = Invoke-RestMethod `
    -Method POST `
    -Uri "https://api.stripe.com/v1/webhook_endpoints/$WEBHOOK_ID" `
    -Headers $headers `
    -Body $body
  Write-Host "Updated! New URL: $($res.url)" -ForegroundColor Green
  Write-Host "Status: $($res.status)" -ForegroundColor Green
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "You can also update manually at: https://dashboard.stripe.com/webhooks/$WEBHOOK_ID" -ForegroundColor Yellow
}
