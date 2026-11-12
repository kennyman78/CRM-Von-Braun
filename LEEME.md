# CRM web · IES Von Braun

## Inicio

Requiere Python 3.10 o posterior. Abra una terminal en esta carpeta y ejecute `python servidor.py`. Abra [el CRM en su navegador](http://127.0.0.1:8765). Para cerrar el servidor pulse Ctrl+C. SQLite crea `crm.sqlite3` junto al código en el primer arranque. La aplicación comienza con la base vacía y está configurada para el equipo local.

## Manual y pantallas

Referencia consultada: *Manual_CRM_Von_Braun.pdf*, versión 1.2, 56 páginas, copia de Descargas. Las 54 figuras son redibujos de los tutoriales. La navegación de la aplicación agrupa los procedimientos por tarea y usa una identidad tipográfica azul institucional con un monograma provisional.

| Manual | Pantallas y funciones locales | Integración o trabajo pendiente |
|---|---|---|
| M01, pp. 3–6 | Bandeja de fichas, pestañas Todo, Cara a cara, Grupos y personalizadas, asignación desde la ficha | Historial real, No leído y Esperando respuesta dependen de los eventos del canal |
| M02, pp. 7–9 | Cronograma por contacto, texto, fecha y hora | Adjuntos, acciones posteriores, ejecución programada |
| M03, pp. 10–15 | Notas con tema y texto, recordatorios en hora de Lima, listados y edición | Avisos emergentes y entrega de notificaciones |
| M04, pp. 16–20 | Respuestas de texto, copia e inserción en cronograma o campaña | Archivos y secuencias de mensajes |
| M05, pp. 21–26 | Campaña con texto, fecha prevista y destinatarios | Variantes, intervalos, acciones posteriores, ejecución y resultados del canal |
| M06, pp. 27–30 | Contactos locales con búsqueda y CSV compatible con Excel. Kanban con etapas configurables, arrastre y selector | Importación del canal y libro Excel con hojas por grupo |
| M07–M08, pp. 31–43 | Editor de palabras clave y vista de prueba local con coincidencia exacta o parcial, texto y opciones de lista | Archivos, demoras, recuento de ejecución, listas interactivas y atención automática |
| M09–M10, pp. 44–54 | Configuración local de modelo previsto, contexto e instrucciones | Proveedor IA, Sandbox, producción, clasificación y derivación. Las etiquetas del manual se aplicarán solo con un flujo aprobado |
| M11–M12, pp. 55–56 | Guía de operación y esta matriz | Validación en la cuenta de prueba y luego en la institucional |

El manual ofrece nombres de etapas como ejemplos. El tablero comienza sin etapas y «Sin etapa asignada» agrupa fichas cuyo vínculo es vacío. Los cambios en el tablero son seguimiento interno. Las matrículas y pagos requerirían una fuente institucional autorizada.

## Arquitectura y modelo de datos

El navegador renderiza la interfaz y llama a una API local. El servidor Python sirve los recursos y registra las operaciones en SQLite mediante transacciones, consultas parametrizadas y claves foráneas. El archivo `modelo.sql` es el esquema ejecutable.

- Una etapa agrupa varios contactos. Cada contacto puede tener una etapa o ninguna.
- Contactos y pestañas se vinculan mediante asignaciones únicas. Un contacto puede tener varias notas, recordatorios y preparaciones de mensajes.
- Campañas y contactos se vinculan mediante destinatarios únicos. Respuestas rápidas, flujos de palabras clave y configuraciones de IA son registros reutilizables.
- El borrado de una etapa desasigna sus contactos. El borrado de un contacto elimina sus notas, recordatorios, programaciones y vínculos. El borrado de una campaña o pestaña elimina sus vínculos.
- Las fechas ingresadas se interpretan como hora de Lima. La integración futura debe convertirlas a instantes con zona horaria antes de encolar envíos.

## Paso a operación institucional

Esta entrega sirve como prototipo navegable y como implementación local persistente. Una instalación compartida requiere autenticación, permisos, auditoría, copias de seguridad y un despliegue con HTTPS. Para conectar WhatsApp, se requiere que el instituto autorice su cuenta y número comercial, otorgue permisos a la aplicación y configure credenciales del servidor y un webhook. El adaptador deberá verificar eventos, deduplicarlos, aplicar las reglas de mensajería y plantillas de Meta y registrar resultados recibidos del canal. La programación y las campañas necesitan un proceso de ejecución con control de reintentos y consentimiento de destinatarios. Probar primero con un número autorizado.

[Documentación oficial de Meta para WhatsApp Cloud API](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api)

