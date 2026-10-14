"""
Genera data/catalogo.xlsx (versión liviana) a partir del ITEM MASTER completo.

El dashboard solo usa 6 columnas, pero el archivo original pesa ~88 MB
(demasiado para GitHub). Este script extrae esas columnas y produce un Excel
de pocos MB que sí puede viajar en el repositorio.

Uso:
    python generar_catalogo.py [ruta_al_item_master.xlsx]

Si no se pasa ruta, usa data/ITEM MASTER ORIGINAL - Copia.xlsx.
"""
import sys
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

origen = Path(sys.argv[1]) if len(sys.argv) > 1 else (
    BASE_DIR / "data" / "ITEM MASTER ORIGINAL - Copia.xlsx"
)
destino = BASE_DIR / "data" / "catalogo.xlsx"

if not origen.exists():
    sys.exit(f"No se encontró el archivo de origen: {origen}")

print(f"Leyendo {origen} ...")
df = pd.read_excel(origen, sheet_name=HOJA, engine="openpyxl")

presentes = [c for c in COLUMNAS if c in df.columns]
faltantes = [c for c in COLUMNAS if c not in df.columns]
if faltantes:
    print(f"Aviso: columnas no encontradas y omitidas: {faltantes}")

ligero = df[presentes].copy()
ligero.to_excel(destino, sheet_name=HOJA, index=False, engine="openpyxl")

mb = destino.stat().st_size / (1024 * 1024)
print(f"Generado {destino} ({len(ligero):,} filas, {mb:.2f} MB)")
