# Guía permanente del TP 08

Fuente de verdad: [consigna oficial, 6 páginas](consigna/semana-08-trabajo-practico-08.pdf). Copia local idéntica por SHA-256 al original de Descargas, que se conservó sin modificar. Ante una duda no resuelta aquí, consultar el apartado indicado del PDF. Auditoría inicial: 16/11/2026.

Esta guía distingue requisitos del docente de resultados observados. **Estado final actualizado en README e índice: 21 PNG y registro completo de 110 pruebas aprobadas; cierre del proceso/puerto libre comprobado manualmente, orden HTTP → MongoDB simulado y desconexión real no observada directamente.** Los apartados 7 a 11 conservan el historial de sus etapas, incluidos pendientes ya resueltos. No confundir falta de captura con falta de prueba: el registro automatizado también es evidencia verificable. Pendientes obligatorios actuales: completar cantidades reales por rechazo de Postman y comprobar acceso del docente después de publicar. El archivo anunciado `11-cierre-servidor-ctrl-c.png` no se encontró; la captura combinada de puerto libre se conserva y está enlazada.

## 1. Entrega y alcance (PDF, apartados 1 y 2)

- Trabajo individual, entrega por URL de GitHub accesible al docente. Vencimiento textual: «lunes siguiente a las 19:59»; el documento no fija una fecha calendario, por lo que debe confirmarse en el curso.
- Partir de una copia funcional del TP 07 individual y conservar el original. Nombre sugerido: `tp-08-salas-http-mongodb`. No copiar historial Git, `node_modules` ni `.env`; conservar versiones, manifiesto y lockfile.
- Usar MongoDB Atlas **Free (M0)**, base **`reservas_salas_u8`**, colección **`reservas`**. El modelo y las operaciones de terminal del TP 07 deben estar completos antes de integrar HTTP.
- Migrar creación, listado, consulta por ID y conteo a MongoDB mediante un servicio asíncrono compartido por HTML y API JSON. Ambos deben recuperar los mismos documentos.
- Retirar del arranque las importaciones y el uso del servicio/arreglo/semilla en memoria. Las referencias pueden conservarse inactivas. No insertar automáticamente al iniciar o listar; no borrar datos.
- API de creación y consulta: no implementar `PUT`, `PATCH` ni `DELETE`. No publicar el servidor en Internet en esta unidad. Una colección Postman exportada sin secretos es opcional.

## 2. Arquitectura, configuración y arranque (apartados 3, 6 y 7)

Conservar CommonJS y las carpetas `src/config`, `src/modelos`, `src/servicios`, `src/controladores`, `src/rutas`, `src/middleware`, más `scripts/` en la raíz, `views/` y `public/`. Separar routers HTML y API; no poner HTTP en el modelo ni respuestas en el servicio. Los nombres de archivos nuevos se resolverán al implementar, sin reestructurar lo que funciona.

| Capa | Responsabilidad requerida |
| --- | --- |
| `src/index.js` | Leer entorno, esperar conexión, luego abrir puerto; cierre ordenado con `SIGINT` y `SIGTERM`. No anunciar disponibilidad si falla configuración, red o DNS. |
| `src/config/` | Configuración y conexión centralizadas; conservar el ajuste DNS acordado con la red, sin repetirlo por solicitud. |
| `src/modelos/` | Esquema, validaciones y colección explícita `reservas`. |
| `src/servicios/` | Crear, listar con criterio explícito, buscar por ObjectId y contar; operaciones asíncronas sin respuestas Express. |
| Controladores y rutas | Consumir el mismo servicio con `await` o retorno de promesas; presentación HTML y JSON separadas. |
| `src/middleware/` | Entrada y errores HTTP; manejador de errores de cuatro parámetros después de las rutas. |
| `scripts/` | Reutilizar conexión/modelo; cerrar recursos al terminar. El servidor mantiene la conexión entre solicitudes. |

