import java.io.BufferedWriter;
import java.io.InputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamReader;

/**
 * Equivalente en Java de generar_json.py.
 *
 * Lee el Excel del catálogo (hoja MASTER_ITEM, columnas COD_ITEM, DESCRIPCION,
 * MACROCATEGORIA, CATEGORIA, SUBCATEGORIA, FECHA_CREACION) y escribe
 * docs/catalogo.json en el mismo formato compacto { "columns": [...], "rows": [...] }.
 *
 * No usa librerías externas: un .xlsx es un ZIP con XML, y Java trae de serie
 * java.util.zip y javax.xml.stream para leerlo. Por eso compila y corre solo
 * con el JDK, sin Maven ni Gradle.
 *
 * Uso:
 *   javac GenerarJson.java
 *   java GenerarJson ["ruta\al\Excel.xlsx"]
 *
 * Si no se pasa ruta, usa ../data/catalogo.xlsx (y si no, el ITEM MASTER completo).
 */
public class GenerarJson {

    static final String[] COLUMNAS = {
        "COD_ITEM", "DESCRIPCION", "MACROCATEGORIA",
        "CATEGORIA", "SUBCATEGORIA", "FECHA_CREACION"
    };

    // El índice de columna FECHA_CREACION (0-based) para convertir su valor serial.
    static final int IDX_FECHA = 5;

    // Base de fechas de Excel: el serial 1 es 1900-01-01, pero Excel trata
    // (erróneamente) 1900 como bisiesto, por lo que el ancla real es 1899-12-30.
    static final LocalDate EPOCA_EXCEL = LocalDate.of(1899, 12, 30);

    public static void main(String[] args) throws Exception {
        Path base = Paths.get(System.getProperty("user.dir"));

        // Resolver el Excel de origen
        Path origen;
        if (args.length > 0) {
            origen = Paths.get(args[0]);
        } else {
            Path ligero = base.resolve("..").resolve("data").resolve("catalogo.xlsx").normalize();
            Path completo = base.resolve("..").resolve("data")
                    .resolve("ITEM MASTER ORIGINAL - Copia.xlsx").normalize();
            origen = Files.exists(ligero) ? ligero : completo;
        }

        if (!Files.exists(origen)) {
            System.err.println("No se encontró el archivo de origen: " + origen);
            System.exit(1);
        }

        Path destino = base.resolve("..").resolve("docs").resolve("catalogo.json").normalize();
        Files.createDirectories(destino.getParent());

        System.out.println("Leyendo " + origen + " ...");

        List<String[]> filas = leerFilas(origen);
        if (filas.isEmpty()) {
            System.err.println("El Excel no contiene filas de datos.");
            System.exit(1);
        }

        escribirJson(destino, filas);

        double mb = Files.size(destino) / (1024.0 * 1024.0);
        System.out.printf("Generado %s (%,d productos, %.2f MB)%n",
                destino, filas.size(), mb);
    }

