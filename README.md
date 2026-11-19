# Trabajo práctico 08 - Endpoints persistentes de reservas de salas

Proyecto individual basado en una copia del TP 07. Se conservan CommonJS, Express y EJS. HTML y API comparten un servicio asíncrono Mongoose; se retiraron el arreglo y la semilla del arranque. No se insertan reservas automáticamente al iniciar ni al listar.

Referencia permanente: [guía del TP 08](docs/GUIA-TP08.md), con requisitos, evaluación, matriz obligatoria y diagnóstico histórico. La copia del PDF oficial está en `docs/consigna/`.

**Auditoría final del 18/11/2026:** hay 21 PNG y un registro de pruebas (22 evidencias). La nueva captura disponible muestra arranque con `npm start`, retorno al prompt y consulta del puerto 3000 sin resultados. El autor informa que detuvo Node.js con Ctrl+C. Se conserva la salida previa de 110 pruebas aprobadas y 0 fallos; no se reejecutaron tests ni se inició la aplicación en esta auditoría.

## Entorno

Node.js `v24.19.0`, npm `11.17.0`. Se mantienen versiones y dependencias del TP 07, sin paquetes adicionales:

| Dependencias | Versiones instaladas |
| --- | --- |
| Express / EJS / express-ejs-layouts | 5.2.1 / 7.0.1 / 2.5.1 |
| Mongoose / Morgan | 9.12.1 / 1.12.1 |
| ESLint / @eslint/js / Prettier | 10.14.0 / 10.0.1 / 3.9.10 |

Manifiesto y lockfile identifican `tp-08-salas-http-mongodb`. La procedencia es coherente con TP 07; no se pudo cotejar byte a byte con una carpeta original disponible durante la auditoría.

## Preparación y ejecución

1. Instalar desde el lockfile con `npm ci`. En la auditoría se utilizó `npm ci --ignore-scripts --no-audit --no-fund`.
2. Preparar Atlas Free (M0), conservando las bases anteriores. Confirmar usuario de base de datos, permisos y acceso de red desde la IP de trabajo.
3. Solo si no existe `.env`, copiar `.env.example` a `.env`. Completar usuario, contraseña y host reales únicamente en ese archivo privado. Los marcadores de la plantilla no permiten conectar; codificar caracteres reservados de usuario/contraseña en la URI.
4. Usar `reservas_salas_u8` y colección `reservas`. La conexión fuerza `dbName: "reservas_salas_u8"`, incluso si la URI contiene otra base. Los scripts heredados también apuntan ahora a u8 porque reutilizan esa conexión.
5. Iniciar desde la raíz del proyecto:

```powershell
npm start
```

Equivale a `node --env-file=.env src/index.js`. `PORT` admite enteros 1 a 65535 (default 3000); `NODE_ENV=production` usa Morgan combined y los demás entornos usan dev. Las variables ya definidas en el proceso prevalecen sobre `.env`. Una URI ausente impide abrir HTTP.

La conexión se espera antes de escuchar y se mantiene entre peticiones. El módulo central conserva los DNS del TP 07 (`8.8.8.8`, `1.1.1.1`) y tiempos de conexión/selección de servidor de 10 segundos; confirmar su compatibilidad con la red de trabajo. No se cambió el DNS del sistema. SIGINT (`Ctrl+C`) y SIGTERM cierran HTTP, esperan las solicitudes activas y luego desconectan MongoDB.

## Estructura

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `src/index.js`, `src/app.js` | Arranque conectado, cierre y composición Express/EJS. |
| `src/config/` | Entorno, DNS, conexión y diagnóstico sin secretos. |
| `src/modelos/reserva.js` | Esquema, tipos estrictos, estado y colección explícita; sin creación automática de colección/índices al consultar. |
| `src/modelos/opciones-reserva.js` | Salas y turnos compartidos por modelo y formulario. |
| `src/servicios/reservas.js` | Crear, listar/filtrar, buscar y contar; representación común con ID textual. |
| `src/controladores/`, `src/rutas/` | Controladores y routers separados para HTML y API. |
| `src/middleware/`, `src/errores.js` | Validación, solicitudes y errores centralizados. |
| `views/`, `public/` | Vistas EJS y CSS conservados. |
| `scripts/` | Programas de conexión, creación y listado del TP 07; no ejecutados en esta etapa. |
| `tests/tp08.test.js` | Verificación local con operaciones simuladas y validación real del esquema. |

El modelo no contiene rutas HTTP y el servicio no envía respuestas Express. No quedan dos almacenamientos activos para el servidor.