Inicio implementado: `npm start`, equivalente a `node --env-file=.env src/index.js`; espera conexión antes de abrir el puerto. El autor ya informó su uso real y hay una captura de arranque. Esta auditoría no inicia el servidor. La plantilla pública contiene `PORT`, `NODE_ENV` y una URI con marcadores dirigida a `reservas_salas_u8`. Un `HOST` de ejemplo no permite conectarse. `.env` queda privado, sin copiar secretos a código, documentos o capturas.

## 3. Modelo y entrada (apartado 4)

| Campo | Regla |
| --- | --- |
| `estudiante` | String obligatorio, `trim`. |
| `email` | String obligatorio, `trim`, presencia de `@`. |
| `sala` | String obligatorio; enum `Sala Norte`, `Sala Sur`, `Sala Multimedia`. |
| `fecha` | String obligatorio, `trim`; no convertir a Date. |
| `turno` | String obligatorio; enum `Mañana`, `Tarde`, `Noche`. |
| `personas` | Number obligatorio, entero entre 1 y 6. |
| `estado` | Agregar enum `pendiente`/`confirmada`, default `pendiente`. El cliente no lo asigna al crear. |

Copiar explícitamente **solo los seis campos de entrada**; nunca pasar `req.body` completo a Mongoose. Ignorar `estado` y `_id` enviados por el cliente, generando ID propio y estado pendiente. Esa entrada con campos extra y seis datos válidos sí crea una reserva. No existe operación para confirmar.

Rechazar cuerpos ausentes, texto sin parser, entradas vacías y tipos inapropiados, en particular booleanos, arreglos u objetos como `personas`. No confiar en conversiones implícitas de `String`/`Number`/Mongoose. Mantener validación en el modelo además de la validación de entrada. El formulario inválido responde 400 y conserva valores.

Límites: no se exige email completo, fecha real/futura, solapamientos, cupos compartidos, deduplicación ni índice único. El default no aporta autenticación/autorización ni migra documentos antiguos.

## 4. Contratos HTTP (apartados 5 a 7)

| Método y ruta API | Respuesta obligatoria |
| --- | --- |
| `GET /api/reservas` | 200 y arreglo, incluido `[]` cuando no hay documentos. |
| `GET /api/reservas/:id` | 200 y recurso; ID mal formado: 400 JSON; ID válido inexistente: 404 JSON. |
| `POST /api/reservas` | Tras guardar: 201, recurso persistido y cabecera de respuesta `Location` que permite consultarlo. |
| `GET /api/reservas?sala=Sala%20Norte` | 200, coincidencias exactas; sin coincidencias: 200 y `[]`. |
| Creación inválida, cuerpo ausente o JSON mal formado | 400 JSON, sin escritura. |
| Filtro `sala` repetido como arreglo o de tipo no textual | 400 JSON. |
| Ruta API desconocida | Respuesta JSON de recurso/ruta ausente, no página HTML. |
| Fallo inesperado de operación | 500 JSON, sin traza ni secretos. |

Representación: `id` textual derivado del ObjectId, los seis campos y `estado`. No aplicar `Number` a un ID. El filtro admite una sala textual aun fuera del enum de creación; construir el criterio explícitamente, sin pasar `req.query` completo ni aceptar operadores MongoDB. No se exige ordenar ni paginar.

Preservar inicio, CSS, layout y página inexistente. Listado y detalle HTML existentes deben leer MongoDB y conservar los nombres que usan las vistas. El formulario válido espera la escritura y redirige 302; el inválido conserva valores con 400. `/estado` mantiene su contrato actual: `{ servicio: "activo", reservas: <conteo>, solicitudId: <id de solicitud> }`, con conteo obtenido desde MongoDB. El inicio también consume el conteo asíncrono.

Con Express 5, esperar o retornar las operaciones async. Distinguir entrada inválida, recurso ausente y fallo interno; no convertir fallos en `[]` o 200. HTML y diagnósticos tampoco deben publicar trazas, URI o contraseñas.

