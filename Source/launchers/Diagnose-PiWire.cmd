@echo off
setlocal
set "LOG=%TEMP%\PiWire-Start.log"
set "CHROMIUM_LOG=%TEMP%\PiWire-Chromium-%RANDOM%-%RANDOM%.log"
pushd "%~dp0" || exit /b 1
>"%LOG%" echo PiWire 2.1.0
if not exist "PiWire.exe" goto incomplete
if not exist "resources\app\web\index.html" goto incomplete
start "" /wait /b "%~dp0PiWire.exe" --enable-logging=file "--log-file=%CHROMIUM_LOG%" >>"%LOG%" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%LOG%" echo Exit code: %RESULT%
if exist "%CHROMIUM_LOG%" (
    type "%CHROMIUM_LOG%" >>"%LOG%"
    del "%CHROMIUM_LOG%"
)
goto done

:incomplete
set "RESULT=1"
>>"%LOG%" echo PiWire-Dateien fehlen. Bitte die ZIP-Datei vollstaendig entpacken.

:done
popd
echo Protokoll: "%LOG%"
type "%LOG%"
pause
exit /b %RESULT%