## Endpoints

| Método y ruta | Resultado |
| --- | --- |
| `GET /` | 200, inicio HTML con conteo de MongoDB. |
| `GET /reservas` | 200, listado HTML. |
| `GET /reservas/nueva` | 200, formulario. |
| `GET /reservas/:id` | 200, detalle; ID inválido 400, válido inexistente 404. |
| `POST /reservas` | 302 a listado después de guardar; inválido 400 y valores conservados. |
| `GET /estado` | 200, `{ servicio: "activo", reservas: <conteo>, solicitudId: <id> }`. |
| `GET /api/reservas` | 200 y arreglo, incluido `[]`. |
| `GET /api/reservas?sala=Sala%20Norte` | 200, coincidencias exactas; sin coincidencias, `[]`. |
| `GET /api/reservas/:id` | 200 y recurso; ID inválido 400, válido inexistente 404. |
| `POST /api/reservas` | 201, recurso guardado y Location para consultarlo. |

Los errores API y rutas API desconocidas devuelven JSON. Un fallo inesperado responde 500 sin traza ni secretos. Solo se admite el filtro textual `sala`; parámetros adicionales, operadores o sala repetida responden 400. No se implementan PUT, PATCH ni DELETE, paginación ni orden.

## Modelo y entrada

Se conservan `estudiante`, `email`, `sala`, `fecha`, `turno` y `personas` con las reglas de la guía. Se agrega `estado`, default `pendiente` y enum `pendiente`/`confirmada`. El servidor copia explícitamente los seis campos e ignora `_id`, `estado` y otros extras. JSON exige personas numérico; el formulario convierte el entero decimal recibido como texto. Booleanos, arreglos y objetos no se convierten a números válidos. El esquema mantiene validaciones además del middleware.

El ID público es texto derivado del ObjectId. No se valida email completo, fecha real/futura, solapamientos, cupos compartidos ni duplicados; no hay índice único ni operación para confirmar. El default no aporta autenticación ni migra documentos antiguos.

## Pruebas con Postman

Usar Postman de escritorio con el servidor activo. Origen ilustrativo: `http://localhost:3000`, adaptado a PORT.

1. GET `/api/reservas`, Body none: registrar 200, arreglo y cantidad inicial sin filtros.
2. POST `/api/reservas`, Body raw/JSON y cabecera de solicitud `Content-Type: application/json`:

```json
{
  "estudiante": "Ana Ejemplo",
  "email": "ana@example.invalid",
  "sala": "Sala Norte",
  "fecha": "2026-10-21",
  "turno": "Mañana",
  "personas": 2
}
```

La fecha es ilustrativa. Enviar una vez; registrar 201, `id`, seis campos, estado pendiente y **Location de la respuesta**. Cada POST válido adicional pide otra creación.

3. GET a Location con Body none: esperar 200 y el mismo recurso; anteponer el origen local si la dirección es relativa.
4. GET con ID `1`: 400. Con un ObjectId válido inexistente: 404. Probar Params sala exacta, otra sin coincidencias (200 y `[]`) y repetida (400).
5. Duplicar POST y cambiar un dato por ensayo inválido. Comparar cantidades con GET sin filtros antes/después de cada rechazo. Campos extra con seis datos válidos sí crean; ID y estado los asigna el servidor.
6. Completar toda la matriz del apartado 5 de la guía. Formularios y vistas se prueban en navegador; API desde Postman.

Para repetir la prueba de persistencia, conservar ID/Location, reiniciar con la misma base y consultar ese ID sin repetir POST. Comparar el documento en HTML y Atlas y listar dos veces sin filtros. No hace falta crear reservas nuevas ni borrar documentos para comprobar las existentes.

## Resultados manuales informados

La tabla siguiente conserva el informe manual inicial del autor, cuando había tres reservas. No son nuevas ejecuciones del asistente. La sección de evidencias posterior registra lo que ahora se observa en las 21 capturas, correspondientes también a pruebas adicionales con cinco reservas.