## 5. Pruebas obligatorias y evidencia (apartados 5, 8 y 9)

Realizar API en **Postman de escritorio**, con el servidor activo. Base ilustrativa: `http://localhost:3000`, adaptada a `PORT`. Los GET usan Body `none`. Para POST elegir Body `raw`/`JSON` y comprobar la cabecera de solicitud `Content-Type: application/json`.

Ejemplo ficticio de creación del PDF; la fecha es ilustrativa y no se exige que sea futura:

```json
{
  "estudiante": "Ana Ejemplo",
  "email": "ana@example.com",
  "sala": "Sala Norte",
  "fecha": "2026-10-21",
  "turno": "Mañana",
  "personas": 2
}
```

Enviar el POST de referencia una sola vez, sin `estado` ni `_id`. Registrar 201, ID textual, seis campos, `estado: "pendiente"` y **Location de la respuesta**. Si Location es relativa, anteponer el origen local para el GET siguiente. Un POST válido repetido pide otra creación.

La siguiente tabla conserva los resultados esperados del PDF. Para el estado actual, consultar los resultados manuales, la matriz de capturas y los pendientes del README, resumidos en los apartados 9 y 10. Registrar cantidades antes/después y evidencia cuando corresponda; no declarar aprobados casos que no se informaron.

| Caso, por separado cuando se indican variantes | Resultado esperado |
| --- | --- |
| Listado inicial; vacío solo si la base es nueva | 200, arreglo; registrar cantidad inicial. No vaciar datos para obtener `[]`. |
| Creación válida | 201, Location, ID textual y default pendiente. |
| GET a Location / ID creado | 200, mismo ID, campos y estado. |
| GET al mismo ID después de reiniciar con igual base | 200, mismo recurso; localizarlo también en el sitio. |
| ID `1` | 400 JSON. |
| ID `000000000000000000000000` | 404 JSON **solo si no existe**; su formato es válido. |
| Estudiante vacío; email sin `@` | 400; cantidad sin aumento. |
| Sala no permitida; turno no permitido | 400; cantidad sin aumento. |
| Fecha vacía | 400; cantidad sin aumento. |
| `personas`: `0`, `7`, `2.5`, `"abc"` | 400 por cada caso; cantidad sin aumento. |
| `personas`: `true`, arreglo, objeto | 400 por cada caso; cantidad sin aumento. |
| POST sin cuerpo; JSON deliberadamente incompleto | 400 JSON por caso; cantidad sin aumento. |
| Campos extra `estado: "confirmada"` o `_id` con seis datos válidos | Se ignoran; alta válida con ID propio y estado pendiente. Registrar el aumento. |
| Filtro por sala exacta | Solo coincidencias; Params `sala` = `Sala Norte`. |
| Sala textual sin coincidencias | 200, `[]`; registrar el texto utilizado sin borrar documentos. |
| Dos parámetros `sala` activos con valores diferentes | 400. Desactivar filtros antes de comparar totales. |
| Dos listados consecutivos | Cantidad estable. |
| Formulario válido / inválido, en navegador | 302 después de guardar / 400 y valores conservados. |
| Inicio, listado, detalle, CSS, layout y ruta inexistente | Sitio correcto y mismos documentos que API. |
| `/estado` | Contrato conservado y conteo persistente. |
| Arranque con URI ausente | No abre el puerto ni anuncia disponibilidad. |
| Fallo inesperado durante operación | 500 JSON seguro; simulación controlada o entorno de ejercicio acordado, sin alterar usuarios, acceso o clústeres compartidos. |

Secuencia de persistencia: GET sin filtros y cantidad inicial → POST único y guardar ID/Location → GET a Location → detener/reiniciar con la misma base → GET al mismo ID y encontrarlo en HTML → listar dos veces con cantidad estable → inspeccionar `reservas_salas_u8/reservas` en Atlas y comparar `_id`. No repetir el POST ni borrar la colección para demostrar persistencia.

