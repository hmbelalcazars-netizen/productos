@echo off
REM ============================================================
REM  Lanzador del Catalogo de Productos (version web)
REM  Doble clic para arrancar el servidor local y abrir el navegador.
REM  Usa Java (sin Python). Requiere el JDK 11 o superior.
REM ============================================================
setlocal
cd /d "%~dp0"

set PUERTO=8899

where java >nul 2>nul
if errorlevel 1 (
    echo No se encontro Java en el PATH. Instala el JDK 11 o superior.
    pause
    exit /b 1
)

REM Compilar el servidor si aun no esta compilado.
if not exist "java\ServidorWeb.class" (
    echo Compilando el servidor web ...
    javac java\ServidorWeb.java || (echo Error de compilacion & pause & exit /b 1)
)

echo Iniciando el catalogo en http://127.0.0.1:%PUERTO%/ ...
echo (Deja esta ventana abierta mientras lo muestras. Cierrala para apagar el servidor.)

REM Abrir el navegador despues de un breve retraso
start "" cmd /c "timeout /t 2 >nul & start http://127.0.0.1:%PUERTO%/"

REM Arrancar el servidor Java sirviendo la carpeta docs.
REM Se ejecuta desde java\ y se le pasa la ruta absoluta de docs.
java -cp java ServidorWeb %PUERTO% "%~dp0docs"

endlocal
