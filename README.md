# Catálogo de Productos — Fybeca

Catálogo web de productos con imágenes por SKU. Es un **sitio estático**
(HTML + CSS + JavaScript) que se publica en GitHub Pages, más un **conversor
en Java** que genera los datos desde el Excel maestro.

No usa Python ni ningún backend.

## Estructura

```
docs/                 La web (lo que se publica)
  index.html          Estructura
  styles.css          Estilos
  app.js              Lógica: carga, buscador, filtros, dedupe, vistas, export
  catalogo.json       Datos (generados desde el Excel)
  logo_fybeca.png     Logo / favicon
java/                 Herramientas en Java (sin dependencias, solo el JDK)
  GenerarJson.java    Conversor Excel -> docs/catalogo.json
  ServidorWeb.java    Servidor estático local para ver la web
  *.bat, README.md    Lanzadores y documentación
data/                 Excel del catálogo (origen de los datos)
Abrir Catalogo.bat    Lanzador: arranca el servidor y abre el navegador
```

## Requisitos

- **JDK 11 o superior** (probado con Java 21). Nada más.

## Ver la web en local

Doble clic en **`Abrir Catalogo.bat`**. Compila el servidor si hace falta,
lo arranca en `http://127.0.0.1:8899/` y abre el navegador. Deja la ventana
abierta mientras lo usas; ciérrala para apagar el servidor.

> No funciona abrir `docs/index.html` con doble clic: el navegador bloquea la
> lectura del catálogo por el protocolo `file://`. Hay que servirlo por HTTP,
> que es justo lo que hace el lanzador.

## Actualizar los datos (Excel -> JSON)

Cuando cambie el catálogo, regenera `docs/catalogo.json`:

```powershell
# desde la carpeta java
javac GenerarJson.java
java GenerarJson
# o apuntando a otro Excel:
java GenerarJson "C:\ruta\al\ITEM MASTER.xlsx"
```

O doble clic en `java\Generar JSON (Java).bat`. Detalles en `java/README.md`.

El Excel debe tener la hoja de datos con las columnas `COD_ITEM`,
`DESCRIPCION`, `MACROCATEGORIA`, `CATEGORIA`, `SUBCATEGORIA`, `FECHA_CREACION`.

## Publicar en GitHub Pages

En **Settings → Pages**: *Deploy from a branch*, rama `main`, carpeta `/docs`.
La web queda en `https://<usuario>.github.io/<repo>/`.

Las imágenes se sirven por `https://api.corporaciongpf.com/fotos/fybeca/{SKU}.jpg`,
que responde por HTTPS, así que cargan también en Pages.

## Imágenes

Se cargan por SKU desde el API público; si una no existe, la tarjeta muestra
"Sin imagen". El servidor donde se abra la web necesita acceso a internet para
ver las imágenes.
