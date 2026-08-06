$ErrorActionPreference = 'Stop'
$api='http://127.0.0.1:8000'
$admin = @{ email = 'e2e.admin@test.com'; password = 'E2eTest9999' } | ConvertTo-Json

Write-Host 'Logging in as admin...'
$login = Invoke-RestMethod -Uri "$api/auth/login" -Method Post -Body $admin -ContentType 'application/json'
$token = $null
if ($login -ne $null) { $token = $login.token; if (-not $token) { $token = $login.access_token } }
if (-not $token) { Write-Error 'Login failed: no token'; exit 1 }
Write-Host 'TOKEN obtained'
$headers = @{ Authorization = "Bearer $token" }
$target='88'
Write-Host "Fetching record $target"
try {
    $record = Invoke-RestMethod -Uri "$api/admin/service-requests/$target" -Method Get -Headers $headers
} catch {
    Write-Error "Failed to fetch record: $_"
    exit 1
}
Write-Host 'Record:'
$record | ConvertTo-Json -Depth 5 | Write-Output

$okToDelete = $false
if ($record.is_test_data -eq $true) { $okToDelete = $true; Write-Host 'Marked as test data' }
if ($record.review_notes -and $record.review_notes -match '(?i)e2e') { $okToDelete = $true; Write-Host 'Review notes contain E2E' }
if (-not $okToDelete) { Write-Error 'Refusing to delete: safety checks failed'; exit 1 }

Write-Host "DELETING ID: $target"
Write-Host "REASON: confirmed E2E test data"
try {
    $del = Invoke-RestMethod -Uri "$api/admin/service-requests/$target" -Method Delete -Headers $headers
    Write-Host 'Delete response:'
    $del | ConvertTo-Json | Write-Output
} catch {
    Write-Error "Delete failed: $_"
    exit 1
}
