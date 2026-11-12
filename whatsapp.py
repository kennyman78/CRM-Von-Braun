from hashlib import sha256
from hmac import compare_digest, digest
import json
import os
from urllib.parse import parse_qs

from servidor import connect

PATH = '/webhook/whatsapp'

def settings():
    return tuple(os.environ.get(key, '') for key in (
        'WA_VERIFY_TOKEN', 'WA_APP_SECRET', 'WA_PHONE_NUMBER_ID', 'WA_TEST_SENDER'
    ))

def verify(handler, query):
    token, secret, phone_id, sender = settings()
    if not all((token, secret, phone_id, sender)):
        handler.send(503, {'error': 'Webhook sin configurar'})
        return
    params = parse_qs(query)
    mode = params.get('hub.mode', [''])[0]
    candidate = params.get('hub.verify_token', [''])[0]
    challenge = params.get('hub.challenge', [''])[0]
    if mode == 'subscribe' and challenge.isascii() and challenge.isdigit() and compare_digest(candidate.encode(), token.encode()):
        handler.send(200, challenge.encode(), 'text/plain; charset=utf-8')
    else:
        handler.send(403, {'error': 'Verificación rechazada'})

def messages(payload, phone_id, sender):
    if payload.get('object') != 'whatsapp_business_account':
        return
    for entry in payload.get('entry', []):
        for change in entry.get('changes', []):
            value = change.get('value', {})
            if change.get('field') != 'messages' or value.get('metadata', {}).get('phone_number_id') != phone_id:
                continue
            for message in value.get('messages', []):
                if message.get('from') != sender or message.get('type') != 'text':
                    continue
                record = (message.get('id'), sender, message.get('timestamp'), message.get('text', {}).get('body'))
                if all(isinstance(field, str) and field for field in record):
                    yield record

def receive(handler):
    token, secret, phone_id, sender = settings()
    if not all((token, secret, phone_id, sender)):
        print('WhatsApp webhook: configuración incompleta', flush=True)
        handler.send(503, {'error': 'Webhook sin configurar'})
        return
    try:
        size = int(handler.headers.get('Content-Length', '0'))
    except ValueError:
        size = 0
    if not 0 < size <= 1_000_000:
        print('WhatsApp webhook: tamaño inválido', flush=True)
        handler.send(400, {'error': 'Tamaño inválido'})
        return
    body = handler.rfile.read(size)
    expected = 'sha256=' + digest(secret.encode(), body, sha256).hex()
    signature = handler.headers.get('X-Hub-Signature-256', '')
    if not compare_digest(signature.encode(), expected.encode()):
        if not signature:
            reason = 'encabezado ausente'
        elif len(signature) != 71 or not signature.startswith('sha256='):
            reason = 'formato inesperado'
        else:
            reason = 'HMAC no coincide'
        encoding = handler.headers.get('Content-Encoding', '').lower().strip()
        encoding = encoding if encoding in ('gzip', 'br', 'deflate', 'identity') else ('otro' if encoding else 'sin codificación')
        print(f'WhatsApp webhook: firma inválida ({reason}; {encoding}; bytes recibidos {len(body)}/{size})', flush=True)
        handler.send(403, {'error': 'Firma inválida'})
        return
    try:
        records = list(messages(json.loads(body), phone_id, sender))
    except (ValueError, TypeError, AttributeError):
        print('WhatsApp webhook: evento inválido', flush=True)
        handler.send(400, {'error': 'Evento inválido'})
        return
    if records:
        with connect() as db:
            db.executemany(
                'INSERT INTO whatsapp_entrantes(id, remitente, fecha, texto) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
                records,
            )
            inserted = db.total_changes
        print(f'WhatsApp webhook: {inserted} guardados, {len(records) - inserted} duplicados', flush=True)
    else:
        print('WhatsApp webhook: evento válido sin textos del número y remitente configurados', flush=True)
    handler.send(200, {'ok': True})

def inbox(handler):
    with connect() as db:
        rows = db.execute('SELECT remitente, fecha, texto FROM whatsapp_entrantes ORDER BY rowid DESC LIMIT 200')
        handler.send(200, {'configurado': all(settings()), 'mensajes': [dict(row) for row in rows]})

