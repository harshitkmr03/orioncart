param()

$dir = "backend/src/main/resources/db/migration"
if (-not (Test-Path $dir)) {
    Write-Error "Migration directory not found: $dir"
    exit 1
}

$files = Get-ChildItem -Path $dir -Filter 'V*__*.sql' | Select-Object -ExpandProperty Name
if ($files.Count -eq 0) {
    Write-Output "No migration files found."
    exit 0
}

$versions = @()
foreach ($f in $files) {
    if ($f -match '^V([0-9]+)__') { $versions += $Matches[1] } else { Write-Error "Invalid migration filename: $f"; exit 1 }
}

$dups = $versions | Group-Object | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name
if ($dups) {
    Write-Error "Duplicate migration versions found: $($dups -join ', ')"
    exit 2
}

Write-Output "Flyway migrations check OK. Count=$($versions.Count)"
exit 0
