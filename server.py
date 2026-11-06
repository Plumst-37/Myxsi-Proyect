import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Desactivar caché del navegador para asegurar sincronización en tiempo real
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

class MultiThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

with MultiThreadedServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
    print(f"Myxsi Web Server (Multi-Threaded) running at http://localhost:{PORT} with No-Cache headers")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
