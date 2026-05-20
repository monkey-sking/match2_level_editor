# Convert-CompetitorLevels.ps1
# Pure ASCII PowerShell script to batch convert competitor levels from JSON to GDD txt format.
# This prevents Chinese character encoding/codepage corruption in GBK PowerShell hosts.

$c_ce = [string][char]0x7B56
$c_hua = [string][char]0x5212
$c_an = [string][char]0x6848
$p1 = $c_ce + $c_hua + $c_an + "_GameDesign"

$c_guan = [string][char]0x5173
$c_ka = [string][char]0x5361
$c_shu = [string][char]0x6570
$c_ju = [string][char]0x636E
$p2 = $c_guan + $c_ka + $c_shu + $c_ju + "_LevelData"

$c_jing = [string][char]0x7ADE
$c_pin = [string][char]0x54C1
$c_fu = [string][char]0x590D
$c_ke = [string][char]0x523B
$p3 = $c_jing + $c_pin + $c_fu + $c_ke + $c_guan + $c_ka

$jsonDir = "D:\Project\mahjong\LevelsJson"
$outputDir = "d:\mahjong_match2_gdd\" + $p1 + "\" + $p2 + "\" + $p3

if (-not (Test-Path $jsonDir)) {
    Write-Error "Competitor levels directory not found"
    exit 1
}

# Create output directory
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$uidPool = 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 4001, 4002, 4003, 4004, 4005, 4006, 4007

$jsonFiles = Get-ChildItem -Path $jsonDir -Filter "*.json" -Recurse

$totalCount = $jsonFiles.Count
$infoMsg = "Found " + $totalCount + " JSON files to convert."
Write-Host $infoMsg

$convertedCount = 0
$tab = [char]9

