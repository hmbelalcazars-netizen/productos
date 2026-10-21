# Catálogo de Productos — versión web (HTML + JavaScript)

Reescritura de la app Streamlit (`../app.py`) como sitio **estático**: HTML,
CSS y JavaScript. No necesita servidor Python en producción ni backend; son
archivos que puedes subir a cualquier hosting estático (GitHub Pages, S3,
nginx, etc.).

## Archivos

```
docs/
  index.html       Estructura de la página
  styles.css       Estilos
  app.js           Toda la lógica (carga, filtros, dedupe, vistas, exportación)
  catalogo.json    Datos del catálogo (generado desde el Excel)
  logo_fybeca.png  Logo de marca / favicon
```

> La carpeta se llama `docs/` (no `web/`) porque GitHub Pages solo publica
> desde la raíz del repo o desde `/docs`.

## Qué hace (equivalente a la app Python)

- Buscador por SKU o nombre.
- Filtros: macrocategoría, categoría, subcategoría, año, mes y día.
- Deduplicación: cuando un producto existe como "CAJA" y "SUELTA", conserva la
  versión SUELTA.
- Vista **Catálogo** (tarjetas con imagen) y vista **Tabla** (con miniaturas).
- Imágenes por SKU contra el API público
  `https://api.corporaciongpf.com/fotos/fybeca/{SKU}.jpg` (más `_2`, `_3`).
  Si una imagen no existe, la tarjeta muestra "Sin imagen" automáticamente.
- Galería por producto (imagen principal + adicionales).
- Exportar a Excel (`.xlsx`) de los productos filtrados, con la URL de imagen
  como hipervínculo (usando SheetJS desde CDN).
- Paginación con botón "Mostrar más" (60 tarjetas / 500 filas por página),
  igual que los límites de la app original.

## Cómo ejecutarla en local

El navegador bloquea `fetch("catalogo.json")` si abres `index.html` con doble
clic (protocolo `file://`). Hay que servir la carpeta por HTTP.

La forma más simple es el lanzador de la carpeta superior:

```
Doble clic en  ..\Abrir Catalogo.bat
```

O manualmente:

```powershell
# desde la carpeta ReporteProductos
.\.venv\Scripts\python.exe -m http.server 8899 --bind 127.0.0.1 --directory docs
```

Luego abre: http://127.0.0.1:8899/

> Nota: en este equipo el puerto 8000 estaba ocupado/bloqueado; por eso se usa
> 8899. Puedes elegir cualquier puerto libre.

## Publicar en GitHub Pages

1. Sube el repo (la carpeta `docs/` debe estar en la rama `main`).
2. En GitHub: **Settings → Pages**.
3. En **Source** elige *Deploy from a branch*.
4. Branch: `main`, carpeta: **`/docs`**. Guarda.
5. A los pocos minutos la web queda publicada en una URL como
   `https://<usuario>.github.io/<repo>/`.

> El API de imágenes responde por `https://`, por lo que las imágenes cargan
> correctamente también en GitHub Pages (servido por HTTPS).

## Actualizar los datos

Cuando cambie el catálogo, regenera `catalogo.json` desde el Excel con el
conversor Java (ver `../java/README.md`):

```powershell
# desde la carpeta java
javac GenerarJson.java
java GenerarJson
# o apuntando a otro Excel:
java GenerarJson "ruta\al\ITEM MASTER.xlsx"
```

También puedes hacer doble clic en `java\Generar JSON (Java).bat`.

Lee las columnas `COD_ITEM`, `DESCRIPCION`, `MACROCATEGORIA`, `CATEGORIA`,
`SUBCATEGORIA`, `FECHA_CREACION` y escribe el resultado en `docs/catalogo.json`.

## Formato de `catalogo.json`

Para que 108k+ productos no inflen el archivo, se guarda en formato compacto:

```json
{ "columns": ["COD_ITEM", "DESCRIPCION", ...], "rows": [ ["100057242", "BOTELLA...", ...], ... ] }
```

`app.js` reconstruye cada fila a objeto al cargar.

## Diferencias frente a la versión Streamlit

- La exportación a Excel incluye la **URL** de la imagen como enlace, no la
  imagen embebida como miniatura (eso requería descargar y recomprimir cada
  imagen en el servidor; en el navegador se deja el enlace para no bloquear la
  descarga). Las miniaturas sí se ven en la vista Tabla dentro de la página.
- No hay proceso de servidor en producción: es 100% estático.
