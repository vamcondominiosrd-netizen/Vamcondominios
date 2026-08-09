param(
    [string]$LogoPath = "public\logo.jpg"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $LogoPath)) {
    throw "No se encontró el logo en: $LogoPath"
}

Add-Type -AssemblyName System.Drawing

$iconsDir = "public\icons"

if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

function New-VamIcon {
    param(
        [string]$Source,
        [string]$Destination,
        [int]$Size
    )

    $sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $Source))

    try {
        $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

        try {
            $graphics.Clear([System.Drawing.Color]::White)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

            # Margen para que el logo no quede pegado a los bordes del icono.
            $padding = [int]($Size * 0.10)
            $maxWidth = $Size - ($padding * 2)
            $maxHeight = $Size - ($padding * 2)

            $ratio = [Math]::Min(
                $maxWidth / $sourceImage.Width,
                $maxHeight / $sourceImage.Height
            )

            $drawWidth = [int]($sourceImage.Width * $ratio)
            $drawHeight = [int]($sourceImage.Height * $ratio)
            $x = [int](($Size - $drawWidth) / 2)
            $y = [int](($Size - $drawHeight) / 2)

            $graphics.DrawImage(
                $sourceImage,
                $x,
                $y,
                $drawWidth,
                $drawHeight
            )

            $bitmap.Save(
                $Destination,
                [System.Drawing.Imaging.ImageFormat]::Png
            )
        }
        finally {
            $graphics.Dispose()
            $bitmap.Dispose()
        }
    }
    finally {
        $sourceImage.Dispose()
    }
}

New-VamIcon -Source $LogoPath -Destination "$iconsDir\vam-192.png" -Size 192
New-VamIcon -Source $LogoPath -Destination "$iconsDir\vam-512.png" -Size 512
New-VamIcon -Source $LogoPath -Destination "$iconsDir\vam-180.png" -Size 180

Write-Host ""
Write-Host "Iconos VAM creados correctamente:" -ForegroundColor Green
Write-Host "  public\icons\vam-180.png"
Write-Host "  public\icons\vam-192.png"
Write-Host "  public\icons\vam-512.png"
Write-Host ""