| Prueba | Resultado informado |
| --- | --- |
| GET `/api/reservas` inicial | 200 y `[]`, cantidad inicial 0. |
| POST válido | 201, ID de MongoDB y estado pendiente. |
| GET por ID y GET a Location | 200, exactamente el mismo documento; la respuesta 201 incluyó Location. |
| GET después de reiniciar Node.js | 200 con el mismo ID; persistencia comprobada por el autor. |
| Listados repetidos | No aparecieron duplicados ni se crearon documentos al consultar. |
| Inspección en Atlas | Base `reservas_salas_u8`, colección `reservas`, mismo `_id`. |
| GET con ID `1` | 400 JSON. |
| GET con ObjectId válido inexistente | 404 JSON; la captura posterior muestra `000000000000000000000000`. |
| Filtro `sala=Sala Norte` | 200 con coincidencia. |
| Filtro `sala=Sala Sur` mientras estaba vacía | 200 y `[]`; ese resultado corresponde a ese momento, antes de existir la reserva actual de Sala Sur. |
| Parámetro sala repetido | 400 JSON. |
| Estudiante vacío | 400. |
| Email sin `@` | 400. |
| Sala no permitida | 400. |
| Turno no permitido | 400. |
| Fecha vacía | 400. |
| Personas 0 | 400. |
| Personas 7 | 400. |
| Personas 2.5 | 400. |
| Personas `"abc"` | 400. |
| Personas `true` | 400. |
| Personas `[2]` | 400. |
| Personas objeto | 400; no se especificó el contenido del objeto. |
| JSON mal formado | 400 JSON. |
| POST sin cuerpo | 400 JSON. |
| POST con estado `confirmada` | 201 y estado guardado `pendiente`; el valor del cliente se ignoró. Esta fue una creación válida. |
| GET `/reservas` | HTML correcto con reservas creadas desde Postman. |
| GET `/reservas/:id` | Detalle HTML correcto. |
| GET `/estado` | Conteo correcto: primero 2 y después 3 reservas. |
| Formulario HTML válido | En la primera tanda, el autor informó redirección y tercera reserva. La captura posterior de Martin Prueba acredita 302 y Location `/reservas` desde Postman, con cuerpo urlencoded. |
| Email inválido en Chrome | El navegador bloqueó el envío mediante HTML5. |
| POST urlencoded con email inválido | 400 HTML, mensaje con `role="alert"` y los seis valores conservados. Comprueba la validación del servidor, además de la del navegador. |
| Listado después de los POST inválidos | Se mantuvieron solamente las tres reservas válidas. |
| GET `/pagina-inexistente` | 404 HTML personalizado. |
| GET `/api/ruta-inexistente` | 404 JSON. |
| GET `/` | Inicio correcto con contador de 3 reservas. |
| GET `/css/estilos.css` | 200 y CSS cargado. |

El informe inicial confirmó tres reservas después de los rechazos de esa tanda. Las capturas adicionales muestran cinco; no se asignan cantidades individuales antes/después de cada ensayo que no estén registradas.

Las tres primeras reservas ficticias informadas fueron:

| Estudiante | Sala | Turno | Personas |
| --- | --- | --- | --- |
| Jeremias Prueba | Sala Norte | Mañana | 2 |
| Lucia Prueba | Sala Sur | Tarde | 3 |
| Carlos Prueba | Sala Multimedia | Noche | 4 |

## Cronología de los conteos

1. **Inicio: 0 reservas.** El autor informó GET 200 con `[]`; esa respuesta inicial no está entre estas capturas.
2. **Primera tanda: 3 reservas.** Jeremias, Lucia y Carlos. Los conteos de 2 y luego 3 de `/estado`, así como el filtro Sala Sur vacío, pertenecen a esa etapa.
3. **Pruebas adicionales: 5 reservas.** Se agregaron Martin Prueba mediante POST `/reservas` y Valentina Evidencia mediante POST API. El listado completo muestra esas cinco personas y el filtro Sala Norte devuelve Jeremias y Martin.
4. **Sofia Validacion:** POST `/api/reservas` con email inválido, **400 Bad Request**, visible en `04-validacion-400.png`. El GET posterior devuelve **200 OK con exactamente 5 reservas**, visible completo en `04-validacion-conteo-sin-cambios.png`. No hay una captura individual del conteo inmediatamente anterior. Las altas válidas de Martin y Valentina explican 3 → 5; listar no fue una nueva creación.

Actualmente el autor confirma cinco reservas y las capturas de inicio, listado, API y `/estado` coinciden en ese total. **Para los demás rechazos probados anteriormente se verificó el código HTTP 400, pero no se registró un conteo individual antes y después.** No se les asigna automáticamente un total de 3 o de 5 ni se afirma que existan capturas de esos conteos. Los controles automatizados sin aumento de cantidad pertenecen a una simulación distinta. No se consultó la base en esta revisión.

## Pruebas manuales y evidencias revisadas

