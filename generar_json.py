"""
Genera docs/catalogo.json a partir del Excel del catálogo.

Extrae solo las columnas que usa el dashboard y las serializa a JSON para
que la versión web (HTML + JavaScript) las cargue directamente en el navegador,
sin necesidad de leer el Excel ni de un backend.

Uso:
    python generar_json.py [ruta_al_excel.xlsx]

Si no se pasa ruta, usa data/catalogo.xlsx (y si no, el ITEM MASTER completo).
"""
import sys
import json
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
HOJA = "MASTER_ITEM"
COLUMNAS = [
    "COD_ITEM",
    "DESCRIPCION",
    "MACROCATEGORIA",
    "CATEGORIA",
    "SUBCATEGORIA",
    "FECHA_CREACION",
]

if len(sys.argv) > 1:
    origen = Path(sys.argv[1])
else:
    ligero = BASE_DIR / "data" / "catalogo.xlsx"
    completo = BASE_DIR / "data" / "ITEM MASTER ORIGINAL - Copia.xlsx"
    origen = ligero if ligero.exists() else completo

destino = BASE_DIR / "docs" / "catalogo.json"
destino.parent.mkdir(parents=True, exist_ok=True)

if not origen.exists():
    sys.exit(f"No se encontró el archivo de origen: {origen}")

print(f"Leyendo {origen} ...")
df = pd.read_excel(origen, sheet_name=HOJA, engine="openpyxl")
df.columns = df.columns.astype(str).str.strip()

presentes = [c for c in COLUMNAS if c in df.columns]
faltantes = [c for c in COLUMNAS if c not in df.columns]
if faltantes:
    print(f"Aviso: columnas no encontradas y omitidas: {faltantes}")

df = df[presentes].copy()

# Normalizar texto
for col in ["COD_ITEM", "DESCRIPCION", "MACROCATEGORIA", "CATEGORIA", "SUBCATEGORIA"]:
    if col in df.columns:
        df[col] = df[col].fillna("").astype(str).str.strip()


def normalizar_sku(valor):
    texto = str(valor).strip()
    if texto.endswith(".0") and texto[:-2].isdigit():
        texto = texto[:-2]
    return texto


if "COD_ITEM" in df.columns:
    df["COD_ITEM"] = df["COD_ITEM"].apply(normalizar_sku)

# Fecha -> ISO (YYYY-MM-DD) para poder derivar año/mes/día en el navegador
if "FECHA_CREACION" in df.columns:
    fechas = pd.to_datetime(df["FECHA_CREACION"], errors="coerce")
    df["FECHA_CREACION"] = fechas.dt.strftime("%Y-%m-%d").where(fechas.notna(), "")

# Formato compacto: en vez de repetir las claves en cada registro (que infla
# mucho el archivo con 100k+ filas), se guarda un arreglo de columnas y una
# matriz de filas. El navegador lo reconstruye a objetos al cargar.
columnas = presentes
filas = df[columnas].values.tolist()

payload = {"columns": columnas, "rows": filas}

with open(destino, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

mb = destino.stat().st_size / (1024 * 1024)
print(f"Generado {destino} ({len(filas):,} productos, {mb:.2f} MB)")
