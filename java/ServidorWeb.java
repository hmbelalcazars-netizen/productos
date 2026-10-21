import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

/**
 * Servidor web estático mínimo para servir la carpeta docs/ en local.
 *
 * Reemplaza a "python -m http.server": sirve los archivos del catálogo por
 * HTTP para que el navegador pueda hacer fetch(catalogo.json) (cosa que no
 * funciona abriendo index.html con doble clic por el protocolo file://).
 *
 * Usa com.sun.net.httpserver, incluido en el JDK, así que no necesita
 * librerías externas. Probado con Java 21.
 *
 * Uso:
 *   javac ServidorWeb.java
 *   java ServidorWeb [puerto] [carpeta]
 *
 * Por defecto: puerto 8899, carpeta ../docs (relativa a java/).
 */
public class ServidorWeb {

    public static void main(String[] args) throws Exception {
        int puerto = (args.length > 0) ? Integer.parseInt(args[0]) : 8899;

        Path raiz;
        if (args.length > 1) {
            raiz = Paths.get(args[1]).toAbsolutePath().normalize();
        } else {
            raiz = Paths.get(System.getProperty("user.dir"))
                    .resolve("..").resolve("docs").toAbsolutePath().normalize();
        }

        if (!Files.isDirectory(raiz)) {
            System.err.println("No existe la carpeta a servir: " + raiz);
            System.exit(1);
        }

        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", puerto), 0);
        server.createContext("/", ex -> atender(ex, raiz));
        server.setExecutor(null);
        server.start();

        System.out.println("Sirviendo " + raiz);
        System.out.println("Abre: http://127.0.0.1:" + puerto + "/");
        System.out.println("(Deja esta ventana abierta. Ciérrala para apagar el servidor.)");
    }

    static void atender(HttpExchange ex, Path raiz) throws IOException {
        try {
            if (!"GET".equalsIgnoreCase(ex.getRequestMethod())
                    && !"HEAD".equalsIgnoreCase(ex.getRequestMethod())) {
                ex.sendResponseHeaders(405, -1);
                return;
            }

            String ruta = ex.getRequestURI().getPath();
            if (ruta.equals("/")) ruta = "/index.html";

            // Resolver el archivo pedido y bloquear cualquier salida de la raíz
            // (defensa contra path traversal tipo ../).
            Path archivo = raiz.resolve(ruta.substring(1)).normalize();
            if (!archivo.startsWith(raiz) || !Files.isRegularFile(archivo)) {
                byte[] msg = "404 Not Found".getBytes();
                ex.sendResponseHeaders(404, msg.length);
                try (OutputStream os = ex.getResponseBody()) { os.write(msg); }
                return;
            }

            ex.getResponseHeaders().set("Content-Type", tipoMime(archivo));
            long tam = Files.size(archivo);

            if ("HEAD".equalsIgnoreCase(ex.getRequestMethod())) {
                ex.sendResponseHeaders(200, -1);
                ex.close();
                return;
            }

            ex.sendResponseHeaders(200, tam);
            try (OutputStream os = ex.getResponseBody()) {
                Files.copy(archivo, os);
            }
        } catch (IOException e) {
            ex.sendResponseHeaders(500, -1);
        } finally {
            ex.close();
        }
    }

    static String tipoMime(Path archivo) {
        String n = archivo.getFileName().toString().toLowerCase();
        if (n.endsWith(".html")) return "text/html; charset=utf-8";
        if (n.endsWith(".css"))  return "text/css; charset=utf-8";
        if (n.endsWith(".js"))   return "application/javascript; charset=utf-8";
        if (n.endsWith(".json")) return "application/json; charset=utf-8";
        if (n.endsWith(".png"))  return "image/png";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".svg"))  return "image/svg+xml";
        if (n.endsWith(".ico"))  return "image/x-icon";
        return "application/octet-stream";
    }
}
