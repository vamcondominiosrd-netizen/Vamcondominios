$ErrorActionPreference = "Stop"

$origen = "public\icons\vam-180.png"
$destino = "app\apple-icon.png"

if (-not (Test-Path $origen)) {
    throw "No se encontró el icono de iPhone en: $origen"
}

Copy-Item $origen $destino -Force

Write-Host ""
Write-Host "Icono Apple creado correctamente:" -ForegroundColor Green
Write-Host "  app\apple-icon.png"
Write-Host ""
