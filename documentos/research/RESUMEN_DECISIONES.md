# Resumen de decisiones de la investigación

Fecha: 2026-10-15. Insumo interno, no entregable. Fuentes con id `Fxx` en `fuentes.md`. Etiquetas: [VERIFICADO] fuente primaria o 2+ fuentes; [UNA FUENTE]; [INFERENCIA].

Nota de alcance: `documentos/00_marco_del_proyecto.md` no existe en el repo. Se usó `AGENTS.md` y `.docs/reto_cacao.md`. R5 se trató como "la conectividad rural es limitada". Esto solapa y confirma `documentos/investigacion/03` y `04`; aquí solo se anota lo nuevo.

## 1. Offline e idempotencia
- **Hallazgo:** Background Sync no está disponible en todos los navegadores (F01). La clave de idempotencia debe ser única por operación y no reutilizarse con otro contenido (F04). El borrador del IETF mapea: en curso = 409, clave repetida con contenido distinto = 422 (F04, F05). Safari puede borrar IndexedDB tras 7 días sin interacción (F03, secundaria).
- **Decisión:** `uuid_cliente` UNIQUE más hash del contenido. Repetición igual devuelve el `CACxxx` original; contenido distinto devuelve error 422 claro. Mostrar la antigüedad de cada elemento `pendiente` y avisar si pasa de 5 días. Reintento al abrir, al evento `online` y con botón, con espera creciente y aleatoria. Alimenta E03 y E05.
- **Riesgo:** el borrador del IETF no es RFC (citar como "en curso"). Cuotas de Safari: fuentes se contradicen (F02 dice 50 MB, F03 dice ~1 GB); no usar cifras.
- **Confianza:** alta en idempotencia [VERIFICADO]; media en la regla de 7 días [UNA FUENTE secundaria + nota previa].

## 2. ODK, Kobo, CommCare
- **Hallazgo:** ODK y Kobo generan `instanceID` en el cliente y el servidor responde 409 si ya existe (F07, F08). Hay reportes de ~10 % de duplicados en zonas rurales (F09, anécdota de foro). Las ediciones se modelan como versión nueva con `deprecatedID` (F07). CommCare sincroniza por diff contra un hash del estado del dispositivo (F10).
- **Decisión:** copiar el UUID de cliente. No copiar el 409 como error: para el operador un reenvío es éxito, devolvemos 200 con el original. Si el operador corrige una recepción `rechazada`, crear un `uuid_cliente` nuevo con referencia al anterior. No copiar la sincronización de ida y vuelta (casos, hashes); nuestro offline es solo de subida. Alimenta E03.
- **Riesgo:** F09 es una anécdota; no citarla como cifra. **Confianza:** media-alta.

## 3. Mezcla de lotes y estándares
- **Hallazgo:** identidad preservada = una sola fuente identificable; segregación = fuentes certificadas distintas pueden mezclarse pero separadas de lo no certificado; balance de masa = mezcla física y contabilidad administrativa (F11, F12, F13). GS1 Digital Link expresa el lote (AI 10, hasta 20 caracteres) como calificador de una clave como el GTIN (F14).
- **Decisión (para E03):** declarar "identidad preservada por lote; si una operación mezcla lotes, se conservan todos los orígenes con su cantidad (`transformacion_origen`); balance de masa descartado". No decir "cumple GS1": no tenemos GTIN. La URL de la ficha es propia (`/publico/fichas/CAC001`); `CACxxx` cabe en 20 caracteres si luego se quiere migrar. Alimenta E03.
- **Riesgo:** los nombres vienen de certificaciones de palma y madera, no de cacao colombiano; usarlos como analogía. **Confianza:** media [VERIFICADO en definiciones, INFERENCIA en la aplicación a cacao].

## 4. Cacao en Colombia y exportación
- **Hallazgo:** la EUDR (Reglamento UE 2023/1115, modificado en dic. 2025) aplica desde 2026-12-30 a operadores grandes y medianos y desde 2027-06-30 a micro y pequeños (F15, F16, F17) [VERIFICADO]. Exige origen por parcela con coordenadas (F19) y declaración de diligencia debida solo del primer operador (F16, F19). UPRA indica cerca de 65.000 familias, 190.000 ha y 62.000 t/año con 35 % exportado (F21, 2024-04-01) [UNA FUENTE]. Fedecacao tiene una Mesa Nacional de Trazabilidad (F22, solo publicaciones sociales).
- **Contradice nuestro enfoque:** trazabilidad por lote sin datos de parcela no basta para exportar a la UE. Es una limitación, no un detalle. F20 (secundaria) afirma que no se admite balance de masa.
- **Decisión:** no agregar campos de parcela al MVP (sin requisito en el reto). Declarar en E01 y E09 que la ficha cubre "primera milla y transformación" y que EUDR exige además geolocalización por parcela, como siguiente fase. No afirmar cumplimiento. **Riesgo:** afirmar cumplimiento sería una afirmación falsa ante el jurado. **Confianza:** alta en fechas; baja en "datos mínimos de lote" (INFERENCIA desde F19/F20).