    /**
     * Lee las filas de datos del Excel (sin encabezado) y devuelve, por cada
     * fila, un arreglo de 6 celdas ya normalizadas (SKU y fecha).
     */
    static List<String[]> leerFilas(Path xlsx) throws Exception {
        List<String[]> filas = new ArrayList<>();

        try (ZipFile zip = new ZipFile(xlsx.toFile())) {
            // La hoja de datos. openpyxl la guarda como sheet1.xml.
            ZipEntry hoja = zip.getEntry("xl/worksheets/sheet1.xml");
            if (hoja == null) {
                throw new IllegalStateException(
                        "No se encontró xl/worksheets/sheet1.xml en el Excel.");
            }

            XMLInputFactory factory = XMLInputFactory.newInstance();
            // Endurecer el parser frente a entidades externas (XXE).
            factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
            factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);

            try (InputStream in = zip.getInputStream(hoja)) {
                XMLStreamReader r = factory.createXMLStreamReader(in);

                String[] fila = null;   // celdas de la fila actual
                int colActual = -1;     // índice 0-based de la columna actual
                boolean esFecha = false;
                StringBuilder texto = null;
                int numeroFila = 0;

                while (r.hasNext()) {
                    int ev = r.next();

                    if (ev == XMLStreamConstants.START_ELEMENT) {
                        String tag = r.getLocalName();

                        if (tag.equals("row")) {
                            numeroFila++;
                            fila = new String[COLUMNAS.length];
                            for (int i = 0; i < fila.length; i++) fila[i] = "";

                        } else if (tag.equals("c") && fila != null) {
                            // Referencia tipo "B2" -> columna B -> índice 1
                            String ref = r.getAttributeValue(null, "r");
                            colActual = columnaDesdeRef(ref);
                            esFecha = (colActual == IDX_FECHA);

                        } else if ((tag.equals("t") || tag.equals("v")) && fila != null) {
                            texto = new StringBuilder();
                        }

                    } else if (ev == XMLStreamConstants.CHARACTERS && texto != null) {
                        texto.append(r.getText());

                    } else if (ev == XMLStreamConstants.END_ELEMENT) {
                        String tag = r.getLocalName();

                        if ((tag.equals("t") || tag.equals("v"))
                                && texto != null && fila != null
                                && colActual >= 0 && colActual < fila.length) {

                            String valor = texto.toString();
                            if (esFecha && tag.equals("v")) {
                                valor = serialAFecha(valor);
                            } else if (colActual == 0) {
                                valor = normalizarSku(valor);
                            } else {
                                valor = limpiar(valor);
                            }
                            fila[colActual] = valor;
                            texto = null;

                        } else if (tag.equals("row") && fila != null) {
                            // Saltar la fila de encabezado (la primera)
                            if (numeroFila > 1) {
                                filas.add(fila);
                            }
                            fila = null;
                        }
                    }
                }
                r.close();
            }
        }
        return filas;
    }

    /** Convierte la referencia de celda ("C12") al índice 0-based de columna. */
    static int columnaDesdeRef(String ref) {
        if (ref == null) return -1;
        int col = 0;
        for (int i = 0; i < ref.length(); i++) {
            char c = ref.charAt(i);
            if (c >= 'A' && c <= 'Z') {
                col = col * 26 + (c - 'A' + 1);
            } else {
                break;
            }
        }
        return col - 1;
    }

    /**
     * Recorta los extremos como lo hace pandas .str.strip(): además de los
     * espacios normales, elimina el espacio duro U+00A0 (non-breaking space),
     * que Java NO considera whitespace y por eso trim()/strip() no quitan.
     */
    static String limpiar(String valor) {
        if (valor == null) return "";
        int ini = 0, fin = valor.length();
        while (ini < fin && esEspacio(valor.charAt(ini))) ini++;
        while (fin > ini && esEspacio(valor.charAt(fin - 1))) fin--;
        return valor.substring(ini, fin);
    }

    static boolean esEspacio(char c) {
        return c == '\u00A0' || Character.isWhitespace(c);
    }

    /** Normaliza el SKU: quita un ".0" final cuando el resto son dígitos. */
    static String normalizarSku(String valor) {
        String t = limpiar(valor);
        if (t.endsWith(".0")) {
            String base = t.substring(0, t.length() - 2);
            if (!base.isEmpty() && base.chars().allMatch(Character::isDigit)) {
                t = base;
            }
        }
        return t;
    }

    /** Convierte el número serial de fecha de Excel a texto ISO (YYYY-MM-DD). */
    static String serialAFecha(String valor) {
        String t = valor.strip();
        if (t.isEmpty()) return "";
        try {
            // El serial puede venir como entero o con decimales (parte horaria).
            double d = Double.parseDouble(t);
            long dias = (long) Math.floor(d);
            LocalDate fecha = EPOCA_EXCEL.plusDays(dias);
            return fecha.toString(); // ISO-8601: YYYY-MM-DD
        } catch (NumberFormatException e) {
            return t; // si ya viniera como texto, se deja tal cual
        }
    }

    /** Escribe el JSON compacto { "columns": [...], "rows": [[...], ...] }. */
    static void escribirJson(Path destino, List<String[]> filas) throws Exception {
        try (BufferedWriter w = new BufferedWriter(new OutputStreamWriter(
                Files.newOutputStream(destino), StandardCharsets.UTF_8))) {

            w.write("{\"columns\":[");
            for (int i = 0; i < COLUMNAS.length; i++) {
                if (i > 0) w.write(",");
                w.write(encadenar(COLUMNAS[i]));
            }
            w.write("],\"rows\":[");

            for (int f = 0; f < filas.size(); f++) {
                if (f > 0) w.write(",");
                String[] fila = filas.get(f);
                w.write("[");
                for (int c = 0; c < fila.length; c++) {
                    if (c > 0) w.write(",");
                    w.write(encadenar(fila[c] == null ? "" : fila[c]));
                }
                w.write("]");
            }

            w.write("]}");
        }
    }

    /** Serializa una cadena como literal JSON con las escapes necesarias. */
    static String encadenar(String s) {
        StringBuilder sb = new StringBuilder(s.length() + 2);
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n");  break;
                case '\r': sb.append("\\r");  break;
                case '\t': sb.append("\\t");  break;
                default:
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        sb.append('"');
        return sb.toString();
    }
}