Las 14 imágenes anteriores ya habían sido inspeccionadas individualmente y conservan sus hashes; las cinco nuevas se abrieron e inspeccionaron en esta revisión. No hubo imágenes inaccesibles. La captura adicional del clúster Free se inspeccionó en esta revisión técnica; las anteriores se conservan. La auditoría anterior no detectó duplicados por píxeles. Se conservan nombres, contenido y ubicación originales; los prefijos compartidos agrupan casos, no significan que los archivos estén repetidos. El [índice de auditoría](docs/evidencias/INDICE.md) reúne el detalle y las limitaciones.

| Captura | Resultado visible | Alcance o aclaración |
| --- | --- | --- |
| [01-api-post-201.png](docs/evidencias/01-api-post-201.png) | POST `/api/reservas`, 201; Valentina Evidencia, seis campos, ID y estado pendiente. | El cuerpo no muestra Location; se completa con la siguiente imagen. |
| [01-api-post-201-location.png](docs/evidencias/01-api-post-201-location.png) | Mismo POST: 201 y Location `/api/reservas/6afdd89129eba0afe170edf0`. | Complementaria del cuerpo; no es una creación distinta. |
| [02-api-get-por-id.png](docs/evidencias/02-api-get-por-id.png) | GET por ID, 200; Jeremias Prueba, ID `6afce9d5c0b9d9c7a86cf9b7`. | Correcta por nombre; es otro documento, distinto del POST de Valentina. |
| [02-api-get-location.png](docs/evidencias/02-api-get-location.png) | GET a la URL de Location, 200; ID, seis campos y estado de Valentina coinciden. | Completa la consulta del recurso recién creado. |
| [03-mongodb-atlas.png](docs/evidencias/03-mongodb-atlas.png) | `reservas_salas_u8/reservas`; mismo `_id` y datos de Valentina. | La consulta filtra un documento; el contador Documents muestra 5. No muestra el nivel M0. |
| [04-validacion-400.png](docs/evidencias/04-validacion-400.png) | POST API de Sofia Validacion con email `correo-invalido`, 400 JSON y mensaje sobre `@`. | Solo demuestra esta validación, no todos los negativos de la matriz. |
| [04-validacion-conteo-sin-cambios.png](docs/evidencias/04-validacion-conteo-sin-cambios.png) | GET `/api/reservas`, 200; se ven completos los cinco documentos. | Acredita el total posterior. Falta un registro del total inmediatamente anterior para demostrar igualdad antes/después. |
| [05-formulario-302.png](docs/evidencias/05-formulario-302.png) | POST `/reservas` urlencoded de Martin Prueba: 302 Found y Location `/reservas`. | Prueba el endpoint HTML desde Postman; no es una captura de Chrome ni del listado HTML. |
| [05-api-id-invalido-400.png](docs/evidencias/05-api-id-invalido-400.png) | GET `/api/reservas/1`, 400 JSON. | Método, URL, código y error legibles. |
| [05-api-id-inexistente-404.png](docs/evidencias/05-api-id-inexistente-404.png) | GET con `000000000000000000000000`, 404 JSON. | Distingue ID con formato válido y recurso ausente. |
| [06-filtro-sala-norte-200.png](docs/evidencias/06-filtro-sala-norte-200.png) | GET con `sala=Sala Norte`, 200; solo Jeremias Prueba y Martin Prueba. | Se ven el parámetro, las dos reservas y el cierre del arreglo. |
| [06-filtro-sala-repetida-400.png](docs/evidencias/06-filtro-sala-repetida-400.png) | GET con dos parámetros sala activos, 400 JSON. | Se ven ambos valores y el mensaje de filtro único. |
| [07-reinicio-servidor.png](docs/evidencias/07-reinicio-servidor.png) | Terminal: `npm start`, carga de `.env` y servidor disponible en localhost. | Se ve el arranque, no el cierre previo ni el contenido de `.env`. |
| [07-persistencia-despues-reinicio.png](docs/evidencias/07-persistencia-despues-reinicio.png) | GET de Valentina, 200, mismo ID y datos que en POST/Location/Atlas. | Coherente con la persistencia informada; interpretar junto al arranque y el informe del autor. |

Las cinco evidencias agregadas después de la auditoría anterior son:

