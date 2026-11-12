# CRM Von Braun en Render Free

## Crear el piloto

1. Crea un repositorio privado en GitHub y sube los archivos de esta carpeta a su raíz. Excluye bases de datos y secretos.
2. En el panel de Render, elige **New → Blueprint** y conecta el repositorio. El archivo render.yaml selecciona un servicio web Python gratuito.
3. Cuando Render solicite CRM_USUARIO, escribe un nombre de usuario, por ejemplo piloto-vonbraun. Render genera CRM_CLAVE. Consulta su valor desde **Environment** del servicio y guárdalo en un gestor de contraseñas.
4. Cuando el despliegue termine, abre la dirección HTTPS asignada por Render e introduce ambos valores cuando el navegador los solicite. Prueba primero en una ventana privada. El navegador puede recordar el acceso mientras la sesión esté abierta.

Si configuras el servicio manualmente, selecciona Python y Free. Usa `python -m py_compile servidor.py render_start.py` como comando de compilación, `python render_start.py` como comando de inicio y `/salud` como ruta de comprobación. Define CRM_USUARIO y CRM_CLAVE en **Environment**. La clave debe tener al menos 16 caracteres. Render proporciona PORT y RENDER_EXTERNAL_URL.

## Alcance del piloto

El acceso compartido por contraseña protege las pantallas y la API. La ruta /salud responde únicamente con un indicador de disponibilidad. Para cambiar la contraseña, actualiza CRM_CLAVE en Render y aplica el cambio al servicio.

SQLite usa el disco temporal de Render Free. Usa datos ficticios. Los registros pueden perderse al suspenderse, reiniciarse o volver a desplegarse el servicio. Para uso institucional quedan pendientes el almacenamiento persistente, el acceso individual con permisos y el conector de WhatsApp, incluido el webhook de Meta. El sitio web de cPanel puede seguir en su alojamiento actual.

[Documentación de Render Free](https://render.com/docs/free)

## Recibir mensajes de WhatsApp de prueba

1. Actualiza los archivos en la raíz del mismo repositorio y espera a que Render muestre Live.
2. En Environment del servicio, agrega WA_VERIFY_TOKEN (una cadena aleatoria propia), WA_APP_SECRET (el secreto de la aplicación Meta, en Configuración de la aplicación → Información básica), WA_PHONE_NUMBER_ID (1332864416587021 para el número de prueba terminado en 5459) y WA_TEST_SENDER (tu celular autorizado con código de país, solo dígitos). Guarda y aplica los cambios. Conserva las variables de acceso al CRM.
3. En Configuración de la API → Configurar webhooks, escribe https://crm-von-braun-pruebas.onrender.com/webhook/whatsapp como URL de devolución de llamada y el mismo WA_VERIFY_TOKEN como identificador de verificación. Pulsa Verificar y guardar y suscríbete al campo messages en la cuenta de prueba.
4. Envía un mensaje de texto nuevo al número de prueba desde tu celular autorizado. En el CRM abre WhatsApp de prueba y pulsa Actualizar.

Esta actualización recibe texto de un único remitente de prueba. La ruta de verificación comprueba el token y los eventos entrantes deben venir firmados por Meta. Los mensajes se almacenan en SQLite temporal y se consultan con las credenciales del CRM. El envío desde el CRM queda pendiente. El token temporal que usa Meta para enviar mensajes es distinto de WA_VERIFY_TOKEN y WA_APP_SECRET. Guarda los secretos en Render y Meta.
