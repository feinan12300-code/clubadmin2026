# gen-tabbar-icons.ps1 — 生成 tabBar 图标 PNG(填充风格)
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\icons"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$outDir = (Resolve-Path $outDir).Path

$gray = [System.Drawing.Color]::FromArgb(155, 163, 175)
$purple = [System.Drawing.Color]::FromArgb(99, 102, 241)
$transparent = [System.Drawing.Color]::Transparent

function New-Canvas {
  $bmp = New-Object System.Drawing.Bitmap(81, 81)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear($transparent)
  return ,@($bmp, $g)
}

function Make-Brush($color) {
  return (New-Object System.Drawing.SolidBrush($color))
}

function Set-CarveMode($g) {
  # 切换到挖空模式:用透明色绘制会覆盖掉已有像素
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
}

function Set-FillMode($g) {
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
}

function Draw-Venue($color) {
  $canvas = New-Canvas
  $bmp = $canvas[0]; $g = $canvas[1]
  $brush = Make-Brush $color
  $carve = Make-Brush $transparent
  # 屋顶三角形(填充)
  $p1 = New-Object System.Drawing.PointF -ArgumentList 40, 8
  $p2 = New-Object System.Drawing.PointF -ArgumentList 12, 42
  $p3 = New-Object System.Drawing.PointF -ArgumentList 68, 42
  $pts = [System.Drawing.PointF[]]@($p1, $p2, $p3)
  $g.FillPolygon($brush, $pts)
  # 主体矩形(填充)
  $g.FillRectangle($brush, 18, 42, 44, 30)
  # 门(挖空)
  Set-CarveMode $g
  $g.FillRectangle($carve, 36, 52, 8, 20)
  return $bmp
}

function Draw-Seatmap($color) {
  $canvas = New-Canvas
  $bmp = $canvas[0]; $g = $canvas[1]
  $brush = Make-Brush $color
  $r = 10
  $g.FillEllipse($brush, 25 - $r, 25 - $r, $r * 2, $r * 2)
  $g.FillEllipse($brush, 56 - $r, 25 - $r, $r * 2, $r * 2)
  $g.FillEllipse($brush, 25 - $r, 56 - $r, $r * 2, $r * 2)
  $g.FillEllipse($brush, 56 - $r, 56 - $r, $r * 2, $r * 2)
  return $bmp
}

function Draw-Reservation($color) {
  $canvas = New-Canvas
  $bmp = $canvas[0]; $g = $canvas[1]
  $brush = Make-Brush $color
  $carve = Make-Brush $transparent
  # 日历整体矩形(填充)
  $g.FillRectangle($brush, 14, 20, 52, 44)
  # 顶部装订环之间挖空(留两个环)
  Set-CarveMode $g
  $g.FillRectangle($carve, 30, 12, 20, 12)
  # 顶部装订环(填充)
  Set-FillMode $g
  $g.FillRectangle($brush, 22, 12, 8, 14)
  $g.FillRectangle($brush, 50, 12, 8, 14)
  # 内部挖空:留外框 + 横线分隔
  Set-CarveMode $g
  $g.FillRectangle($carve, 20, 26, 40, 6)
  $g.FillRectangle($carve, 20, 38, 40, 6)
  $g.FillRectangle($carve, 20, 50, 40, 6)
  return $bmp
}

function Draw-Ordering($color) {
  $canvas = New-Canvas
  $bmp = $canvas[0]; $g = $canvas[1]
  $brush = Make-Brush $color
  $carve = Make-Brush $transparent
  # 餐盘(填充圆)
  $g.FillEllipse($brush, 12, 12, 57, 57)
  # 内部 3 条横线挖空(菜单线)
  Set-CarveMode $g
  $g.FillRectangle($carve, 24, 27, 33, 6)
  $g.FillRectangle($carve, 24, 37, 33, 6)
  $g.FillRectangle($carve, 24, 47, 33, 6)
  return $bmp
}

function Draw-Billing($color) {
  $canvas = New-Canvas
  $bmp = $canvas[0]; $g = $canvas[1]
  $brush = Make-Brush $color
  $carve = Make-Brush $transparent
  # 钱币外圆(填充)
  $g.FillEllipse($brush, 12, 12, 57, 57)
  # ¥ 符号挖空
  Set-CarveMode $g
  # Y 形(两条斜线挖空,用矩形近似)
  $g.FillRectangle($carve, 29, 30, 6, 14)
  $g.FillRectangle($carve, 45, 30, 6, 14)
  # 竖线挖空
  $g.FillRectangle($carve, 37, 30, 6, 24)
  # 上下横线挖空
  $g.FillRectangle($carve, 27, 40, 26, 6)
  $g.FillRectangle($carve, 27, 48, 26, 6)
  return $bmp
}

function Save-Icon($bmp, $name) {
  $path = Join-Path $outDir $name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$defs = @(
  @{ Name = "venue";       Fn = "Draw-Venue" },
  @{ Name = "seatmap";     Fn = "Draw-Seatmap" },
  @{ Name = "reservation"; Fn = "Draw-Reservation" },
  @{ Name = "ordering";    Fn = "Draw-Ordering" },
  @{ Name = "billing";     Fn = "Draw-Billing" }
)

foreach ($d in $defs) {
  $fn = $d.Fn
  $normal = & (Get-Item "function:$fn") $gray
  Save-Icon $normal ($d.Name + ".png")
  $active = & (Get-Item "function:$fn") $purple
  Save-Icon $active ($d.Name + "-active.png")
  Write-Host ("Generated " + $d.Name + ".png + " + $d.Name + "-active.png")
}

Write-Host ("Done. Output: " + $outDir)
Get-ChildItem $outDir | Select-Object Name, Length | Format-Table