foreach ($file in $jsonFiles) {
    try {
        $rawText = [System.IO.File]::ReadAllText($file.FullName)
        $data = ConvertFrom-Json -InputObject $rawText
        
        $cells = $data.cells
        if ($null -eq $cells) {
            continue
        }
        
        # 1. Gather all raw tiles using System.Collections.ArrayList
        $rawTiles = New-Object System.Collections.ArrayList
        foreach ($cell in $cells) {
            $col = $cell.column
            $row = $cell.row
            $gridObjects = $cell.gridObjects
            if ($null -ne $gridObjects) {
                foreach ($obj in $gridObjects) {
                    $layer = $obj.layer
                    $tileObj = "" | Select-Object col, row, layer
                    $tileObj.col = [int]$col
                    $tileObj.row = [int]$row
                    $tileObj.layer = [int]$layer
                    $rawTiles.Add($tileObj) | Out-Null
                }
            }
        }
        
        $totalTiles = $rawTiles.Count
        if ($totalTiles -eq 0) { continue }
        
        # 偶数截断
        if ($totalTiles % 2 -ne 0) {
            $rawTiles.RemoveAt($rawTiles.Count - 1)
            $totalTiles = $rawTiles.Count
        }
        
        # Find bounds
        $cols = @()
        $rows = @()
        foreach ($t in $rawTiles) {
            $cols += $t.col
            $rows += $t.row
        }
        
        $minCol = ($cols | Measure-Object -Minimum).Minimum
        $maxCol = ($cols | Measure-Object -Maximum).Maximum
        $minRow = ($rows | Measure-Object -Minimum).Minimum
        $maxRow = ($rows | Measure-Object -Maximum).Maximum
        
        $colRange = $maxCol - $minCol
        if ($colRange -eq 0) { $colRange = 1 }
        $rowRange = $maxRow - $minRow
        if ($rowRange -eq 0) { $rowRange = 1 }
        
        $convertedTiles = New-Object System.Collections.ArrayList
        $occupied = New-Object System.Collections.Hashtable
        
        # 2. Map coordinates
        for ($i = 0; $i -lt $totalTiles; $i++) {
            $t = $rawTiles[$i]
            
            # Normalization and scaling without nested parenthesis
            $colDiff = $t.col - $minCol
            $ratioX = $colDiff / $colRange
            $xVal = $ratioX * 10
            $x = [int][Math]::Round($xVal)
            
            $rowDiff = $maxRow - $t.row
            $ratioY = $rowDiff / $rowRange
            $yVal = $ratioY * 12
            $y = [int][Math]::Round($yVal)
            
            $layout = $t.layer + 1
            
            # Resolve collisions
            $key = $x.ToString() + "," + $y.ToString() + "," + $layout.ToString()
            while ($occupied.ContainsKey($key)) {
                if ($x -lt 10) { 
                    $x = $x + 1 
                } elseif ($y -lt 12) { 
                    $y = $y + 1 
                } else { 
                    $layout = $layout + 1 
                }
                $key = $x.ToString() + "," + $y.ToString() + "," + $layout.ToString()
            }
            
            $occupied[$key] = $true
            
            $newTileObj = "" | Select-Object id, uid, x, y, layout
            $newTileObj.id = 0
            $newTileObj.uid = 0
            $newTileObj.x = $x
            $newTileObj.y = $y
            $newTileObj.layout = $layout
            
            $convertedTiles.Add($newTileObj) | Out-Null
        }
        
        # 3. Dynamic pairing of UIDs
        $numPairs = $totalTiles / 2
        
        # Pick M UIDs
        $divVal = $totalTiles / 6
        $floorVal = [int][Math]::Floor($divVal)
        if ($floorVal -lt 4) { $floorVal = 4 }
        $numUids = [Math]::Min($numPairs, $floorVal)
        
        # Random sample UIDs
        $shuffledPool = $uidPool | Get-Random -Count $uidPool.Count
        $selectedUids = New-Object System.Collections.ArrayList
        for ($i = 0; $i -lt $numUids; $i++) {
            $selectedUids.Add($shuffledPool[$i]) | Out-Null
        }
        
        $assignedUids = New-Object System.Collections.ArrayList
        for ($i = 0; $i -lt $numPairs; $i++) {
            $uid = $selectedUids[$i % $selectedUids.Count]
            $assignedUids.Add($uid) | Out-Null
            $assignedUids.Add($uid) | Out-Null
        }
        
        # Shuffle assigned UIDs
        $shuffledUids = $assignedUids | Get-Random -Count $assignedUids.Count
        
        for ($i = 0; $i -lt $totalTiles; $i++) {
            $convertedTiles[$i].uid = $shuffledUids[$i]
            $convertedTiles[$i].id = $i + 1
        }
        
        # 4. Write to TXT with standard header using safe Concat method
        $cleanName = $file.BaseName -replace "level_", "level_comp_"
        $lowerName = $cleanName.ToLower()
        $txtFilename = $lowerName + ".txt"
        $txtPath = Join-Path $outputDir $txtFilename
        
        $utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
        $writer = New-Object System.IO.StreamWriter($txtPath, $false, $utf8NoBOM)
        
        $c_zhe = [string][char]0x8FD9
        $c_shi = [string][char]0x662F
        $c_zi = [string][char]0x81EA
        $c_ji = [string][char]0x5DF1
        $c_de = [string][char]0x7684
        $c1 = $c_zhe + $c_shi + $c_zi + $c_ji + $c_de + "id"
        
        $c_pai = [string][char]0x724C
        $c_xing = [string][char]0x578B
        $c2 = $c_pai + $c_xing + "id"
        
        $c_wei = [string][char]0x4F4D
        $c_zhi = [string][char]0x7F6E
        $c3 = $c_wei + $c_zhi
        
        $c_di = [string][char]0x7B2C
        $c_ji2 = [string][char]0x51E0
        $c_ceng = [string][char]0x5C42
        $c4 = $c_di + $c_ji2 + $c_ceng
        
        $header1 = "##var" + $tab + "id" + $tab + "uid" + $tab + "x" + $tab + "y" + $tab + "layout"
        $header2 = "##var" + $tab + $tab + $tab + $tab + $tab
        $header3 = "##type" + $tab + "int" + $tab + "int" + $tab + "int" + $tab + "int" + $tab + "int"
        $header4 = "##group" + $tab + "c" + $tab + "c" + $tab + "c" + $tab + "c" + $tab + "c"
        $header5 = "##" + $tab + $c1 + $tab + $c2 + $tab + $c3 + $tab + $c3 + $tab + $c4
        
        $writer.WriteLine($header1)
        $writer.WriteLine($header2)
        $writer.WriteLine($header3)
        $writer.WriteLine($header4)
        $writer.WriteLine($header5)
        
        for ($i = 0; $i -lt $totalTiles; $i++) {
            $t = $convertedTiles[$i]
            $line = $tab + $t.id + $tab + $t.uid + $tab + $t.x + $tab + $t.y + $tab + $t.layout
            $writer.WriteLine($line)
        }
        
        $writer.Close()
        $convertedCount++
        
    } catch {
        $name = $file.Name
        $msg = $_.Exception.Message
        $errMsg = "Failed to convert " + $name + ": " + $msg
        Write-Warning $errMsg
    }
}

$successMsg = "Batch conversion finished! Successfully converted " + $convertedCount + " levels."
Write-Host $successMsg
