# Capturas del TP 08

Inventario actual: 21 PNG y un registro de 110 pruebas aprobadas. La captura de puerto libre incluye arranque y regreso al prompt; el archivo separado `11-cierre-servidor-ctrl-c.png` no se encontró. Consultar [INDICE.md](INDICE.md) y README para distinguir observación manual, simulación y pendientes obligatorios. Se mantienen los originales. La tabla siguiente es una propuesta histórica, no una exigencia de una imagen por cada prueba ni una orden para repetir solicitudes.

Guardar aquí únicamente capturas reales, recortadas y legibles. En Postman deben verse método, URL, estado HTTP y resultado. No incluir contraseñas, tokens, URI privadas ni datos personales reales.

| Nombre propuesto | Qué mostrar | Importancia según la consigna |
| --- | --- | --- |
| `01-api-post-201.png` | POST API: 201 Created, ID textual, seis campos, estado pendiente y cabecera de respuesta Location. | Evidencia obligatoria de creación. |
| `02-api-get-id-200.png` | GET a Location: 200 OK, mismo ID y datos que en la creación. | Evidencia obligatoria de consulta. |
| `03-persistencia-despues-reinicio.png` | Registro del reinicio de Node.js y GET posterior con el mismo ID. Comparar con la captura 02. | Evidencia obligatoria de persistencia. |
| `04-atlas-documento.png` | Base `reservas_salas_u8`, colección `reservas` y documento con el mismo `_id`. | Evidencia obligatoria de persistencia en Atlas. |
| `05-validacion-400-<caso>.png` | Un caso por archivo: entrada inválida y respuesta 400 Bad Request. Ejemplos de sufijo: `estudiante-vacio`, `personas-true`, `json-mal-formado`. Acompañar con cantidades antes/después del rechazo. | Evidencia obligatoria de rechazos sin escritura; cubrir la matriz de la guía. |
| `06-formulario-post-302.png` | En Network de Chrome, solicitud POST del formulario: 302 Found y cabecera de respuesta Location `/reservas`. | Captura relevante para acreditar el comportamiento HTML obligatorio. |
| `07-html-listado-contador.png` | Listado HTML con las reservas de la API y contador del inicio o de `/estado`. Si hacen falta dos capturas, usar sufijos `-listado` y `-contador`. | Captura relevante para acreditar continuidad HTML y conteo persistente. |

Los nombres y la división en archivos son una propuesta: el PDF exige evidencias y registros verificables, no exactamente siete imágenes. Estas capturas no sustituyen la matriz completa de pruebas.

- Conservar el mismo ID en creación, consulta, reinicio y Atlas. No repetir POST para demostrar persistencia ni borrar reservas.
- Para el caso 05, registrar cantidades sin filtros antes/después de cada rechazo; incluir también dos listados consecutivos con cantidad estable en los registros de persistencia.
- Usar respuestas o registros ya obtenidos cuando estén disponibles. Cada POST válido adicional crea otra reserva; no repetirlo solo para obtener una imagen.
- Si falta una evidencia, dejarla pendiente. No crear imágenes vacías ni presentar ejemplos como resultados reales.

Referencia: [guía del TP 08](../GUIA-TP08.md), apartados 5 y 9; [consigna oficial](../consigna/semana-08-trabajo-practico-08.pdf), apartados 5, 6, 8, 9 y 10.