En negativos, duplicar la solicitud y cambiar un dato por vez; volver al GET sin filtros después de cada rechazo. Restaurar los datos de prueba válidos al terminar. Capturas recortadas, con datos ficticios y sin secretos: deben identificar método, URL, estado, resultado, Location en el POST, mismo ID antes/después del reinicio y cantidades en rechazos.

## 6. Calidad, README y evaluación (apartados 10 a 12)

Al implementar, ejecutar `npm run format` y `npm run check` sobre `src` y `scripts`, manteniendo las reglas del TP 07. `format` escribe; `check` verifica formato y lint sin escribir. Conservar versiones, CommonJS y lockfile. No agregar dependencias sin necesidad.

El README final debe explicar origen de la copia, versiones, preparación de Atlas, entorno y ajuste DNS, inicio, estructura por capas, tabla de endpoints, JSON sin secretos, pasos reproducibles de Postman (método, URL, Body, cabecera y respuesta), matriz observada y sus evidencias, reinicio, límites de validación y comparación con TP 07. Identificar qué uso/importaciones del almacenamiento en memoria se retiró; evitar dos fuentes activas del dominio.

| Criterio | Peso |
| --- | --- |
| Arranque, conexión, estructura y continuidad | 20% |
| Modelo, defaults y validación de entrada | 20% |
| Endpoints, respuestas y representación del ID | 25% |
| Persistencia, casos negativos y criterio exacto | 25% |
| Calidad, README y protección de secretos | 10% |

Antes de entregar: repositorio accesible al docente con código, manifiesto, lockfile, plantilla y README; conexión esperada antes de escuchar y mantenida entre solicitudes; servicio compartido; 201/Location solo después de guardar; 400/404 distintos; reinicio sin pérdidas ni duplicados; rechazos sin escrituras; sin secretos, `node_modules` ni datos personales reales. Publicación/commits/push quedan fuera de la etapa actual.

## 7. Diagnóstico inicial observado (histórico, 16/11/2026)

### Estructura y procedencia

Están `src/`, `scripts/`, `views/`, `public/`, manifiesto, lockfile, `.gitignore`, `.env.example`, `eslint.config.js` y README. Hay 10 archivos JS en `src`, 3 programas en `scripts`, 6 vistas EJS y una hoja CSS. No se detectaron importaciones faltantes ni configuración EJS/estáticos rota.

La identidad `tp-07-salas-mongodb` en manifiesto/lockfile, el README y la separación entre memoria HTTP y MongoDB de terminal son coherentes con TP 07. No se encontró una carpeta `tp-07*` en el Escritorio para comparar hashes con el original: **no se certifica una copia idéntica al TP 07**. El README relata pruebas anteriores; no se volvieron a comprobar contra Atlas.

No hay `.git` local ni en los directorios antecesores examinados; no se inicializó ni modificó Git. `.gitignore` contiene las reglas `.env` y `node_modules/`. No había `.env` ni `node_modules` al comenzar; no se leyó ni creó un `.env`. La plantilla revisada contiene marcadores públicos.

### Brechas y archivos implicados

