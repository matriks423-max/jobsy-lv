# fix-cloudflare-dns.ps1
# Sets up all DNS records for jobsy.lv:
#   1. Resend domain verification (DKIM + SPF) for email sending
#   2. www -> jobsy.lv redirect rule
#
# Usage: .\scripts\fix-cloudflare-dns.ps1 -CfToken "your-cf-api-token"
#
# Get your Cloudflare API Token from:
# https://dash.cloudflare.com/profile/api-tokens
# -> Create Token -> Edit zone DNS (for jobsy.lv zone)
# Required permissions: Zone DNS Edit + Zone Redirect Rules Edit

param(
  [Parameter(Mandatory=$true)]
  [string]$CfToken
)

$ZONE_ID = "ddd95b1cb7bd51f21e1fd5beaa564f1c"   # jobsy.lv zone ID (NOT account ID)
$CF_API  = "https://api.cloudflare.com/client/v4"

$headers = @{
  "Authorization" = "Bearer $CfToken"
  "Content-Type"  = "application/json"
}

Write-Host "==> Fetching current DNS records for jobsy.lv..." -ForegroundColor Cyan
$records = (Invoke-RestMethod -Uri "$CF_API/zones/$ZONE_ID/dns_records?per_page=100" -Headers $headers).result

function Upsert-DnsRecord($type, $name, $content, $extra = @{}) {
  $existing = $records | Where-Object { $_.type -eq $type -and ($_.name -eq $name -or $_.name -eq "$name.jobsy.lv") }
  $body = (@{ type=$type; name=$name; content=$content; ttl=1 } + $extra) | ConvertTo-Json
  if ($existing) {
    Invoke-RestMethod -Method PUT -Uri "$CF_API/zones/$ZONE_ID/dns_records/$($existing.id)" -Headers $headers -Body $body | Out-Null
    Write-Host "  Updated $type $name -> $($content.Substring(0, [Math]::Min(40, $content.Length)))..." -ForegroundColor Green
  } else {
    Invoke-RestMethod -Method POST -Uri "$CF_API/zones/$ZONE_ID/dns_records" -Headers $headers -Body $body | Out-Null
    Write-Host "  Created $type $name -> $($content.Substring(0, [Math]::Min(40, $content.Length)))..." -ForegroundColor Green
  }
}

# --- Resend domain verification ---
Write-Host "`n==> Adding Resend email DNS records..." -ForegroundColor Cyan

# DKIM
Upsert-DnsRecord "TXT" "resend._domainkey" `
  "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDHSKxdzXIehj4O7FE5hCu7P0NOsdSpAIQjjJvpTuKHtlOLlh1MgkW6DGSl76XzHosiYHlNtyaRJH64XSItWZwjj9eQHWaGImbdoUafa/smRgpXj5mSOFRELffExQqrJdL2cvhi3pEBAWPeqO7dO1iLutUpgu1rA7KxAUBc/xO3IQIDAQAB"

# SPF MX
Upsert-DnsRecord "MX" "send" "feedback-smtp.eu-west-1.amazonses.com" @{ priority=10 }

# SPF TXT
Upsert-DnsRecord "TXT" "send" "v=spf1 include:amazonses.com ~all"

Write-Host "`n==> Triggering Resend domain verification..." -ForegroundColor Cyan
$verifyResp = Invoke-RestMethod -Method POST `
  -Uri "https://api.resend.com/domains/d62e35b5-c8a4-4718-9bc2-c2725f05b24d/verify" `
  -Headers @{ "Authorization" = "Bearer re_JRrZBDBd_K6gpXLsWRCsevF5j4XXJShWk"; "Content-Type" = "application/json" }
Write-Host "  Resend verify response: $($verifyResp | ConvertTo-Json -Compress)" -ForegroundColor Gray

Write-Host "`n==> Done! Propagation takes 1-10 minutes." -ForegroundColor Green
Write-Host "Then check Resend domain status at: https://resend.com/domains" -ForegroundColor White
Write-Host "Cloudflare DNS: https://dash.cloudflare.com/ddd95b1cb7bd51f21e1fd5beaa564f1c/jobsy.lv/dns/records" -ForegroundColor White
