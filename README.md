# Dashboard Catálogo de Productos

Dashboard web (Streamlit) que lee el catálogo desde un archivo Excel y cruza
las imágenes de cada producto por SKU contra el API público de imágenes:

```
https://api.corporaciongpf.com/fotos/fybeca/{SKU}.jpg
```

No requiere credenciales: el API de imágenes es público.

## Estructura relevante

```
app.py                 Aplicación principal (Streamlit)
requirements.txt       Dependencias (versiones fijas)
data/                  Excel del catálogo (viaja con el proyecto)
assets/                Logos y estilos (reserva de marca)
.streamlit/config.toml Configuración del servidor Streamlit
Dockerfile             Imagen de despliegue
docker-compose.yml     Orquestación de 1 servicio
```

> Importante: una app Streamlit **no es un sitio HTML estático**. Se ejecuta
> como un servicio (`streamlit run`) que escucha en un puerto. El "index" es
> la propia aplicación servida en `/`.

## El archivo Excel

El ITEM MASTER original pesa ~88 MB (demasiado para GitHub). Por eso en el
repositorio viaja **`data/catalogo.xlsx`**, una versión liviana (~4-5 MB) que
contiene solo las 6 columnas que usa el dashboard.

El dashboard resuelve la ruta del Excel en este orden:

1. Variable de entorno `ARCHIVO_EXCEL` (recomendado en servidor/Docker).
2. `data/catalogo.xlsx` (versión liviana que viaja en el repositorio).
3. `data/ITEM MASTER ORIGINAL - Copia.xlsx` (archivo completo, si está).
4. (Solo desarrollo local en Windows) la carpeta OneDrive del usuario.

### Actualizar los datos

Cuando cambie el ITEM MASTER, regenera el Excel liviano:

```powershell
python generar_catalogo.py "ruta\al\ITEM MASTER ORIGINAL.xlsx"
```

Esto reescribe `data/catalogo.xlsx`. Luego haz commit y push (o reconstruye
la imagen Docker).

La hoja leída es `MASTER_ITEM` y debe contener las columnas:
`COD_ITEM`, `DESCRIPCION`, `MACROCATEGORIA`, `CATEGORIA`, `SUBCATEGORIA`,
`FECHA_CREACION`.

## Ejecución local (desarrollo)

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m streamlit run app.py
```

Abre http://localhost:8501

## Despliegue con Docker (recomendado)

Requiere Docker instalado en el servidor.

```bash
# Construir y arrancar
docker compose up -d --build

# Ver estado y logs
docker compose ps
docker compose logs -f

# Detener
docker compose down
```

La app queda en `http://<ip-del-servidor>:8501`.

### Sin docker-compose (solo Docker)

```bash
docker build -t dashboard-catalogo .
docker run -d --name dashboard-catalogo -p 8501:8501 --restart unless-stopped dashboard-catalogo
```

## Publicar en el puerto 80 / HTTPS

Para servir en el puerto 80 (o 443 con TLS), coloca un proxy inverso
(nginx, Traefik o Caddy) delante del contenedor y reenvía al `8501`.
Ejemplo mínimo de nginx:

```nginx
server {
    listen 80;
    server_name catalogo.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:8501;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Streamlit usa WebSockets, por eso son necesarias las cabeceras `Upgrade` y
`Connection`.

## Requisitos de red

El servidor debe poder llegar por HTTPS a `api.corporaciongpf.com` para
descargar las imágenes de los productos.

## Seguridad

- El dashboard no usa credenciales: el API de imágenes es público. El antiguo
  `.streamlit/secrets.toml` con credenciales WebDAV fue eliminado. Si en el
  futuro agregas secretos, ese archivo está excluido vía `.gitignore` /
  `.dockerignore`.