| Observación | Cambio pendiente, sin implementar |
| --- | --- |
| `src/index.js` carga cuatro reservas en un arreglo y escucha directamente | Quitar semilla activa; esperar conexión antes del puerto; manejar fallo de inicio, SIGINT y SIGTERM. |
| `src/servicios/reservas.js` es síncrono y usa arreglo/IDs numéricos | Servicio MongoDB asíncrono, ObjectId textual, filtro exacto y conteo. |
| Controlador HTML usa llamadas síncronas y `Number(req.params.id)` | Adaptar todos los consumidores, incluido inicio y `/estado`, sin romper nombres de vistas ni formulario. |
| Solo existe router HTML; `/api/reservas` responde 404 HTML | Agregar router/controlador API, representación y Location. |
| `src/modelos/reserva.js` tiene seis campos y colección explícita correcta | Agregar `estado`; conservar validaciones y opciones que evitan crear colección/índices al consultar. |
| Middleware convierte valores con `String`/`Number` | Rechazar tipos antes de convertir: se comprobó que acepta `personas: [2]`. |
| Mongoose convierte `personas: true` a `1` y lo valida | Reforzar entrada y validación del modelo para cubrir los tipos exigidos. |
| `src/app.js` no registra middleware final de errores | Manejar JSON mal formado, 400/404/500 y rutas API desconocidas con respuestas seguras. |
| `.env.example` apunta a `reservas_salas_u7`; `npm start` no carga `.env` | Preparar plantilla u8 y comando de inicio con carga de entorno. No tocar bases ni credenciales u7. |
| Conexión centralizada ya espera `mongoose.connect`; scripts cierran en `finally` | Reutilizar estas piezas. DNS existente: `8.8.8.8` y `1.1.1.1`; confirmar su continuidad en la red utilizada. |
| README y nombre del paquete siguen siendo TP 07 | Actualizarlos coherentemente al pasar a implementación, manteniendo versiones y lockfile. |
| README enlaza dos capturas en `evidencias/`, carpeta ausente | Enlaces heredados rotos: no se recuperaron ni inventaron evidencias. Crear evidencia propia de TP 08 más adelante. |
| Footer `views/layouts/main.ejs` dice TP 05 | Ajuste documental menor pendiente; no afecta el funcionamiento actual. |

### Verificaciones realizadas en esta etapa

- PDF completo extraído y revisado visualmente; copia confirmada por SHA-256.
- `package.json` y raíz del lockfile v3 coinciden en dependencias y devDependencies; 170 paquetes fijados y resoluciones al registro público sin credenciales en esas URL.
- `npm ci --ignore-scripts --no-audit --no-fund`: salida 0, 170 paquetes instalados; sin scripts de instalación ni nuevas dependencias declaradas. `node_modules/` queda local y excluido. Manifiesto y lockfile se conservaron.
- Entorno: Node `v24.19.0`, npm `11.17.0`. `npm ls --depth=0`: salida 0; EJS `7.0.1`, Express `5.2.1`, express-ejs-layouts `2.5.1`, Mongoose `9.12.1`, Morgan `1.12.1`, ESLint `10.14.0`, @eslint/js `10.0.1`, Prettier `3.9.10`.
- `npm run check`: salida 0; formato y lint aprobados sin escribir archivos.
- `node --check` en los 13 JS de `src`/`scripts` y en `eslint.config.js` (14 archivos), más resolución estática de 22 importaciones: sin errores. La carga real de la configuración ESLint se comprobó mediante lint.
- Ensayo HTTP ad hoc en `127.0.0.1`, puerto efímero y servicio en memoria aislado con datos ficticios: 11 comprobaciones aprobadas. Inicio, lista, formulario nuevo, detalle y CSS: 200; detalle ausente y ruta inexistente: 404; `/estado`: 200 y contrato/conteo correctos; formulario inválido: 400, valor conservado y sin alta; formulario válido: 302 a `/reservas` y alta solo en memoria temporal. `/api/reservas`: 404 HTML, confirmando la API pendiente. Servidor cerrado al terminar.
- Validación local con `new Reserva(...).validate()`, sin conexión ni guardado: ejemplo válido aceptado; `personas` 0, 7, 2.5, `"abc"`, `[2]` y `{}` rechazados por el modelo. `true` aceptado por conversión a 1. Middleware: mismos inválidos rechazados salvo `[2]`, que se convierte a 2 y pasa. Son brechas registradas, no aprobaciones del TP 08.
- La primera ejecución de los ensayos ad hoc se descartó por la codificación de caracteres del script enviado por PowerShell; se repitieron con escapes Unicode y los resultados anteriores corresponden a esa repetición corregida.
- No se ejecutaron los scripts de terminal, no hubo conexión/escritura/borrado en Atlas ni pruebas Postman. No se ejecutó `npm audit`: las alertas del README son históricas, no una evaluación actual. No se ejecutó `format`, para preservar los archivos existentes.
- Verificación SHA-256 final: los 27 archivos preexistentes conservan su contenido. Solo se agregaron esta guía, la copia del PDF y las dependencias locales excluidas; sin commits, push ni publicaciones.