| Captura nueva | Resultado visible | Alcance |
| --- | --- | --- |
| [08-html-inicio-contador.png](docs/evidencias/08-html-inicio-contador.png) | Inicio con contador de 5 reservas, navegación y footer TP 08. | Muestra la página renderizada; no la URL ni un estado HTTP. |
| [08-html-listado-reservas.png](docs/evidencias/08-html-listado-reservas.png) | `localhost:3000/reservas` con Jeremias, Lucia, Carlos, Martin y Valentina: cinco tarjetas completas. | Relaciona HTML con las cinco reservas del listado API; no muestra el código HTTP. |
| [08-html-detalle-valentina.png](docs/evidencias/08-html-detalle-valentina.png) | ID `6afdd89129eba0afe170edf0`, Valentina Evidencia y seis campos coincidentes con API/Atlas. | No muestra barra de URL ni estado HTTP; sí el ID y el detalle. |
| [08-html-formulario-nueva-reserva.png](docs/evidencias/08-html-formulario-nueva-reserva.png) | Formulario con estudiante, email, sala, fecha, turno y cantidad de personas; botones Guardar y Cancelar. | Demuestra los seis campos visibles; no un envío, redirección ni rechazo. |
| [08-endpoint-estado.png](docs/evidencias/08-endpoint-estado.png) | `localhost:3000/estado`: servicio `activo`, reservas 5 y solicitudId `BIB-0013`. | El cuerpo y URL son legibles; el navegador no muestra código HTTP. |

El listado HTML contiene las mismas cinco personas del GET API. El detalle enlaza a Valentina con el mismo ID que POST, Location, Atlas y GET posterior al reinicio. El formulario vacío no acredita validación de errores. Las capturas del navegador no se usan para afirmar códigos HTTP que no muestran.

### Clúster gratuito

[09-mongodb-atlas-free-tier.png](docs/evidencias/09-mongodb-atlas-free-tier.png) muestra Cluster0, `CLUSTER TIER: Free` y el texto `This is a Free Tier Cluster`. Acredita el requisito de clúster gratuito Free (M0) de la consigna; la pantalla usa el nombre Free, no imprime literalmente M0. No se infiere el nivel a partir de la versión del servidor.

No se ven credenciales ni URI privadas; sí aparecen metadatos de organización/proyecto, región y nombres parciales de nodos. Revisar privacidad antes de publicar y conservar el original.

Datos de la reserva que enlaza creación y persistencia: Valentina Evidencia, `valentina@example.com`, Sala Multimedia, fecha `2026-11-23`, Tarde, 2 personas y estado pendiente. El ID visible es `6afdd89129eba0afe170edf0`. Son datos ficticios de prueba. La Location y los GET coinciden con ese ID; Atlas lo representa como `_id` ObjectId.

Las capturas son legibles aunque varias incluyen bastante espacio vacío. Los bordes recortados no ocultan el resultado relevante. En la barra lateral de algunas imágenes la solicitud guardada de creación figura como GET; el método de la pestaña activa sí es POST. Revisar esa etiqueta si se exporta la colección.

## Persistencia y comparación con TP 07

La secuencia inicial informada fue: listado vacío, creación, consulta por ID/Location, reinicio y recuperación del mismo documento. Las capturas posteriores enlazan el POST, Location, Atlas y el GET tras el reinicio de Valentina Evidencia mediante el ID `6afdd89129eba0afe170edf0`. El GET por ID de Jeremias corresponde a otro documento y no debe usarse como si fuera la consulta de ese POST. La imagen de terminal muestra un arranque con `npm start`; el cierre previo y el orden temporal entre terminal y GET no se ven por sí solos, y se apoyan en el procedimiento informado por el autor.

En TP 07, los programas de terminal utilizaban MongoDB, pero el sitio guardaba las reservas en memoria y las perdía al reiniciar. En TP 08, el servicio usa Mongoose y todos los controladores esperan sus operaciones; sitio y API consultan los mismos documentos. Se quitó el arreglo `datosIniciales` de `src/index.js` y el servicio dejó de operar sobre un arreglo. No se importa ni se carga una semilla al arrancar o listar. Los IDs numéricos se reemplazaron por texto derivado del ObjectId y se incorporó estado pendiente.

## Calidad y comprobaciones locales

```powershell
npm run format
npm run check
npm test
```

`format` aplica Prettier y `check` verifica formato y ESLint sobre `src`/`scripts`. En la revisión previa, `npm run check` aprobó con código 0: formato y lint correctos. No se ejecutó `npm run format` ni se modificaron JS, EJS o CSS.

Primero se ejecutaron 49 pruebas sin HTTP. En la revisión técnica posterior se autorizó la suite completa tras revisar su aislamiento: **`npm test`: 110 pruebas, 110 aprobadas, 0 fallos, salida 0**. La [salida real completa](docs/evidencias/10-npm-test.txt) se conserva como evidencia. En esta auditoría final solo se leyó ese registro: no se volvió a ejecutar la suite.

