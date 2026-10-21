@echo off
REM ============================================================
REM  Genera docs\catalogo.json desde el Excel usando el conversor Java.
REM  Doble clic para ejecutar (requiere Java instalado).
REM ============================================================
setlocal
cd /d "%~dp0"

where java >nul 2>nul
if errorlevel 1 (
    echo No se encontro Java en el PATH. Instala el JDK 11 o superior.
    pause
    exit /b 1
)

REM Compilar solo si el .class no existe o el .java es mas reciente.
if not exist GenerarJson.class (
    echo Compilando GenerarJson.java ...
    javac GenerarJson.java || (echo Error de compilacion & pause & exit /b 1)
)

REM Ejecutar. Puedes pasar la ruta de otro Excel como argumento:
REM   "Generar JSON (Java).bat" "C:\ruta\al\ITEM MASTER.xlsx"
java GenerarJson %*

echo.
pause
endlocal