## 8. Segunda etapa implementada (17/11/2026)

- Servicio asíncrono basado en `Reserva`, compartido por HTML y API: creación con lista explícita de seis campos, listado/filtro exacto, búsqueda por ObjectId y conteo. Se eliminó el arreglo y la semilla del arranque; no hay carga automática ni operaciones de borrado.
- Modelo con estado predeterminado `pendiente` y enum `pendiente`/`confirmada`. Se deshabilitaron conversiones de tipos en campos del esquema; `personas` rechaza incluso objetos con `_id`. API exige personas numérico; el formulario urlencoded convierte únicamente su texto de entero decimal. Ambos rechazan tipos incorrectos antes de guardar.
- Router y controlador API independientes; ID textual, 201/Location después de crear, errores 400/404/500 y JSON en rutas API desconocidas. El único parámetro de consulta admitido es `sala`; se rechazan filtros adicionales, operadores y salas repetidas.
- Controladores HTML, inicio y `/estado` adaptados a promesas; formulario válido espera la creación, inválido conserva valores con 400. Mismas vistas y CSS. La etiqueta de la vista de errores muestra el estado HTTP correspondiente sin cambiar su diseño.
- Arranque espera conexión y confirma escucha antes de anunciar disponibilidad. Cierre por SIGINT/SIGTERM: deja de aceptar solicitudes, espera cierre HTTP y luego desconecta MongoDB, una sola vez. Fallos de conexión o escucha liberan recursos y producen salida distinta de cero.
- Conexión centralizada con `dbName: "reservas_salas_u8"`, que prevalece sobre la base indicada en la URI. Colección explícita `reservas`; DNS previo conservado. **Los scripts heredados también usarán u8**, porque reutilizan la misma conexión; no ejecutarlos en esta etapa.
- `.env.example`, identidad de manifiesto/lockfile y README actualizados. Versiones y dependencias conservadas. `npm start` carga `.env`; `npm test` ejecuta pruebas locales sin credenciales y con conexión real bloqueada. No se creó ni leyó `.env`.

Comprobación local: 110 pruebas aprobadas con dobles de operaciones Mongoose y validación real del esquema, HTTP en localhost y arranque con dependencias simuladas. Cubren entradas inválidas, campos extra, ID/Location, filtros, HTML/conteos compartidos, fallos 500 seguros, ausencia de URI, espera de conexión y cierre por ambas señales. `npm run format`, `npm run check`, comprobación de formato del archivo de pruebas, sintaxis de 20 archivos JS, resolución de 50 importaciones y `npm ls --depth=0`: aprobados. Manifiesto/lockfile consistentes y versiones conservadas. El PDF, scripts de terminal, CSS y diseño de las vistas se conservan; no se tocó el TP 07 original ni se hizo commit/push.

Archivos modificados: `.env.example`, `package.json`, `package-lock.json`, `README.md`, esta guía, `src/app.js`, `src/index.js`, `src/config/base-datos.js`, `src/config/entorno.js`, `src/controladores/reservas.js`, `src/middleware/reservas.js`, `src/modelos/reserva.js`, `src/servicios/reservas.js` y `views/no-encontrado.ejs` (solo etiqueta de estado).

Archivos nuevos: `src/errores.js`, `src/modelos/opciones-reserva.js`, `src/controladores/api-reservas.js`, `src/rutas/api-reservas.js`, `src/middleware/errores.js` y `tests/tp08.test.js`.

Pendientes al cerrar la segunda etapa: conexión real, matriz Postman, reinicio y evidencia de Atlas. Eran pendientes de ese momento; el informe posterior del autor se registra en el apartado 9. Los dobles locales no prueban persistencia de MongoDB.

