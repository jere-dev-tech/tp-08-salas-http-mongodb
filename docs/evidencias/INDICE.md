# Índice de evidencias del TP 08

Auditoría final del 18/11/2026: 21 PNG y un registro de pruebas, 22 evidencias. Se conserva todo sin modificar. Solo se encontró una de las dos capturas de cierre anunciadas: `11-cierre-servidor-puerto-libre.png`; `11-cierre-servidor-ctrl-c.png` no está disponible y no se enlaza como si existiera.

| Orden de lectura | Archivos y contenido |
| --- | --- |
| 1. Creación API | [Cuerpo 201](01-api-post-201.png) y [cabecera Location](01-api-post-201-location.png), ambos de Valentina Evidencia. |
| 2. Consultas | [GET por ID de Jeremias](02-api-get-por-id.png) y [GET a Location de Valentina](02-api-get-location.png). Son recursos distintos. |
| 3. Atlas | [Documento coincidente de Valentina](03-mongodb-atlas.png), en la base u8 y colección reservas. |
| 4. Rechazo y cantidad | [Email inválido 400](04-validacion-400.png) y [listado posterior 200 con cinco reservas](04-validacion-conteo-sin-cambios.png). Falta conteo inmediatamente anterior. |
| 5. HTML e identificadores | [POST HTML 302 desde Postman](05-formulario-302.png), [ID inválido 400](05-api-id-invalido-400.png) e [ID válido inexistente 404](05-api-id-inexistente-404.png). |
| 6. Filtros | [Sala Norte 200: Jeremias y Martin](06-filtro-sala-norte-200.png) y [sala repetida 400](06-filtro-sala-repetida-400.png). |
| 7. Persistencia | [Arranque de Node.js](07-reinicio-servidor.png) y [GET posterior de Valentina 200](07-persistencia-despues-reinicio.png). El cierre previo no está capturado; la secuencia de reinicio fue informada por el autor. |
| 8. Inicio HTML | [Inicio y contador](08-html-inicio-contador.png): cinco reservas, navegación y footer TP 08. No se ve URL ni código HTTP. |
| 9. Listado HTML | [Listado de reservas](08-html-listado-reservas.png): URL `/reservas` y cinco tarjetas completas: Jeremias, Lucia, Carlos, Martin y Valentina. Sin estado HTTP visible. |
| 10. Detalle HTML | [Valentina Evidencia](08-html-detalle-valentina.png): mismo ID y seis campos que API/Atlas. No se ve URL ni código HTTP. |
| 11. Formulario | [Nueva reserva](08-html-formulario-nueva-reserva.png): seis campos y botones Guardar/Cancelar; no muestra envío ni validación. |
| 12. Estado | [Endpoint `/estado`](08-endpoint-estado.png): URL y JSON con servicio activo, reservas 5 y solicitudId `BIB-0013`. No muestra código HTTP. |
| 13. Clúster gratuito | [Atlas Free Tier](09-mongodb-atlas-free-tier.png): Cluster0, `CLUSTER TIER: Free` y `This is a Free Tier Cluster`. Acredita el clúster gratuito exigido por el PDF (Free/M0); la imagen no imprime literalmente M0. |
| 14. Pruebas aisladas | [Salida real de npm test](10-npm-test.txt): 110 pruebas aprobadas, 0 fallos, salida 0. Incluye URI ausente, errores 500, espera de conexión y manejadores SIGINT/SIGTERM simulados. Es texto, no una captura. |
| 15. Cierre manual y puerto | [Terminal y puerto libre](11-cierre-servidor-puerto-libre.png): npm start, disponibilidad, vuelta al prompt y consulta de listeners en 3000 sin resultados. No muestra `^C`; el uso de Ctrl+C lo informa el autor. |

## Resultado de la revisión

- No hay imágenes vacías ni dañadas. Las 14 anteriores no tenían duplicados por píxeles; sus hashes siguen iguales. No hay archivos PNG idénticos por SHA-256 entre los 19. Los pares cuerpo/cabecera y GET antes/después son complementarios.
- Los nombres corresponden al contenido. `04-validacion-400.png` tiene un nombre general, pero solo muestra email inválido. `04-validacion-conteo-sin-cambios.png` muestra cinco después; su nombre no sustituye la prueba del conteo anterior. `05-formulario-302.png` muestra Postman, no el navegador.
- Métodos, URL, estados y resultados relevantes son legibles en las capturas de Postman. Atlas y terminal no son respuestas HTTP. Los recortes laterales y el espacio vacío no impiden leer la evidencia central.
- El POST, Location, Atlas y GET tras reinicio corresponden al ID `6afdd89129eba0afe170edf0`. El GET por ID de Jeremias usa otro ID; no confundir ambos.
- En algunas barras laterales de Postman, la solicitud guardada de creación figura como GET; el método activo mostrado es POST. Revisar la etiqueta si se exporta la colección.
- No se observan contraseñas, tokens ni URI privadas. Hay nombres de organización/proyecto, workspace, una ruta personal de Windows y, en el listado HTML, la barra de extensiones del navegador; revisar esos metadatos antes de publicar. No se alteraron los originales.

