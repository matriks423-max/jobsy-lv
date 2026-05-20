# setup-railway.ps1
# Run this once after `railway login` to set all required env vars and cron job
# Usage: .\scripts\setup-railway.ps1 -ResendApiKey "re_xxxx"

param(
  [Parameter(Mandatory=$true)]
  [string]$ResendApiKey
)

$PROJECT  = "27231791-2b72-4736-b18a-5cf4257c13fd"
$SERVICE  = "b8d1b612-f91a-4459-9dd2-164a8d2925d8"
$ENV      = "d22af4b3-bf7c-4d84-8287-4fa52170cb5d"
$CRON_SECRET = "c7280ab923f25266234ecf7ae334df0765fa6f72c04f561d24d9f28c0af75ed9"

Write-Host "==> Setting CRON_SECRET..." -ForegroundColor Cyan
railway variable set "CRON_SECRET=$CRON_SECRET" --project $PROJECT --environment $ENV --service $SERVICE

Write-Host "==> Setting RESEND_API_KEY..." -ForegroundColor Cyan
railway variable set "RESEND_API_KEY=$ResendApiKey" --project $PROJECT --environment $ENV --service $SERVICE

Write-Host "==> Verifying vars..." -ForegroundColor Cyan
railway variable list --project $PROJECT --environment $ENV --service $SERVICE --json | ConvertFrom-Json | Where-Object { $_.name -in @('CRON_SECRET','RESEND_API_KEY') } | Format-Table name, value

Write-Host ""
Write-Host "==> Next: create the cron service in Railway dashboard:" -ForegroundColor Yellow
Write-Host "    1. Open https://railway.com/project/$PROJECT" -ForegroundColor White
Write-Host "    2. Click '+ New' -> 'Cron Job'" -ForegroundColor White
Write-Host "    3. Schedule: 0 7 * * *" -ForegroundColor White
Write-Host "    4. Command:  curl -s -o /dev/null -H 'x-cron-secret: `$CRON_SECRET' https://jobsy.lv/api/cron/reminders" -ForegroundColor White
Write-Host ""
Write-Host "Done! Railway env vars set." -ForegroundColor Green
