import os
import socket
from http.server import SimpleHTTPRequestHandler, HTTPServer

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
HTML_PORT = 8080

class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True
    def handle_error(self, request, client_address):
        # Silently ignore Chrome's broken pipe errors on idle connections
        if isinstance(request, socket.timeout) or 'BrokenPipeError' in str(type(request)):
            return
        super().handle_error(request, client_address)

def start_http():
    os.chdir(DIRECTORY)
    server = ReusableHTTPServer(("0.0.0.0", HTML_PORT), SimpleHTTPRequestHandler)
    server.serve_forever()

if __name__ == "__main__":
    print(f"Air-Touch CAD running. Open http://localhost:{HTML_PORT}")
    start_http()
