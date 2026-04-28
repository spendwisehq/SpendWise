# fix_contracts.ps1
# Place in C:\original\SpendWise\blockchain\ and run: .\fix_contracts.ps1

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$files = @(
    "contracts\AuditTrail.sol",
    "contracts\FinancialPassport.sol",
    "contracts\FinancialScoreCert.sol",
    "contracts\GroupSettlement.sol",
    "contracts\SpendWiseBudgetCommitment.sol"
)

foreach ($file in $files) {
    $fullPath = Resolve-Path $file
    Write-Host "Processing $file ..."

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)

    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $bytes = $bytes[3..($bytes.Length - 1)]
    }

    $content = [System.Text.Encoding]::UTF8.GetString($bytes)

    $sb = New-Object System.Text.StringBuilder

    foreach ($char in $content.ToCharArray()) {
        $code = [int]$char
        if ($code -le 127) {
            [void]$sb.Append($char)
        } elseif ($code -eq 0x2014 -or $code -eq 0x2013) {
            [void]$sb.Append('-')
        } elseif ($code -eq 0x2265) {
            [void]$sb.Append('>=')
        } elseif ($code -eq 0x2264) {
            [void]$sb.Append('<=')
        } elseif ($code -eq 0x2192) {
            [void]$sb.Append('->')
        } elseif ($code -eq 0x2190) {
            [void]$sb.Append('<-')
        } elseif ($code -eq 0x00D7) {
            [void]$sb.Append('x')
        } else {
            [void]$sb.Append('-')
        }
    }

    $content = $sb.ToString()

    [System.IO.File]::WriteAllText($fullPath, $content, $utf8NoBom)
    Write-Host "  Done." -ForegroundColor Green
}

Write-Host ""
Write-Host "Checking for remaining non-ASCII..." -ForegroundColor Cyan
$remaining = Select-String -Path contracts\*.sol -Pattern "[^\x00-\x7F]"
if ($remaining) {
    Write-Host "WARNING: Non-ASCII still found:" -ForegroundColor Yellow
    $remaining | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "All clean! Now run: npx hardhat test" -ForegroundColor Green
}