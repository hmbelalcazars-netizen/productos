# ============================================================
# Dashboard Catálogo de Productos (Streamlit)
# ============================================================
FROM python:3.12-slim

# Evita archivos .pyc y fuerza logs sin buffer
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencias del sistema necesarias para Pillow (JPEG/PNG) y openpyxl
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libjpeg62-turbo \
        zlib1g \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python primero (mejor cacheo de capas)
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Copiar el resto del proyecto (incluye data/ con el Excel y assets/)
COPY . .

# La app sirve en el 8501
EXPOSE 8501

# Comprobación de salud del servidor Streamlit
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl --fail http://localhost:8501/_stcore/health || exit 1

# Arranque
CMD ["streamlit", "run", "app.py", \
     "--server.port=8501", \
     "--server.address=0.0.0.0", \
     "--server.headless=true"]
