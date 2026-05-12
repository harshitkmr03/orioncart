$csv = 'e:/Project/frontend/sample_master_products.csv'
$base = 'http://localhost:7070/api/library/add'
Write-Host "Reading $csv"
if (-Not (Test-Path $csv)) { Write-Error "CSV not found: $csv"; exit 1 }
$rows = Import-Csv $csv
foreach ($r in $rows) {
    $body = @{
        name = $r.name
        brand = $r.brand
        barcode = $r.barcode
    } | ConvertTo-Json

    try {
        Write-Host "Posting: $($r.name)"
        $resp = Invoke-RestMethod -Uri $base -Method Post -Body $body -ContentType 'application/json' -ErrorAction Stop
        Write-Host "  -> Created id: $($resp.id)"
    } catch {
        Write-Host "  -> Failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            try {
                $text = $_.Exception.Response.GetResponseStream() | New-Object System.IO.StreamReader | ForEach-Object { $_.ReadToEnd() }
                Write-Host "  -> Response: $text" -ForegroundColor Yellow
            } catch { }
        }
    }
}
Write-Host "Done."