## Untitled

[Untitled](Untitled) es una nota de texto sobre el error 400 de email y su mensaje JSON. Incluye una explicación sin conteos y sugerencias de próximos pasos, una de ellas de actualización, que no forma parte del TP. No es evidencia independiente de ausencia de escritura ni una instrucción a ejecutar. Se conserva íntegro.

Cronología observada/informada: inicialmente 0; después de las primeras pruebas 3; después de crear Martin y Valentina 5. El POST inválido de **Sofia Validacion** respondió **400 Bad Request** (`04-validacion-400.png`), y el GET posterior respondió **200 OK con exactamente 5 reservas** (`04-validacion-conteo-sin-cambios.png`). No hay captura del conteo inmediatamente anterior a ese POST. Para los demás rechazos anteriores se verificó HTTP 400, pero **no se registró un conteo individual antes y después**. No se les asignan números ni capturas inexistentes. Inicio, listado HTML, API y `/estado` coinciden en cinco; los conteos de los tests son simulados y se identifican por separado.

Registro previo verificado: `npm test` completo aprobado (110/110). Usa modelos simulados, bloquea `mongoose.connect` y comprueba cero intentos de conexión y estado desconectado. HTTP temporal solo en `127.0.0.1` con puertos efímeros (`listen(0)`), sin ocupar 3000; se cierra al finalizar. El subproceso de URI ausente recibe un entorno sin credenciales y falla antes de abrir HTTP. No se cargó `.env` ni se puso en servicio la aplicación real durante esos tests. En esta auditoría final no se volvió a ejecutar ningún test ni se inició el servidor.

URI ausente: salida 1 esperada, diagnóstico y sin disponibilidad anunciada. Error 500: fallos simulados responden con estado correcto y sin filtrar secretos ni traza. SIGINT/SIGTERM: se invocan los manejadores registrados, con cierre único y orden HTTP → MongoDB. No se enviaron señales reales a la aplicación conectada. El registro adjunto permite distinguir estos resultados de pruebas manuales contra Atlas.

El README contrasta toda la matriz con capturas, informe manual y registro automatizado. La falta de PNG no significa falta de prueba: negativos, formulario inválido, rutas inexistentes, listados estables y campos extra tienen comprobación automática, además de los resultados manuales informados. Limitación documental declarada: no se registraron cantidades reales antes/después de cada rechazo de Postman; se informa el HTTP 400 verificado y, para Sofia, el GET posterior 200 con 5 reservas. Los conteos simulados no se presentan como reales. No se considera un bloqueo técnico para preparar el repositorio ni se inventan registros para completar la matriz. El acceso del docente se verificará después de publicar.

La revisión previa verificó enlaces y conservación de originales; esta actualización conserva también la nueva captura Free sin editarla. No se leyó `.env` ni se modificó código. La captura Free contiene metadatos de organización/proyecto, región y nombres parciales de nodos, sin contraseñas, tokens ni URI privadas visibles: revisar privacidad antes de publicar.

El cierre del proceso y la liberación del puerto están comprobados manualmente mediante la captura nueva y el informe de Ctrl+C. El orden HTTP → MongoDB y la idempotencia SIGINT/SIGTERM se verificaron por simulación. La desconexión real de MongoDB no se observó directamente en la terminal; se declara como límite, sin exigir una captura adicional como condición del PDF.

Privacidad por archivo: `07-reinicio-servidor.png` y `11-cierre-servidor-puerto-libre.png` muestran ruta local/usuario Windows; `03-mongodb-atlas.png` muestra organización/proyecto y otras bases; `09-mongodb-atlas-free-tier.png` muestra organización/proyecto, región y nodos parciales; `02-api-get-por-id.png` muestra workspace; `08-html-listado-reservas.png` muestra extensiones del navegador. No se ven contraseñas ni URI privadas. Se informan esos datos para revisar su publicación, sin editar los originales. `Untitled` es auxiliar y no una prueba independiente ni un requisito de entrega.

Ver la [matriz por captura y los pendientes del README](../../README.md#pruebas-manuales-y-evidencias-revisadas) y la [consigna oficial](../consigna/semana-08-trabajo-practico-08.pdf).

## Selección para publicación

Incluir código, vistas, CSS, scripts, tests, manifiesto/lockfile, configuración pública, `.env.example` con marcadores y documentación/evidencias revisadas. Excluir `.env`, `node_modules/` y cualquier secreto o respaldo privado. Las seis capturas enumeradas en privacidad requieren decisión manual antes de publicarse; no se alteran los originales. `Untitled` es auxiliar y no imprescindible.

Las reglas actuales de `.gitignore` se comprobaron con el motor `ignore` instalado, sin inicializar Git: excluyen `.env` y archivos de `node_modules/`, y permiten plantilla, código y lockfile. No garantizan protección frente a `git add -f` o archivos previamente rastreados; no se hizo staging ni se ejecutaron tests, servidor o Atlas.