## 9. Revisión documental y resultados manuales informados (histórico, 17/11/2026)

El autor comunicó 32 resultados de pruebas realizadas personalmente con Postman, Chrome y Atlas. El README incorpora la matriz completa, las tres reservas ficticias y la secuencia de persistencia con el mismo ID tras reiniciar. Se informó listado inicial vacío, POST 201 con Location y estado pendiente, consultas 200, filtros, rechazos 400 sin altas adicionales, 404 HTML/JSON, formulario y conteos de 2 y luego 3. La variante extra `estado: "confirmada"` fue ignorada. No se proporcionaron los valores literales de ID/Location ni capturas; no se inventaron.

El estado final informado es de tres reservas válidas. No se aportaron conteos individuales antes/después de cada rechazo. La redirección del formulario fue informada sin código HTTP exacto: el esperado 302 queda pendiente de registrar. El README distingue esos puntos de los resultados confirmados por el autor.

Pendientes documentales: capturas/registros que identifiquen método, URL, estado, Location, mismo ID antes/después del reinicio y en Atlas; desglose de cantidades por rechazo; confirmación Atlas Free M0; código de redirección; registros de las pruebas locales históricas de URI ausente y error 500; comprobación de cierre real; y acceso del docente al repositorio cuando se autorice publicar. La simulación controlada del 500 es válida según el PDF. Texto sin parser, `_id` extra y tipos inválidos en campos de texto no fueron informados manualmente; no se presentan como realizados. El PDF admite `estado` o `_id` para la prueba de campos extra.

Esta revisión modifica únicamente README, esta guía y el texto del footer de TP 05 a TP 08. Conserva CSS, diseño y lógica. `npm run format` y `npm run check` finalizaron con código 0, con todos los JS sin cambios. Comparación SHA-256 de 31 archivos de código, configuración, vistas, CSS y PDF: solo cambió el layout por el texto autorizado del footer. Se revisaron 32 archivos públicos sin detectar URI MongoDB privadas ni los patrones de secretos buscados; `.env` existe, no se leyó y está excluido junto con `node_modules/`. No hay repositorio Git activo ni archivos rastreados. No se realizaron conexiones, POST ni escrituras en Atlas ni commit/push. Las 110 pruebas simuladas corresponden a la etapa anterior, no a una nueva ejecución.


## 10. Auditoría de las 14 capturas (18/11/2026)

Se revisó cada PNG de `docs/evidencias/` visualmente, y se compararon los píxeles para detectar duplicados. Las 14 imágenes son legibles, corresponden con sus nombres y no hay duplicados exactos ni por píxeles. No se renombran, borran ni editan: el nuevo [índice](evidencias/INDICE.md) las organiza y el README enlaza todas con sus límites.

Quedan observados POST 201 y Location de Valentina Evidencia, GET 200 a esa Location, documento Atlas coincidente y GET 200 informado como posterior al reinicio, con ID `6afdd89129eba0afe170edf0`. El otro GET por ID muestra a Jeremias y es un recurso distinto. La terminal muestra arranque, no el cierre previo ni por sí sola toda la secuencia de reinicio.

La captura del POST `/reservas` desde Postman muestra Martin Prueba, 302 Found y Location `/reservas`; queda resuelta la falta del código 302, pero no sustituye una captura del formulario en Chrome. Se ven además email inválido 400, listado completo posterior 200 con cinco documentos, ID `/1` 400, ID válido inexistente 404, filtro Sala Norte con Jeremias y Martin y sala repetida 400.

Cronología: 0 al inicio informado; 3 en el primer informe (Jeremias, Lucia, Carlos); 5 tras las altas adicionales de Martin y Valentina. El rechazo posterior conserva 5 según el autor y la captura posterior muestra esos cinco. Falta el conteo inmediatamente anterior y el registro por cada rechazo: no se deduce automáticamente igualdad de cantidades de una sola imagen.

