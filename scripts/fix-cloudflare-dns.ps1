# fix-cloudflare-dns.ps1
# Fixes jobsy.lv DNS: removes the A record pointing to wrong IP,
# adds CNAME @ -> zt02btgt.up.railway.app (proxy OFF)
# Usage: .\scripts\fix-cloudflare-dns.ps1 -CfToken "your-cf-api-token"
#
# Get your Cloudflare API Token from:
# https://dash.cloudflare.com/profile/api-tokens
# -> Create Token -> Edit zone DNS (for jobsy.lv zone)

param(
  [Parameter(Mandatory=$true)]
  [string]$CfToken
)

$ZONE_ID     = "053600520c08e6fbd24d507e9fe09313"
$RAILWAY_CNAME = "zt02btgt.up.railway.app"
$CF_API      = "https://api.cloudflare.com/client/v4"

$headers = @{
  "Authorization" = "Bearer $CfToken"
  "Content-Type"  = "application/json"
}

Write-Host "==> Fetching current DNS records for jobsy.lv..." -ForegroundColor Cyan
$records = (Invoke-RestMethod -Uri "$CF_API/zones/$ZONE_ID/dns_records" -Headers $headers).result

# Find the A record @ (wrong one pointing to 66.33.22.174)
$aRecord = $records | Where-Object { $_.type -eq 'A' -and $_.name -eq 'jobsy.lv' }
if ($aRecord) {
  Write-Host "==> Deleting wrong A record: $($aRecord.content) ..." -ForegroundColor Yellow
  Invoke-RestMethod -Method DELETE -Uri "$CF_API/zones/$ZONE_ID/dns_records/$($aRecord.id)" -Headers $headers | Out-Null
  Write-Host "    Deleted." -ForegroundColor Green
} else {
  Write-Host "    No A @ record found (already fixed or different name)." -ForegroundColor Gray
}

# Check if CNAME @ already exists
$existingCname = $records | Where-Object { $_.type -eq 'CNAME' -and $_.name -eq 'jobsy.lv' }
if ($existingCname) {
  Write-Host "==> Updating existing CNAME @ -> $RAILWAY_CNAME ..." -ForegroundColor Cyan
  $body = @{ type="CNAME"; name="@"; content=$RAILWAY_CNAME; proxied=$false; ttl=1 } | ConvertTo-Json
  Invoke-RestMethod -Method PUT -Uri "$CF_API/zones/$ZONE_ID/dns_records/$($existingCname.id)" -Headers $headers -Body $body | Out-Null
} else {
  Write-Host "==> Creating CNAME @ -> $RAILWAY_CNAME (proxy OFF)..." -ForegroundColor Cyan
  $body = @{ type="CNAME"; name="@"; content=$RAILWAY_CNAME; proxied=$false; ttl=1 } | ConvertTo-Json
  Invoke-RestMethod -Method POST -Uri "$CF_API/zones/$ZONE_ID/dns_records" -Headers $headers -Body $body | Out-Null
}
Write-Host "    CNAME set." -ForegroundColor Green

# Verify www CNAME
$wwwRecord = $records | Where-Object { $_.type -eq 'CNAME' -and $_.name -eq 'www.jobsy.lv' }
if (-not $wwwRecord) {
  Write-Host "==> Creating CNAME www -> $RAILWAY_CNAME ..." -ForegroundColor Cyan
  $body = @{ type="CNAME"; name="www"; content=$RAILWAY_CNAME; proxied=$false; ttl=1 } | ConvertTo-Json
  Invoke-RestMethod -Method POST -Uri "$CF_API/zones/$ZONE_ID/dns_records" -Headers $headers -Body $body | Out-Null
  Write-Host "    www CNAME set." -ForegroundColor Green
} else {
  Write-Host "    www CNAME already exists: $($wwwRecord.content)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "DNS updated! Propagation takes 1-5 minutes." -ForegroundColor Green
Write-Host "Then verify Railway recognized the domain at:" -ForegroundColor White
Write-Host "https://railway.com/project/27231791-2b72-4736-b18a-5cf4257c13fd" -ForegroundColor White
