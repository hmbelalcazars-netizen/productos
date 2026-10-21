# Conversor Excel → JSON en Java

Equivalente en **Java** del script Python `../generar_json.py`. Lee el Excel del
catálogo y escribe `../docs/catalogo.json` en el mismo formato compacto que
consume la web.

Se verificó que la salida es **idéntica byte por byte** a la que genera el
script Python (mismo tamaño y mismo hash SHA-256 sobre los 108k+ productos).

## Por qué no usa Apache POI ni Maven

Un archivo `.xlsx` es en realidad un ZIP con XML dentro. El programa lo lee con
lo que trae el propio JDK (`java.util.zip` + `javax.xml.stream`), así que **no
necesita librerías externas ni Maven/Gradle**: basta el JDK (probado con
Java 21).

## Requisitos

- JDK 11 o superior en el `PATH` (`java` y `javac`).

## Uso

**Opción rápida:** doble clic en `Generar JSON (Java).bat`.

**Manual, desde esta carpeta (`java/`):**

```powershell
javac GenerarJson.java
java GenerarJson
```

Para apuntar a otro Excel, pásalo como argumento:

```powershell
java GenerarJson "C:\ruta\al\ITEM MASTER.xlsx"
```

Si no se pasa ruta, usa `../data/catalogo.xlsx` y, si no existe,
`../data/ITEM MASTER ORIGINAL - Copia.xlsx`.

## Qué hace (igual que la versión Python)

- Lee la hoja de datos del Excel (columnas A–F):
  `COD_ITEM`, `DESCRIPCION`, `MACROCATEGORIA`, `CATEGORIA`, `SUBCATEGORIA`,
  `FECHA_CREACION`.
- Normaliza el SKU (quita un `.0` final si el resto son dígitos).
- Convierte la fecha (número serial de Excel) a texto ISO `YYYY-MM-DD`.
- Recorta espacios de los extremos, incluido el espacio duro `U+00A0` que
  pandas sí quita y que `String.trim()`/`strip()` de Java no.
- Escribe `../docs/catalogo.json` como `{ "columns": [...], "rows": [[...], ...] }`.

## Dónde cambiar el archivo maestro por defecto

En `GenerarJson.java`, método `main`, las líneas que definen `ligero` y
`completo`. O más simple: pasa la ruta como argumento al ejecutar (ver arriba).

## Nota

El archivo `GenerarJson.class` (resultado de compilar) no se versiona; se
regenera con `javac`. Está excluido en `.gitignore`.
