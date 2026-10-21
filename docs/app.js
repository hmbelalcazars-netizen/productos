/* =========================================================
   Catálogo de Productos — versión web (HTML + JavaScript)
   Equivalente a la app Streamlit original (app.py).
   ========================================================= */

// ----------------------- Configuración -----------------------
const API_IMAGENES_BASE = "https://api.corporaciongpf.com/fotos/fybeca/";
const MAX_IMAGENES_ADICIONALES = 2;   // SKU_2, SKU_3
const MAX_RESULTADOS_CATALOGO = 60;   // tarjetas visibles por página
const MAX_FILAS_TABLA = 500;          // filas de tabla por página

const MESES = {
    Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
    Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

// ----------------------- Estado -----------------------
let PRODUCTOS = [];      // todos los productos (objetos)
let filtrados = [];      // resultado tras aplicar filtros + dedupe
let vistaActual = "catalogo";
let limiteVisible = MAX_RESULTADOS_CATALOGO;

// ----------------------- Utilidades -----------------------
const $ = (sel) => document.querySelector(sel);

function normalizarSku(valor) {
    if (valor === null || valor === undefined) return "";
    let texto = String(valor).trim();
    if (texto.endsWith(".0") && /^\d+$/.test(texto.slice(0, -2))) {
        texto = texto.slice(0, -2);
    }
    return texto;
}

function urlImagenSku(sku, sufijo = "") {
    sku = normalizarSku(sku);
    if (!sku) return "";
    return `${API_IMAGENES_BASE}${sku}${sufijo}.jpg`;
}

function urlsCandidatasSku(sku) {
    sku = normalizarSku(sku);
    if (!sku) return [];
    const urls = [urlImagenSku(sku)];
    for (let n = 2; n < MAX_IMAGENES_ADICIONALES + 2; n++) {
        urls.push(urlImagenSku(sku, `_${n}`));
    }
    return urls;
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

// ----------------------- Carga de datos -----------------------
async function cargarDatos() {
    const estado = $("#estado-carga");
    try {
        const resp = await fetch("catalogo.json");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        const cols = data.columns;
        const idx = Object.fromEntries(cols.map((c, i) => [c, i]));

        PRODUCTOS = data.rows.map((fila) => {
            const sku = normalizarSku(fila[idx.COD_ITEM]);
            const fechaStr = fila[idx.FECHA_CREACION] || "";
            let anio = null, mes = null, dia = null;
            if (fechaStr) {
                const [a, m, d] = fechaStr.split("-").map(Number);
                anio = a || null; mes = m || null; dia = d || null;
            }
            return {
                cod: sku,
                descripcion: fila[idx.DESCRIPCION] || "",
                macro: fila[idx.MACROCATEGORIA] || "",
                categoria: fila[idx.CATEGORIA] || "",
                subcategoria: fila[idx.SUBCATEGORIA] || "",
                fecha: fechaStr,
                anio, mes, dia,
                imagenes: urlsCandidatasSku(sku),
            };
        });

        inicializarInterfaz();
        estado.classList.add("oculto");
        $("#app").classList.remove("oculto");
        $("#badge-total").textContent = `${PRODUCTOS.length.toLocaleString("es")} productos`;

        // Badge con el rango de años cubierto por el catálogo
        const aniosValidos = PRODUCTOS.map((p) => p.anio).filter(Boolean);
        if (aniosValidos.length) {
            const min = Math.min(...aniosValidos);
            const max = Math.max(...aniosValidos);
            const badgeImg = $("#badge-img");
            badgeImg.textContent = min === max ? `Año ${min}` : `${min} – ${max}`;
            badgeImg.classList.remove("oculto");
        }
    } catch (err) {
        estado.innerHTML =
            `No fue posible cargar el catálogo (<code>catalogo.json</code>).<br>` +
            `Detalle: ${escaparHtml(err.message)}.<br><br>` +
            `Abre la aplicación con el lanzador <code>Abrir Catalogo.bat</code>. ` +
            `No funciona abriendo <code>index.html</code> con doble clic, porque el ` +
            `navegador bloquea la lectura del catálogo por seguridad.`;
    }
}

// ----------------------- Opciones de filtros -----------------------
function opcionesUnicas(campo) {
    const set = new Set();
    for (const p of PRODUCTOS) {
        const v = (p[campo] || "").trim();
        if (v) set.add(v);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function llenarSelect(sel, opciones, etiquetaTodas) {
    sel.innerHTML = "";
    const optTodas = document.createElement("option");
    optTodas.value = "";
    optTodas.textContent = etiquetaTodas;
    sel.appendChild(optTodas);
    for (const o of opciones) {
        const opt = document.createElement("option");
        opt.value = String(o);
        opt.textContent = String(o);
        sel.appendChild(opt);
    }
}

function inicializarInterfaz() {
    llenarSelect($("#f-macro"), opcionesUnicas("macro"), "Todas");
    llenarSelect($("#f-categoria"), opcionesUnicas("categoria"), "Todas");
    llenarSelect($("#f-subcategoria"), opcionesUnicas("subcategoria"), "Todas");

    const anios = [...new Set(PRODUCTOS.map((p) => p.anio).filter(Boolean))]
        .sort((a, b) => b - a);
    llenarSelect($("#f-anio"), anios, "Todos");

    llenarSelect($("#f-mes"), Object.keys(MESES), "Todos");
    llenarSelect($("#f-dia"), Array.from({ length: 31 }, (_, i) => i + 1), "Todos");

    // Eventos
    $("#buscar").addEventListener("input", debounce(aplicarFiltros, 250));
    ["#f-macro", "#f-categoria", "#f-subcategoria", "#f-anio", "#f-mes", "#f-dia"]
        .forEach((s) => $(s).addEventListener("change", aplicarFiltros));

    $("#btn-limpiar").addEventListener("click", limpiarFiltros);
    $("#btn-exportar").addEventListener("click", exportarExcel);
    $("#btn-mas").addEventListener("click", () => {
        limiteVisible += (vistaActual === "catalogo" ? MAX_RESULTADOS_CATALOGO : MAX_FILAS_TABLA);
        render();
    });

    document.querySelectorAll(".btn-vista").forEach((b) => {
        b.addEventListener("click", () => cambiarVista(b.dataset.vista));
    });

    // Modal
    document.querySelectorAll("[data-cerrar]").forEach((el) =>
        el.addEventListener("click", cerrarModal));
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") cerrarModal();
    });

    aplicarFiltros();
}

function debounce(fn, ms) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

// ----------------------- Filtros + dedupe -----------------------
function aplicarFiltros() {
    const texto = $("#buscar").value.trim().toLowerCase();
    const macro = $("#f-macro").value;
    const categoria = $("#f-categoria").value;
    const subcategoria = $("#f-subcategoria").value;
    const anio = $("#f-anio").value;
    const mesNombre = $("#f-mes").value;
    const dia = $("#f-dia").value;
    const mes = mesNombre ? MESES[mesNombre] : null;

    let res = PRODUCTOS.filter((p) => {
        if (texto) {
            const coincide =
                p.cod.toLowerCase().includes(texto) ||
                p.descripcion.toLowerCase().includes(texto);
            if (!coincide) return false;
        }
        if (macro && p.macro !== macro) return false;
        if (categoria && p.categoria !== categoria) return false;
        if (subcategoria && p.subcategoria !== subcategoria) return false;
        if (anio && p.anio !== Number(anio)) return false;
        if (mes && p.mes !== mes) return false;
        if (dia && p.dia !== Number(dia)) return false;
        return true;
    });

    res = deduplicar(res);

    filtrados = res;
    limiteVisible = (vistaActual === "catalogo" ? MAX_RESULTADOS_CATALOGO : MAX_FILAS_TABLA);
    render();
}

// Prefiere la presentación SUELTA sobre CAJA cuando comparten nombre base.
function deduplicar(lista) {
    const nombreBase = (desc) =>
        String(desc).toUpperCase().replace(/\b(CAJA|SUELTA)\b/g, "").split(/\s+/).join(" ").trim();
    const prioridad = (desc) => {
        const t = String(desc).toUpperCase();
        if (t.includes("SUELTA")) return 1;
        if (t.includes("CAJA")) return 2;
        return 3;
    };

    const mejores = new Map();
    for (const p of lista) {
        const base = nombreBase(p.descripcion);
        const actual = mejores.get(base);
        if (!actual || prioridad(p.descripcion) < prioridad(actual.descripcion)) {
            mejores.set(base, p);
        }
    }
    // Mantener un orden estable por nombre base
    return [...mejores.values()].sort((a, b) =>
        a.descripcion.localeCompare(b.descripcion, "es"));
}

function limpiarFiltros() {
    $("#buscar").value = "";
    ["#f-macro", "#f-categoria", "#f-subcategoria", "#f-anio", "#f-mes", "#f-dia"]
        .forEach((s) => ($(s).value = ""));
    aplicarFiltros();
}

// ----------------------- Render -----------------------
function cambiarVista(vista) {
    vistaActual = vista;
    document.querySelectorAll(".btn-vista").forEach((b) =>
        b.classList.toggle("activa", b.dataset.vista === vista));
    limiteVisible = (vista === "catalogo" ? MAX_RESULTADOS_CATALOGO : MAX_FILAS_TABLA);
    render();
}

function render() {
    const total = filtrados.length;
    $("#contador-resultados").textContent =
        `📋 Resultados (${total.toLocaleString("es")} productos)`;

    const esCatalogo = vistaActual === "catalogo";
    $("#vista-catalogo").classList.toggle("oculto", !esCatalogo);
    $("#vista-tabla").classList.toggle("oculto", esCatalogo);

    if (esCatalogo) renderCatalogo();
    else renderTabla();

    // Aviso de límite + botón "mostrar más"
    const aviso = $("#aviso-limite");
    const paginacion = $("#paginacion");
    if (total > limiteVisible) {
        aviso.textContent =
            `Se encontraron ${total.toLocaleString("es")} productos. ` +
            `Se muestran los primeros ${limiteVisible.toLocaleString("es")}.`;
        aviso.classList.remove("oculto");
        paginacion.classList.remove("oculto");
    } else {
        aviso.classList.add("oculto");
        paginacion.classList.add("oculto");
    }
}

function renderCatalogo() {
    const cont = $("#vista-catalogo");
    cont.innerHTML = "";

    if (filtrados.length === 0) {
        cont.innerHTML = `<p class="aviso">No existen productos con los filtros seleccionados.</p>`;
        return;
    }

    const datos = filtrados.slice(0, limiteVisible);
    const frag = document.createDocumentFragment();

    for (const p of datos) {
        const card = document.createElement("div");
        card.className = "producto-card";

        const urlPrincipal = p.imagenes[0] || "";
        const sub = p.subcategoria ? ` · ${escaparHtml(p.subcategoria)}` : "";

        card.innerHTML = `
            <div class="producto-img-wrap">
                ${urlPrincipal
                    ? `<img loading="lazy" src="${urlPrincipal}" alt="${escaparHtml(p.descripcion)}"
                         onerror="this.parentNode.innerHTML='<div class=&quot;sin-imagen&quot;>📷 Sin imagen</div>'">`
                    : `<div class="sin-imagen">📷 Sin imagen</div>`}
            </div>
            <button class="btn-galeria" type="button">🖼️ Ver galería</button>
            <div class="producto-sku">Código: ${escaparHtml(p.cod)}</div>
            <div class="producto-titulo">${escaparHtml(p.descripcion)}</div>
            <div class="producto-categoria">${escaparHtml(p.categoria)}${sub}</div>
        `;
        card.querySelector(".btn-galeria").addEventListener("click", () => abrirGaleria(p));
        frag.appendChild(card);
    }
    cont.appendChild(frag);
}

function renderTabla() {
    const body = $("#tabla-body");
    body.innerHTML = "";

    if (filtrados.length === 0) {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--gris-texto)">
            No existen productos con los filtros seleccionados.</td></tr>`;
        return;
    }

    const datos = filtrados.slice(0, limiteVisible);
    const frag = document.createDocumentFragment();

    for (const p of datos) {
        const url = p.imagenes[0] || "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escaparHtml(p.cod)}</td>
            <td>${escaparHtml(p.descripcion)}</td>
            <td>${escaparHtml(p.macro)}</td>
            <td>${escaparHtml(p.categoria)}</td>
            <td>${escaparHtml(p.subcategoria)}</td>
            <td>${escaparHtml(p.fecha)}</td>
            <td>${url ? `<a href="${url}" target="_blank" rel="noopener">🔗 Ver</a>` : "—"}</td>
            <td>${url
                ? `<img class="mini" loading="lazy" src="${url}" alt=""
                     onerror="this.replaceWith(document.createTextNode('—'))">`
                : "—"}</td>
        `;
        frag.appendChild(tr);
    }
    body.appendChild(frag);
}

// ----------------------- Galería (modal) -----------------------
function abrirGaleria(p) {
    const cont = $("#modal-galeria");
    $("#modal-titulo").textContent = `${p.descripcion} · ${p.cod}`;
    cont.innerHTML = "";

    for (const url of p.imagenes) {
        const img = document.createElement("img");
        img.loading = "lazy";
        img.src = url;
        img.alt = p.descripcion;
        img.onerror = () => img.remove();
        cont.appendChild(img);
    }

    // Mensaje si al final ninguna imagen existe
    setTimeout(() => {
        if (!cont.querySelector("img")) {
            cont.innerHTML = `<p class="aviso" style="grid-column:1/-1">Este producto no tiene imágenes disponibles.</p>`;
        }
    }, 1500);

    $("#modal").classList.remove("oculto");
}

function cerrarModal() {
    $("#modal").classList.add("oculto");
}

// ----------------------- Exportar a Excel -----------------------
function exportarExcel() {
    if (typeof XLSX === "undefined") {
        alert("La librería de exportación aún se está cargando. Intenta de nuevo en un momento.");
        return;
    }
    if (filtrados.length === 0) {
        alert("No hay productos para exportar con los filtros actuales.");
        return;
    }

    const encabezados = [
        "Código", "Producto", "Macrocategoría", "Categoría",
        "Subcategoría", "Fecha de creación", "URL de imagen",
    ];
    const filas = filtrados.map((p) => [
        p.cod, p.descripcion, p.macro, p.categoria,
        p.subcategoria, p.fecha, p.imagenes[0] || "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
    ws["!cols"] = [
        { wch: 14 }, { wch: 44 }, { wch: 22 }, { wch: 24 },
        { wch: 28 }, { wch: 16 }, { wch: 46 },
    ];
    // Convertir la columna URL en hipervínculos
    const colURL = 6; // índice 0-based (G)
    for (let r = 1; r <= filas.length; r++) {
        const url = filas[r - 1][colURL];
        if (url) {
            const ref = XLSX.utils.encode_cell({ r, c: colURL });
            ws[ref].l = { Target: url, Tooltip: "Abrir imagen" };
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catálogo");

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `catalogo_${fecha}.xlsx`);
}

// ----------------------- Inicio -----------------------
document.addEventListener("DOMContentLoaded", cargarDatos);