Pendiente por evidencia: resto de negativos de la matriz y campos extra ignorados; listados consecutivos/conteos por rechazo; HTML (listado, detalle, inicio y formulario inválido con valores), `/estado`, CSS, rutas inexistentes y filtro sin coincidencias; nivel Atlas Free M0; registros de pruebas locales de URI ausente y 500, y cierre real ordenado. Muchos fueron informados antes, pero no aparecen en estas capturas. La publicación/acceso del docente sigue pendiente de autorización. El README contrasta estos puntos con los cinco criterios de evaluación sin asignar una nota.

`Untitled` se conserva: nota del error de email y sugerencias de continuación, sin valor de prueba independiente. No contiene una prueba de actualización ejecutada.

No se observan contraseñas, tokens ni URI privadas en los PNG. Sí hay metadatos de cuenta y una ruta personal de Windows: revisar privacidad antes de publicar, sin alterar los originales. `.env` no se lee; la revisión textual busca patrones de secretos en archivos públicos. No se ejecutan HTTP, MongoDB, formato, lint ni pruebas en esta auditoría de imágenes, y no se cambia código, vistas, CSS, dependencias ni Git.

## 11. Ampliación a 19 capturas, con servidor apagado (18/11/2026)

Se identificaron cinco archivos nuevos `08-*.png`: inicio con contador 5, listado de las cinco reservas, detalle de Valentina con ID `6afdd89129eba0afe170edf0`, formulario con seis campos y `/estado` con servicio activo/reservas 5. Se inspeccionaron los cinco; los 14 anteriores se revalidaron sin cambios por SHA-256. No hubo imágenes inaccesibles. Las capturas de navegador no muestran códigos HTTP; las de inicio, detalle y formulario tampoco muestran URL. No se afirman esos datos por la imagen sola.

El README y el índice enlazan las 19 imágenes y separan tres estados: con captura; probado antes pero sin captura/registro adjunto; no verificado en entorno real o sin registro suficiente. Se conserva 0 → 3 → 5: las dos altas adicionales fueron Martin y Valentina, los rechazos no agregaron reservas según el autor y los cuatro conteos visibles (API, HTML, inicio y estado) coinciden en cinco. No se consultó la base actual; falta el conteo inmediatamente anterior por cada rechazo y dos listados estables.

`npm run check`: código 0, formato y lint aprobados. No se ejecutó `format`. La suite completa `npm test` abre servidores HTTP temporales, por lo que no se ejecutó con la restricción actual. Se ejecutó únicamente `node --test --test-name-pattern "^(Modelo:|Servicio descarta)" tests/tp08.test.js`: 49 pruebas aprobadas, 0 fallos, sin puertos ni Atlas. Las 110 pruebas completas aprobadas siguen siendo un resultado histórico distinto.

Scripts/configuración revisados sin arrancar: CommonJS; start con `--env-file=.env`; MongoDB usa `MONGODB_URI` y fuerza u8; DNS heredado conservado; conexión esperada antes de listen; señales registradas para cierre ordenado. No se leyó `.env` ni se instaló nada.

Pendiente de captura/registro: demás negativos de la matriz y campos extra, conteos por rechazo/listados consecutivos, formulario inválido con seis valores, rutas inexistentes, listado inicial vacío y filtro sin coincidencias; esos resultados fueron informados anteriormente. URI ausente, 500 y señales tienen pruebas locales previas, pero faltan sus registros adjuntos y el cierre real no fue informado. M0 y acceso del docente aún no se verificaron. No se debe borrar información para recrear un listado vacío. La entrega completa exige resolver los pendientes, aunque puede prepararse la etapa de GitHub.

Las imágenes originales se conservan. No se ven credenciales ni URI privadas, pero persisten metadatos de cuenta, ruta local y barra de extensiones: revisar privacidad antes de publicar. No se inicializó Git ni se tocó código, vistas, CSS, dependencias o Atlas.


