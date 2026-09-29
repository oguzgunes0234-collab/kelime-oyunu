@echo off
REM ============================================================
REM  Kelime Koprusu'nu telefonda acilacak sekilde baslatir.
REM
REM  CIFT TIKLA. Yaptiklari:
REM    1. Gerekirse paketleri kurar (npm install)
REM    2. Oyunu derler (npm run build)
REM    3. Tailscale varsa oyunu tailnet'e 8443 portundan acar
REM       (hisse uygulamasinin Tailscale adresine dokunmaz)
REM    4. Telefonda acilacak adresleri yazar ve sunucuyu baslatir
REM
REM  Oyun acik kaldigi surece bu pencereyi KAPATMA.
REM ============================================================

title Kelime Koprusu
cd /d "%~dp0"

echo.
echo ============================================
echo    KELIME KOPRUSU
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo HATA: Node.js bulunamadi.
    echo https://nodejs.org adresinden LTS surumunu kur,
    echo sonra bu dosyaya tekrar cift tikla.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Paketler kuruluyor. Ilk seferde bir-iki dakika surer...
    call npm install
    if errorlevel 1 (
        echo.
        echo HATA: npm install basarisiz. Yukaridaki mesaji Claude'a yapistir.
        pause
        exit /b 1
    )
)

echo Oyun derleniyor...
call npm run build
if errorlevel 1 (
    echo.
    echo HATA: Derleme basarisiz. Yukaridaki mesaji Claude'a yapistir.
    pause
    exit /b 1
)

REM ---- Tailscale ----
set "TS=tailscale"
where tailscale >nul 2>&1
if errorlevel 1 set "TS=%ProgramFiles%\Tailscale\tailscale.exe"
set "TSADRES="
if exist "%TS%" goto tailscale_var
where tailscale >nul 2>&1
if errorlevel 1 goto tailscale_yok
:tailscale_var
"%TS%" serve --bg --https=8443 4174 >nul 2>&1
if errorlevel 1 goto tailscale_hata
for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "try { ((& '%TS%' status --json) | ConvertFrom-Json).Self.DNSName.TrimEnd('.') } catch { '' }"`) do set "TSADRES=%%a"
goto yerel_ag
:tailscale_hata
echo UYARI: Tailscale adresi acilamadi. Tailscale acik ve giris yapilmis mi?
echo        Yonetim panelinde HTTPS Certificates acik olmali.
goto yerel_ag
:tailscale_yok
echo Not: Tailscale bulunamadi; yalnizca ayni Wi-Fi adresi kullanilabilir.

REM ---- Ayni Wi-Fi adresi ----
:yerel_ag
set "YEREL="
for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.PrefixOrigin -eq 'Dhcp' } | Select-Object -First 1).IPAddress"`) do set "YEREL=%%a"

echo.
echo ============================================
echo    TELEFONDA AC
echo.
if defined TSADRES echo    Tailscale ile (onerilen, her yerden):
if defined TSADRES echo    https://%TSADRES%:8443
if defined TSADRES echo.
if defined YEREL echo    Ayni Wi-Fi'dan:
if defined YEREL echo    http://%YEREL%:4174
echo.
echo    Bu bilgisayarda: http://localhost:4174
echo ============================================
echo.
echo  Wi-Fi adresi acilmazsa: Windows Guvenlik Duvari
echo  Node.js'e izin vermemis olabilir. Tailscale adresi
echo  bundan etkilenmez.
echo.
echo  Sunucu calisiyor. BU PENCEREYI KAPATMA.
echo  Durdurmak icin Ctrl+C.
echo.

call npx vite preview --host --port 4174 --strictPort
echo.
pause
