import asyncio
import websockets
import threading
import socket
from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

# Dynamically get the directory where this script is located
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
HTML_PORT = 8080
WS_PORT = 8081

class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True
    # SILENCE THE BROKEN PIPE ERROR PERMANENTLY
    def handle_error(self, request, client_address):
        if isinstance(request, socket.timeout) or 'BrokenPipeError' in str(type(request)):
            return # Ignore Chrome closing idle connections
        super().handle_error(request, client_address)

async def handler(websocket):
    print("3D Hybrid Engine connected!")
    async for message in websocket:
        pass

async def ws_main():
    async with websockets.serve(handler, "localhost", WS_PORT, reuse_address=True):
        await asyncio.Future()

def start_http():
    os.chdir(DIRECTORY)
    server = ReusableHTTPServer(("0.0.0.0", HTML_PORT), SimpleHTTPRequestHandler)
    server.serve_forever()

if __name__ == "__main__":
    threading.Thread(target=start_http, daemon=True).start()
    print(f"Open http://localhost:{HTML_PORT} on your phone.")
    asyncio.run(ws_main())