## 5. Soluciones existentes
- **Hallazgo:** Koltiva, Farmforce, TraceX y Cropin existen y se orientan a compradores/exportadores con agentes de campo y EUDR (F23-F27, todas de proveedor salvo F23). Koltiva no publica precio; es "personalizado empresarial" (F23) [UNA FUENTE]. No encontré precios públicos de los otros.
- **Decisión:** en el pitch decir "no encontramos precios públicos; son soluciones de empresa para compradores" y no inventar una comparación de costo. Nuestro nicho defendible, sin afirmar que otros no lo hacen: merma, costo por etapa e inventario de una asociación (INFERENCIA; solo revisé páginas de trazabilidad). Alimenta E09 y el pitch. La cifra "15 USD por parcela" de F27 es de una transcripción automática: no usar.
- **Riesgo:** no medimos la alternativa real (cuadernos y hojas de cálculo); es hipótesis del piloto. **Confianza:** baja-media.

## 6. Conectividad en el Huila (R5)
- **Hallazgo:** 4G llega al 97 % de cabeceras y centros poblados a nivel nacional, con retos en zonas apartadas, y la región sur tiene los porcentajes de 4G más bajos (F28, F29) [VERIFICADO, corte 4T 2024]. Claro dice cubrir las 37 cabeceras del Huila y haber conectado 17 localidades rurales en 2023 (F31, proveedor). MinTIC reporta para Huila 2.974 de 4.380 accesos fijos instalados a jun. 2025 (F30) [UNA FUENTE].
- **Decisión:** las cifras miden cabeceras y centros poblados, no fincas ni centros de acopio. R5 no se confirma ni se refuta: llamarlo "supuesto no medido". Acción manual: consultar DaTIC (CRC) por Rivera, Campoalegre y Algeciras y registrar capturas fechadas en E01. No lo hice (mapa dinámico). Alimenta E01. **Confianza:** media.

## 7. Repositorios de referencia
- **Hallazgo:** StockSense (MIT, libro de movimientos solo de inserción, FastAPI) y `fastapi/full-stack-fastapi-template` (MIT, mantenido) existen (F32, F33). Solo leí descripción y licencia, no el código. La búsqueda de PWA offline con cola idempotente no devolvió repositorios. Otros repos de inventario son recientes y sin señales de calidad.
- **Decisión:** no usar ninguno como base: el reto pide código escrito en el evento y declarar cada tercero. Leerlos como lectura de ideas solo si sobra tiempo. Alimenta E08. **Confianza:** baja (sin revisión de código).

## Actualización 2026-10-16: verificación de fuentes y cierre

Origen: reporte de otra sesión de asistente pegado por el equipo; detalle por fuente en `fuentes.md`. No lo reproduje.

- **Idempotencia:** 422 queda como convención elegida y documentada en E03, no como estándar. Las claves de `operacion_procesada` no caducan (a diferencia de Stripe, 24 h).
- **Safari:** la expulsión a 7 días tiene una excepción para PWA instaladas (F03, una fuente). El aviso de antigüedad se mantiene como heurística.
- **E03:** "balance de masa descartado" pasa de VERIFICADO a INFERENCIA (F20 trata de madera y caucho). "Identidad preservada por lote" se mantiene: es decisión de diseño.
- **EUDR:** geolocalización confirmada en F19. Lectura primaria (2026-10-16): el cuerpo del art. 38 sigue con 2024/2025; las fechas 30/12/2026 y 30/06/2027 salen de los metadatos de EUR-Lex (versión 18/09/2026). Reglamento 2026/2102 leído en el Diario Oficial por el agente [VERIFICADO por lectura del agente; revisión humana pendiente]: para el cacao solo cambia la partida 1802 (exclusión de residuos de la Directiva 2008/98/CE); 1801 y 1803 a 1806 no cambian; entra en vigor el 18/09/2026; las incorporaciones nuevas no son cacao. La propuesta COM 52026PC0661 no se revisó y es de baja prioridad: según el equipo, el artículo 9 no depende de ella (afirmación del equipo, no verificada por el agente); revisarla solo si el pitch cita fechas de la EUDR. Citar como "fecha de efecto según EUR-Lex". Para el pitch, la asociación aparece como proveedora de datos de origen del importador (INFERENCIA desde la definición de operador, no verificada para Colombia); parcela como siguiente fase.
- **R5:** el equipo capturó DaTIC de internet fijo (F34: Rivera 3.545, Campoalegre 2.954, Algeciras 2.704 accesos en 2026-T2). Es acceso fijo, no cobertura móvil ni rural: no confirma ni refuta R5. Falta la capa móvil. Se suma a la evidencia indirecta de `fuentes.md` (F36 a F39): el dato departamental más útil es que solo el 39,5 % de los hogares del Huila tenía internet según MinTIC, citando al DANE (nota de 2020, año del dato sin indicar). En E01, "supuesto con evidencia indirecta" hasta tener capturas fechadas de Rivera, Campoalegre y Algeciras en `datic.postdata.gov.co` (Servicios móviles, Cobertura, 4G, por operador, zonas rurales).
- **Pendientes manuales:** capturas de DaTIC en servicios móviles (cobertura 4G); revisar la propuesta COM 52026PC0661; 
- **Sin más investigación:** analítica (sale de las reglas del reto) y precios (nadie los publica; la tarifa del piloto es hipótesis desde costos propios).

## Herramientas
Tavily (búsqueda y extracción) y GitHub (repos y licencias). No usé Firecrawl ni Apify: Tavily alcanzó y no hubo costo. Ninguna herramienta falló.
