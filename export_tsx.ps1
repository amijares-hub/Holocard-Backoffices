$outputFile = "codigo_tsx.txt"
$files = Get-ChildItem -Path . -Recurse -File -Filter *.tsx | Where-Object { 
    $_.FullName -notmatch "\\node_modules\\" -and 
    $_.FullName -notmatch "\\dist\\" -and 
    $_.FullName -notmatch "\\build\\" -and 
    $_.FullName -notmatch "\\.next\\"
}

$allContent = @()
foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($PWD.Path.Length + 1)
    $allContent += "`r`n`r`n========================================`r`nArchivo: $relativePath`r`n========================================`r`n"
    $allContent += Get-Content $file.FullName -Raw -Encoding UTF8
}

[IO.File]::WriteAllText("$PWD\$outputFile", [string]::Join("", $allContent))
Write-Output "Archivo generado exitosamente en: $PWD\$outputFile"
