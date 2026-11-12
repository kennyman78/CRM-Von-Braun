from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import sqlite3
import uuid

ROOT = Path(__file__).resolve().parent
SCHEMA = ROOT / 'modelo.sql'
TABLES = {
    'contactos': ('nombre', 'telefono', 'tipo', 'etapa'),
    'etapas': ('nombre',),
    'pestanas': ('nombre', 'detalle'),
    'asignaciones': ('contacto', 'pestana'),
    'notas': ('contacto', 'tema', 'texto'),
    'recordatorios': ('contacto', 'tema', 'fecha'),
    'cronograma': ('contacto', 'texto', 'fecha'),
    'respuestas': ('nombre', 'texto'),
    'campanas': ('nombre', 'texto', 'fecha'),
    'destinatarios': ('campana', 'contacto'),
    'flujos': ('nombre', 'clave', 'coincidencia', 'texto', 'opciones'),
    'ia': ('nombre', 'modelo', 'contexto', 'instrucciones'),
}

@contextmanager
def connect():
    db = sqlite3.connect(ROOT / 'crm.sqlite3')
    try:
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys = ON')
        with db:
            yield db
    finally:
        db.close()

class Handler(BaseHTTPRequestHandler):
    allowed_origins = (None, 'http://127.0.0.1:8765', 'http://localhost:8765')
    def send(self, status, payload, content_type='application/json; charset=utf-8'):
        data = payload if isinstance(payload, bytes) else json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == '/api/datos':
            with connect() as db:
                self.send(200, {table: [dict(row) for row in db.execute(f'SELECT * FROM {table} ORDER BY rowid')] for table in TABLES})
            return
        assets = {'/': ('index.html', 'text/html'), '/app.js': ('app.js', 'text/javascript'), '/estilo.css': ('estilo.css', 'text/css')}
        if self.path in assets:
            name, mime = assets[self.path]
            self.send(200, (ROOT / name).read_bytes(), mime + '; charset=utf-8')
        else:
            self.send(404, {'error': 'Ruta desconocida'})

    def do_POST(self):
        if self.headers.get('Origin') not in self.allowed_origins:
            self.send(403, {'error': 'Origen no permitido'})
            return
        table = self.path.removeprefix('/api/')
        if not self.path.startswith('/api/') or table not in TABLES:
            self.send(404, {'error': 'Módulo desconocido'})
            return
        try:
            size = int(self.headers.get('Content-Length', 0))
            if not 0 < size <= 200_000:
                raise ValueError()
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError()
            key = data.get('id') or str(uuid.uuid4())
            if not isinstance(key, str):
                raise ValueError()
            fields = TABLES[table]
            with connect() as db:
                if data.get('borrar') is True:
                    db.execute(f'DELETE FROM {table} WHERE id = ?', (key,))
                else:
                    values = [data.get(field) or None for field in fields]
                    if any(value is not None and not isinstance(value, str) for value in values):
                        raise ValueError()
                    columns = ', '.join(('id', *fields))
                    marks = ', '.join('?' for _ in range(len(fields) + 1))
                    updates = ', '.join(f'{field}=excluded.{field}' for field in fields)
                    db.execute(f'INSERT INTO {table} ({columns}) VALUES ({marks}) ON CONFLICT(id) DO UPDATE SET {updates}', (key, *values))
            self.send(200, {'id': key})
        except (ValueError, sqlite3.IntegrityError):
            self.send(400, {'error': 'Revisa los campos obligatorios y los datos relacionados.'})

if __name__ == '__main__':
    with connect() as db:
        db.executescript(SCHEMA.read_text(encoding='utf-8'))
    print('CRM Von Braun — http://127.0.0.1:8765', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()

