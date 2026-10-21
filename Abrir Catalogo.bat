@echo off
REM ============================================================
REM  Lanzador del Catalogo de Productos (version web)
REM  Doble clic para arrancar el servidor local y abrir el navegador.
REM ============================================================
setlocal
cd /d "%~dp0"

set PUERTO=8899
set PY=.venv\Scripts\python.exe

if not exist "%PY%" (
    echo No se encontro el Python del entorno virtual: %PY%
    echo Abre la carpeta ReporteProductos y verifica que exista .venv
    pause
    exit /b 1
)

echo Iniciando el catalogo en http://127.0.0.1:%PUERTO%/ ...
echo (Deja esta ventana abierta mientras lo muestras. Cierrala para apagar el servidor.)

REM Abrir el navegador despues de un breve retraso
start "" cmd /c "timeout /t 2 >nul & start http://127.0.0.1:%PUERTO%/"

REM Arrancar el servidor sirviendo la carpeta docs
"%PY%" -m http.server %PUERTO% --bind 127.0.0.1 --directory docs

endlocal
