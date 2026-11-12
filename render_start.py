import base64
import binascii
from hmac import compare_digest
import os
from urllib.parse import urlsplit

from servidor import Handler, SCHEMA, ThreadingHTTPServer, connect
import whatsapp

def config():
    user = os.environ.get('CRM_USUARIO', '')
    password = os.environ.get('CRM_CLAVE', '')
    origin = os.environ.get('RENDER_EXTERNAL_URL', '').rstrip('/')
    url = urlsplit(origin)
    if not user or ':' in user or not user.isascii() or len(password) < 16:
        raise SystemExit('Configura CRM_USUARIO (ASCII, sin dos puntos) y CRM_CLAVE (16 caracteres o más).')
    if url.scheme != 'https' or not url.hostname or url.path or url.query or url.fragment or url.username:
        raise SystemExit('Se requiere una URL HTTPS válida en RENDER_EXTERNAL_URL.')
    return origin, (user + ':' + password).encode('utf-8')

class RenderHandler(Handler):
    def log_message(self, format, *args):
        if self.path.startswith(whatsapp.PATH):
            return
        super().log_message(format, *args)

    def authorized(self):
        scheme, _, token = self.headers.get('Authorization', '').partition(' ')
        if scheme.lower() == 'basic':
            try:
                if compare_digest(base64.b64decode(token, validate=True), self.credentials):
                    return True
            except (ValueError, binascii.Error):
                pass
        self.send_response(401)
        self.send_header('WWW-Authenticate', 'Basic realm="CRM Von Braun", charset="UTF-8"')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', '0')
        self.end_headers()
        return False

    def do_GET(self):
        route = urlsplit(self.path)
        if route.path == whatsapp.PATH:
            whatsapp.verify(self, route.query)
            return
        if self.path == '/salud':
            self.send(200, {'ok': True})
        elif self.authorized():
            if self.path == '/api/whatsapp':
                whatsapp.inbox(self)
            elif self.path == whatsapp.CAPTURE_PATH:
                whatsapp.diagnostic(self)
            else:
                super().do_GET()

    def do_POST(self):
        if self.path == whatsapp.PATH:
            whatsapp.receive(self)
            return
        if not self.authorized():
            return
        if self.headers.get('Origin') != self.origin or self.headers.get_content_type() != 'application/json':
            self.send(403, {'error': 'Solicitud de escritura no permitida.'})
            return
        super().do_POST()

if __name__ == '__main__':
    RenderHandler.origin, RenderHandler.credentials = config()
    RenderHandler.allowed_origins = (RenderHandler.origin,)
    with connect() as db:
        db.executescript(SCHEMA.read_text(encoding='utf-8'))
    ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', '10000'))), RenderHandler).serve_forever()
