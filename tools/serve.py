#!/usr/bin/env python3
"""Dev server for app/ with caching off (python3 tools/serve.py [port])."""
import http.server, functools, sys, os
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8480
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app')
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory=root)).serve_forever()