Aislamiento comprobado en el código y en la ejecución:

- No hay `pretest`/`posttest` ni carga de `.env`; el comando test no usa `--env-file`. Se limpió `NODE_OPTIONS`, se dejó `MONGODB_URI` vacía y se usó entorno test solo en el proceso de ejecución. Las configuraciones privadas de npm no se cargaron.
- Los modelos usan operaciones simuladas y validación local de Mongoose. La suite bloquea `mongoose.connect` y al finalizar comprueba cero intentos de conexión y estado desconectado. Las altas de los tests existen solo en arreglos temporales, no en Atlas.
- Las pruebas HTTP escuchan en `127.0.0.1` con `listen(0)`: el sistema asigna puertos disponibles. No se usa el puerto 3000 para escuchar y los servidores temporales se cierran al terminar.
- El único subproceso que invoca `src/index.js` recibe un entorno explícito con URI vacía, sin cargar `.env`; falla antes de abrir HTTP. No se ejecutó `npm start`.

| Verificación técnica actual | Resultado observado y alcance |
| --- | --- |
| URI ausente | Aprobada: subproceso con salida 1, diagnóstico de MONGODB_URI y sin anuncio de disponibilidad. La revisión del código confirma que el rechazo sucede antes de conectar o escuchar. |
| HTTP 500 | Aprobada: operaciones simuladas fallan y API/HTML responden 500; no publican el mensaje secreto ficticio ni trazas, ni devuelven Location de éxito. No se provocó un fallo de Atlas. |
| Espera de conexión y cierre | Aprobada con dependencias simuladas: no escucha antes de conectar; cierra HTTP antes de MongoDB; cierre único. |
| SIGINT / SIGTERM | Ambas aprobadas: se invoca el manejador registrado dos veces y el cierre ocurre una sola vez, en orden HTTP → MongoDB. No se enviaron señales reales del sistema ni se pulsó Ctrl+C sobre la aplicación real. |

Las pruebas simuladas demuestran los manejadores y el orden de llamadas; no sustituyen una evidencia del cierre real. `npm run check` corresponde a la revisión anterior aprobada; no se repitió en esta etapa sin cambios de código. No se ejecutó `format`.
Los scripts conservan CommonJS y versiones/dependencias. `npm start` carga `.env`; la conexión usa `MONGODB_URI`, fuerza `reservas_salas_u8`, conserva DNS `8.8.8.8`/`1.1.1.1` y se espera antes de `app.listen()`. Se revisó el código; el arranque exitoso solo se simuló. El subproceso de URI vacía terminó antes de escuchar. No se realizó una auditoría actual de vulnerabilidades.
## Revisión por criterios de evaluación

| Criterio del PDF | Evidencia disponible y pendiente |
| --- | --- |
| Arranque, conexión, estructura y continuidad (20%) | Terminal y documento Atlas visibles; arquitectura implementada previamente. Free acreditado en la nueva captura; arranque, URI ausente y señales aprobados con pruebas aisladas. Cierre del proceso y puerto libre acreditados manualmente; orden HTTP → MongoDB y ambos manejadores acreditados con simulaciones. La desconexión real no se observó directamente; no se exige una captura adicional de ese evento. |
| Modelo, defaults y entrada (20%) | POST y Atlas muestran estado pendiente; email inválido 400. Resto de negativos y campo extra `estado`: informados manualmente y cubiertos por el registro automatizado. No falta una prueba solo por no tener PNG. |
| Endpoints, respuestas e ID (25%) | 201/Location, GET 200, 400/404, filtros y POST HTML 302 documentados. Ahora se ven sitio, detalle, formulario vacío y `/estado`; rutas desconocidas y formulario inválido tienen informe manual y pruebas verificables en `10-npm-test.txt`. El 500 tiene prueba aislada y salida adjunta. |
| Persistencia, negativos y criterio exacto (25%) | Coinciden POST/Location/Atlas/GET de Valentina; filtro exacto y repetido visibles. Los conteos estables y los rechazos se verifican en simulación; en Postman fueron informados sin el desglose cuantitativo antes/después de cada caso. |
| Calidad, README y secretos (10%) | Enlaces a las 21 imágenes; check previo aprobado y suite completa actual de 110 pruebas aprobada, con salida adjunta. Falta publicación autorizada y verificar acceso del docente, con revisión de privacidad previa. |

No se asigna una nota ni se considera completa la entrega únicamente por estas capturas.

## Matriz final de comprobación

