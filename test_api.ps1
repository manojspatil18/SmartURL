$BASE_URL = "http://localhost:10000"
$randomId = Get-Random -Minimum 1000 -Maximum 9999
$alias = "temurin-jdk-$randomId"

Write-Host "🚀 STARTING SYSTEM API INTEGRATION TESTS (PORT 10000)`n" -ForegroundColor Cyan

try {
    # Test 1: Shorten a new URL
    Write-Host "➡️ TEST 1: Shortening long URL with custom alias '$alias'..." -ForegroundColor Yellow
    $body = @{
        originalUrl = "http://localhost:10000/css/style.css"
        customAlias = $alias
    } | ConvertTo-Json
    
    $shortenRes = Invoke-RestMethod -Uri "$BASE_URL/shorten" -Method Post -Body $body -ContentType "application/json"
    Write-Host "[STATUS] Success" -ForegroundColor Green
    Write-Host "[BODY] Code: $($shortenRes.shortCode) | ID: $($shortenRes.id)"
    
    $shortCode = $shortenRes.shortCode
    $id = $shortenRes.id

    # Test 2: Resolve and Track click
    Write-Host "`n➡️ TEST 2: Resolving short URL and tracking click..." -ForegroundColor Yellow
    $resolveRes = Invoke-WebRequest -Uri "$BASE_URL/$shortCode" -MaximumRedirection 0 -ErrorAction SilentlyContinue -UseBasicParsing
    Write-Host "[STATUS] HTTP $($resolveRes.StatusCode) Redirect Checked" -ForegroundColor Green
    
    # Test 3: Check analytics
    Write-Host "`n➡️ TEST 3: Fetching analytics details..." -ForegroundColor Yellow
    $analyticsRes = Invoke-RestMethod -Uri "$BASE_URL/analytics/$shortCode" -Method Get
    Write-Host "[STATUS] Success" -ForegroundColor Green
    Write-Host "[BODY] Click count (should be 1): $($analyticsRes.clickCount)"
    Write-Host "[BODY] Created At: $($analyticsRes.createdAt)"

    if ($analyticsRes.clickCount -ne 1) {
        throw "Analytics tracking failed: click count is $($analyticsRes.clickCount) instead of 1"
    }

    # Test 4: Batch retrieval for LocalStorage Dashboard
    Write-Host "`n➡️ TEST 4: Performing dashboard batch synchronization..." -ForegroundColor Yellow
    $codes = @($shortCode, "non-existent-code") | ConvertTo-Json
    $batchRes = Invoke-RestMethod -Uri "$BASE_URL/api/my-urls" -Method Post -Body $codes -ContentType "application/json"
    Write-Host "[STATUS] Success" -ForegroundColor Green
    Write-Host "[BODY] Synchronized array size (should be 1): $($batchRes.Count)"

    if ($batchRes.Count -ne 1) {
        throw "Dashboard sync failed"
    }

    # Test 5: Delete URL
    Write-Host "`n➡️ TEST 5: Deleting shortened URL..." -ForegroundColor Yellow
    $deleteRes = Invoke-RestMethod -Uri "$BASE_URL/delete/$id" -Method Delete
    Write-Host "[STATUS] Success" -ForegroundColor Green
    Write-Host "[BODY] Message: $($deleteRes.message)"

    # Test 6: Verify deletion
    Write-Host "`n➡️ TEST 6: Verifying deletion..." -ForegroundColor Yellow
    try {
        $verifyRes = Invoke-WebRequest -Uri "$BASE_URL/analytics/$shortCode" -Method Get -ErrorAction Stop -UseBasicParsing
        throw "Expected 404 error but got 200"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 404) {
            Write-Host "[STATUS] Received expected 404 Not Found" -ForegroundColor Green
        } else {
            throw "Expected 404 but got HTTP $statusCode"
        }
    }

    Write-Host "`n🎉 ALL BACKEND API INTEGRATION TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green

} catch {
    Write-Host "`n❌ TEST SUITE FAILED: $_" -ForegroundColor Red
}
