$outputFile = "codigo_completo.txt"
Clear-Content $outputFile -ErrorAction SilentlyContinue

$files = Get-ChildItem -Path . -Recurse -File | Where-Object { 
    $_.Extension -in ".ts",".tsx",".js",".jsx",".css",".json",".html" -and 
    $_.FullName -notmatch "\\node_modules\\" -and 
    $_.FullName -notmatch "\\dist\\" -and 
    $_.FullName -notmatch "\\build\\" -and 
    $_.FullName -notmatch "\\.next\\"
}

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($PWD.Path.Length + 1)
    $header = "`r`n`r`n========================================`r`nArchivo: $relativePath`r`n========================================`r`n"
    Add-Content -Path $outputFile -Value $header -Encoding UTF8
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content) {
        Add-Content -Path $outputFile -Value $content -Encoding UTF8
    }
}
Write-Output "Archivo generado exitosamente en: $PWD\$outputFile"