Se consideran las capturas, los resultados manuales identificados como tales y el registro automatizado verificable. No se exige una imagen por prueba. `10-npm-test.txt` documenta simulaciones, no operaciones reales sobre Atlas.

| Requisito obligatorio | Comprobación disponible |
| --- | --- |
| Modelo, default y seis campos permitidos | POST/Atlas con estado pendiente; informe manual del estado extra ignorado; tests de tipos, enums, default y campos extra aprobados. |
| Listado inicial vacío | Informe manual de 200 y `[]`; test de listado vacío aprobado. No borrar documentos para volver a obtenerlo. |
| POST 201, ID y Location; GET del mismo recurso | Capturas de Valentina y GET a Location; test que espera la creación antes de responder aprobado. |
| Persistencia, mismo ID tras reiniciar y coincidencia en el sitio/Atlas | Capturas POST/GET/Atlas/reinicio/detalle HTML y secuencia informada por el autor. |
| ID inválido 400 / válido inexistente 404 | Capturas y tests aprobados. |
| Filtro exacto, sin coincidencias y parámetro repetido | Capturas Sala Norte/repetido; informe manual del filtro sin coincidencias y tests de las variantes aprobados. |
| Entradas inválidas y ausencia de escrituras | Sofia: 400 y GET posterior 200 con 5 reservas. Otros rechazos: HTTP 400 verificado, sin conteo individual antes/después registrado. Los tests sí comprueban ausencia de altas en simulación, sin sustituir esos conteos reales faltantes. |
| Listar dos veces sin modificar el total | Informe manual y dos consultas consecutivas con igualdad de cantidad verificadas en la suite. No se requiere otra captura para demostrar la prueba simulada. |
| HTML, seis campos, detalle, inicio y `/estado` | Capturas del sitio y contador 5. Formulario válido/ inválido, valores conservados, CSS y rutas inexistentes tienen informe manual y tests aprobados; 302/Location además tiene captura. |
| URI ausente, errores 500 y diagnóstico seguro | Registro automatizado aprobado: proceso de URI vacía no anuncia disponibilidad; operaciones fallidas simuladas devuelven 500 sin secretos. El PDF admite simular el fallo. |
| Arranque conectado y cierre ordenado SIGINT/SIGTERM | Código revisado y pruebas de espera/orden/cierre único aprobadas. La captura nueva acredita prompt y puerto libre; Ctrl+C fue informado por el autor. No se observó directamente la desconexión real de MongoDB. |
| Atlas Free, CommonJS, capas, plantilla, lockfile y calidad | Captura Free; estructura/configuración revisadas; format/check aprobados en etapas anteriores y registro completo de tests. No se repitieron comandos. |

**Limitación documental frente a la consigna:** no se registraron cantidades reales antes/después de cada rechazo de Postman. Se conserva lo efectivamente observado (Sofia 400 y listado posterior 200 con 5), y para los demás casos solo se informa el 400 comprobado. No se reconstruyen números ni evidencias inexistentes. Esta limitación queda declarada para la evaluación; no es un impedimento técnico para versionar el proyecto. El acceso del docente se verificará cuando se publique la URL.

Una captura aislada de cada negativo, la variante `_id` además de `estado`, otra ejecución real del 500 o un log directo de desconexión no son requisitos adicionales. El PDF admite `estado` o `_id` y una simulación controlada del 500. No se marca como fallida una prueba que tiene registro verificable aunque no tenga imagen.

## Cierre manual del proceso y del puerto

[11-cierre-servidor-puerto-libre.png](docs/evidencias/11-cierre-servidor-puerto-libre.png) muestra `npm start`, el mensaje de servidor disponible, el regreso al prompt de PowerShell y `Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue` sin resultados. Corresponde con su nombre y acredita la ausencia de listeners reportados por ese comando en ese momento.

El autor informa que utilizó Ctrl+C. La imagen no muestra `^C` ni un código de salida, y el archivo anunciado `11-cierre-servidor-ctrl-c.png` no se encontró en el proyecto: no se crea un enlace roto ni se inventa su contenido. La captura disponible ya reúne arranque, prompt y puerto libre, por lo que el segundo archivo no es una obligación adicional.

Separación de resultados: **cierre del proceso y puerto libre, comprobados manualmente; orden HTTP → MongoDB e idempotencia SIGINT/SIGTERM, comprobados con simulaciones; desconexión real de MongoDB, no observada directamente en terminal**. Esta última limitación queda explícita, sin exigir instrumentar o modificar la aplicación para la entrega.

## Seguridad antes de publicar

