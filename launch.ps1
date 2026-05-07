# 古文匠人 · 学习闯关 - 本地启动器
# 由 点我启动.bat 调用

$ErrorActionPreference = 'Stop'

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = '古文匠人 · 学习闯关'

$port = 8123
$url = "http://127.0.0.1:$port/"

Set-Location -LiteralPath $PSScriptRoot

Write-Host ''
Write-Host '============================================================'
Write-Host '   古文匠人 · 学习闯关  本地启动器'
Write-Host '============================================================'
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host '[错误] 没有检测到 Node.js' -ForegroundColor Red
    Write-Host ''
    Write-Host '本网页需要 Node.js 来启动本地服务，请先安装：'
    Write-Host '    https://nodejs.org/zh-cn  （建议下载 LTS 版本）'
    Write-Host ''
    Write-Host '安装完成后，重新双击 点我启动.bat 即可。'
    Write-Host ''
    Read-Host '按回车键关闭'
    exit 1
}

if (-not (Test-Path 'dev-server.cjs')) {
    Write-Host '[错误] 当前文件夹缺少 dev-server.cjs，请确认文件夹完整。' -ForegroundColor Red
    Write-Host ''
    Read-Host '按回车键关闭'
    exit 1
}

Write-Host "正在启动本地服务... 端口：$port"
Write-Host ''
Write-Host "启动后会自动用默认浏览器打开 $url"
Write-Host '如果浏览器没有自动打开，请手动复制上面的网址访问。'
Write-Host ''
Write-Host '*** 关闭本黑色窗口即可停止网页服务 ***' -ForegroundColor Yellow
Write-Host '------------------------------------------------------------'

# 异步等待 1 秒后用默认浏览器打开（在隐藏窗口里执行，不会留下黑窗）
$openCmd = "Start-Sleep -Seconds 1; Start-Process '$url'"
Start-Process -FilePath 'powershell' `
    -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-Command', $openCmd) `
    -WindowStyle Hidden | Out-Null

# 前台运行 Node 服务；用户关闭本窗口即可停止
& node dev-server.cjs $port

Write-Host ''
Write-Host '------------------------------------------------------------'
Write-Host '服务已停止。'
Read-Host '按回车键关闭'
