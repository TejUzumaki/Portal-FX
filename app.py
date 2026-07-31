import os, socket
from http.server import SimpleHTTPRequestHandler, HTTPServer
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
HTML_PORT = 8080
class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True
    def handle_error(self, request, client_address):
        if isinstance(request, socket.timeout) or 'BrokenPipeError' in str(type(request)): return
        super().handle_error(request, client_address)
def start_http():
    os.chdir(DIRECTORY)
    ReusableHTTPServer(("0.0.0.0", HTML_PORT), SimpleHTTPRequestHandler).serve_forever()
if __name__ == "__main__":
    print(f"Portal FX running. Open http://localhost:{HTML_PORT}")
    start_http()