No se observaron contraseñas, tokens ni URI privadas en las imágenes revisadas. Hay metadatos que conviene ocultar en copias destinadas a publicación, preservando los originales:

| Archivo | Dato visible |
| --- | --- |
| `07-reinicio-servidor.png` y `11-cierre-servidor-puerto-libre.png` | Ruta local con usuario de Windows, Escritorio y carpeta del proyecto. |
| `03-mongodb-atlas.png` | Nombre de organización/proyecto Atlas y otras bases del clúster. |
| `09-mongodb-atlas-free-tier.png` | Organización/proyecto, región y nombres parciales de nodos. |
| `02-api-get-por-id.png` | Nombre del workspace de Postman. |
| `08-html-listado-reservas.png` | Barra de extensiones del navegador. |

Estos metadatos no son contraseñas. No se modificó ni borró ninguna captura. `Untitled` es una nota auxiliar, no evidencia independiente ni un requisito de entrega; se conserva y no se ejecutan sus sugerencias.

El proyecto puede pasar a la preparación de GitHub; no se detecta un bloqueo técnico para versionarlo. Antes de publicar, revisar manualmente los seis archivos con metadatos y decidir qué copias se publicarán. La falta de conteos individuales queda declarada como limitación documental, sin inventar resultados. La verificación de acceso del docente se hará después de disponer de la URL. No se inicializó Git.
## Archivos para GitHub

- **Incluir:** `src/`, `scripts/`, `views/`, `public/`, `tests/`, `package.json`, `package-lock.json`, `eslint.config.js`, `.gitignore`, `.gitattributes` y `.env.example` solo con marcadores públicos; README, guía, consigna e índice/instrucciones de evidencias. Incluir también el registro real `10-npm-test.txt` y las imágenes que se hayan aprobado para publicación.
- **Excluir:** `.env`, `node_modules/`, credenciales, tokens, claves, exportaciones privadas de entorno y respaldos que contengan secretos. No hay que publicar la base de datos ni agregar un volcado para entregar el código.
- **Revisión manual:** las seis imágenes con metadatos se conservan intactas; antes de publicar conviene ocultar esos datos en copias separadas, sin tapar método, URL local, estado HTTP, ID/Location o resultados necesarios. `Untitled` es una nota auxiliar prescindible para la entrega; no se borra ni se excluye automáticamente en esta revisión.

### Verificación de exclusiones

Se revisó `.gitignore` sin modificarlo y se comprobaron sus patrones con la librería `ignore` ya instalada: `.env`, `src/.env`, `node_modules/` y `node_modules/mongoose/package.json` quedan excluidos; `.env.example`, `src/app.js`, `package-lock.json` y las capturas quedan permitidos. No se instaló nada ni se ejecutó la suite.

Esto protege las altas normales de archivos nuevos. `.gitignore` no impide `git add -f` ni retira archivos ya rastreados. No hay repositorio inicializado, por lo que no se hizo una prueba real de staging. Después de inicializarlo, corresponderá comprobar las exclusiones con Git antes del primer commit; otros archivos de secretos o respaldos requieren revisión específica.

## Archivo Untitled

`docs/evidencias/Untitled` es una nota de texto del error 400 de email: incluye el mensaje JSON y una explicación que afirma que no se creó reserva. Esa afirmación sola no demuestra el conteo. También contiene una pregunta en inglés y opciones para continuar, incluida una prueba de actualización fuera del alcance del TP. No es una captura ni un registro completo de ejecución; se conserva sin cambios y no se usa como prueba independiente.

## Seguridad

`.gitignore` excluye `.env` y `node_modules/`. El archivo privado existe y no se leyó. En las 21 capturas no se observan contraseñas, tokens ni URI privadas; los archivos con metadatos se identifican en la tabla anterior. Los correos de las reservas usan `example.com` y corresponden a los datos ficticios informados. La auditoría textual busca patrones de secretos sin mostrar sus valores. No hay un repositorio Git activo en esta carpeta ni en sus antecesores, por lo que todavía no hay archivos rastreados. Las exclusiones están preparadas para su futura inicialización; no se inicializó Git ni se hizo commit o push. Antes de agregar archivos al futuro repositorio, comprobar las exclusiones con `git check-ignore .env node_modules/` y que `git ls-files -- .env node_modules/` no liste archivos.

Entregar código, manifiesto, lockfile, plantilla, README y evidencias sin secretos ni datos personales reales. Las capturas deben estar recortadas y ocultar credenciales. No publicar este servidor en Internet en esta unidad. El TP 07 original se conserva intacto.


