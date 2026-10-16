# KallpaCacao — Marco del proyecto

| Campo | Valor |
|---|---|
| Versión | v0.3 (borrador) |
| Fecha | 2026-10-16 |
| Repositorio | trbureiyan/kallpa.cacao |
| Reto | II Hackathon de Programación USCO 2026 · "Cacao con historia, calidad y valor" |
| Equipo | Graffe (David) · Alejandro · Brayan · Emanuel |
| Ubicación | `documentos/00_marco_del_proyecto.md` (versionado en git; `.docs/` queda ignorado y solo guarda material de referencia) |
| Propósito | Una sola fuente de verdad para hablar el mismo idioma. Lo que no esté aquí no está decidido. |

**Cómo leer las etiquetas.** `[DECIDIDO]` ya acordado por el equipo. `[EN VALIDACIÓN]` se decide con una prueba y una hora de corte. `[PROPUESTO]` sugerido, a confirmar en el grupo; ningún agente ni persona lo implementa hasta que se confirme. `[ABIERTO]` sin decisión. Los datos del origen se rotulan `[CASO]` (lo dice el reto), `[DERIVADO]` (sale de un requisito) o `[SUPUESTO]` (lo asumimos nosotros y hay que declararlo así en E01). Todo resultado que alguien reporta y nadie ha verificado se escribe como "reportado".

---

## 1. Qué nos pide el reto

Construir en 24 horas un MVP web que conecte recepción, transformación y comercialización de cacao de una asociación simulada del Huila, con trazabilidad, control de existencias y decisiones verificables. El MVP debe cubrir RF01 a RF12, demostrar el ciclo de vida completo (E01 a E10) y defenderse con un pitch de cinco minutos y una propuesta de piloto de 30 días.

El jurado ejecuta el software y cambia los valores para comprobar que calcula. Puntaje: funcionamiento 25, diseño técnico 15, pruebas 15, y 10 cada uno para pertinencia, requisitos y ciclo de vida, experiencia de usuario e innovación comercial, más 5 de pitch. Para ganar: mínimo 70/100, promedio de 3/5 en funcionamiento y flujo recepción–transformación–consulta con datos persistentes.

**Fallas críticas** (hunden un criterio entero): perder registros, consumir más existencia de la disponible, exponer información interna al público, permitir una liberación sin autorización.

## 2. Pregunta del proyecto

**¿Cómo lograr que una asociación cacaotera registre y consulte la trazabilidad de sus lotes de forma confiable aun con conectividad limitada, y que esos registros le sirvan para decidir sobre mermas, costos y precio de venta?**

Conserva las dos mitades de la pregunta del reto (decisiones confiables y valor comercial) y agrega nuestra condición propia: la red.

## 3. Planteamiento del problema y árbol de problemas

La asociación recibe cacao de distintas fincas y lo transforma, pero sus registros están en cuadernos, hojas de cálculo y mensajes. No puede reconstruir el origen de un producto, detectar pérdidas, calcular costos ni dar información confiable al comprador `[CASO]`.

```
CONSECUENCIAS (ramas)
  C1  No se reconstruye el origen de un producto ni se aclara un reclamo (p. ej. CAC001)   [CASO]
  C2  Las mermas pasan inadvertidas                                                        [CASO]
  C3  El precio se fija sin costo unitario ni margen                                       [CASO]
  C4  El comprador recibe información poco confiable                                       [CASO]
  C5  El operador duplica trabajo o pierde registros al capturar tarde                     [SUPUESTO]
                                          ▲
PROBLEMA CENTRAL (tronco)
  La asociación no puede apoyarse en sus registros para decidir ni para demostrar
  el origen de su cacao a un comprador.
                                          ▲
CAUSAS (raíces)
  R1  Registros dispersos y sin identificador único                  [CASO]      → RF01, RF02, RF03
  R2  Sin control de existencias por lote                            [CASO]      → RF08
  R3  Pérdidas y costos sin reglas explícitas                        [CASO]      → RF04, RF05, RF12
  R4  Sin permisos por rol, estados ni historial de cambios          [DERIVADO]  → RF09, RF10, RF06
  R5  Captura tardía o incompleta por conectividad limitada          [SUPUESTO]  → diferenciador
```

**Honestidad del árbol.** R5 y C5 son supuestos nuestros: el caso no habla de conectividad. En E01 deben rotularse como supuesto con evidencia indirecta. DaTIC (2026-T2) muestra acceso de internet fijo en Rivera (3.545), Campoalegre (2.954) y Algeciras (2.704), pero no mide cobertura móvil ni zona rural, así que no confirma ni refuta R5. MinTIC, en una nota de 2020 que cita al DANE, indica que solo el 39,5 % de los hogares del Huila tenía acceso a internet; es un dato departamental, de hogares y sin año de medición indicado. Ninguna fuente consultada mide fincas ni centros de acopio. Falta la capa móvil de DaTIC y, si es posible, una consulta breve a un mentor (detalle en `documentos/research/`). No afirmamos que el software reduzca pérdidas reales, solo que permite detectarlas y rastrearlas.

## 4. Objetivos

**Objetivo general.** Desarrollar en 24 horas un MVP web que permita a una asociación cacaotera simulada recibir, transformar y rastrear lotes con inventario, estados y auditoría confiables, tolerar conectividad limitada en la captura y ofrecer información de mermas, costos y margen para decidir, demostrando el ciclo de vida completo y una propuesta de piloto de 30 días.

**Objetivos específicos** (cada uno se prueba con algo concreto):

| ID | Objetivo específico | RF | Se verifica con |
|---|---|---|---|
| OE1 | Registrar lotes y transformaciones con identificador único, vínculo de origen e inventario sin doble consumo | RF01, RF02, RF03, RF08 | Pruebas de lote válido, existencia insuficiente y reenvío |
| OE2 | Garantizar permisos por rol, estados y auditoría en el backend, y publicar una ficha que no exponga datos internos | RF06, RF09, RF10 | Pruebas de liberar como operador, bloqueo de CAC001 y ficha pública |
| OE3 | Calcular merma, alerta, costo unitario y margen con fórmula y supuestos visibles, y ofrecer un panel de analítica para decidir | RF04, RF05, RF11, RF12 | Caso 100→80 kg (merma 20 %, 20.000 COP/kg, margen 20 %) con valores cambiados |
| OE4 | Permitir capturar recepciones bajo red limitada con cola local y sincronización idempotente | diferenciador | Criterio del Anexo A |
| OE5 | Verificar y entregar: 15 casos de prueba, 5 automáticas, regresión de la hora 12, persistencia, respaldo y restauración, README y piloto | RF07, E05, E07, E09 | Informe de pruebas y restauración en máquina limpia |

## 5. Alcance

**Dentro.** RF01 a RF12 completos con los tres lotes base (CAC001 100 kg Rivera, CAC002 150 kg Campoalegre, CAC003 80 kg Algeciras). Tres perfiles: operador, administrador y comprador público (anónimo). Conectividad limitada: la captura de recepciones tolera red lenta o intermitente con cola local `[EN VALIDACIÓN]` (ver Anexo A). Un panel de analítica calculado en el servidor que responde tres preguntas del administrador: qué origen o productor acumula más merma, qué lotes tienen menor margen, y cuáles están bloqueados o con alerta abierta.

**Fuera.** IA, sensores, pagos, notificaciones, varias asociaciones, transformación sin conexión, resolución manual de conflictos de sincronización, mapas y roles adicionales. Lo que no esté en la lista "dentro" se pospone aunque tiente.

**Límites que el reto permite y declaramos en E03.** Una transformación consume un solo lote de entrada (si se mezclan, se conservan todos los orígenes). Unidad única: kg. Datos y productores son sintéticos. Trazabilidad por lote, sin datos de parcela: cubre primera milla y transformación. El Reglamento (UE) 2023/1115 (EUDR) exige además geolocalización por parcela; no afirmamos cumplimiento de EUDR ni de GS1 (no hay GTIN). La identidad se preserva por lote y, si se mezclan lotes, se conservan todos los orígenes con su cantidad.

**Alcance de producto de la EUDR para el cacao.** Según la lectura del Reglamento Delegado (UE) 2026/2102 hecha por el agente de research en el texto del Diario Oficial (16/10/2026), el único cambio que toca al cacao es una exclusión de residuos regulados por la Directiva 2008/98/CE en la partida 1802; las partidas 1801 y 1803 a 1806 no cambian. Las incorporaciones nuevas (café soluble, derivados de palma, lenguas de bovino congeladas) no son cacao. La propuesta COM 52026PC0661 no se ha revisado; no cita nada del pitch ni de los documentos hasta que se revise. Las fechas de efecto (30/12/2026 y 30/06/2027) no se citan en E01; si se citan en E09, se apoyan en el Reglamento (UE) 2025/2650 leído en su propio texto.

## 6. Indicadores de beneficio (para E01)

| Indicador | Definición | Cómo se mide |
|---|---|---|
| I1 Completitud de trazabilidad | % de productos cuya consulta muestra origen, transformación y estado | Sobre los datos de demo y los 100 registros sintéticos, con un script |
| I2 Integridad de sincronización | % de operaciones capturadas con red intermitente que llegan al servidor exactamente una vez | Prueba de reenvío y corte de red, con método y equipo declarados |

Las metas del piloto (p. ej. tiempo de registro) son hipótesis, no resultados.

## 7. Registro de decisiones

| Tema | Estado | Detalle |
|---|---|---|
| Arquitectura | `[DECIDIDO]` | Monolito modular híbrido: backend Python + frontend React/TypeScript |
| Stack | `[DECIDIDO]` por ahora | React + TypeScript + Tailwind · FastAPI · PostgreSQL · SQLAlchemy + Alembic · Pytest |
| Diferenciador | `[DECIDIDO]` | Conectividad limitada + analítica. IA fuera de alcance |
| Ubicación del marco | `[DECIDIDO]` | `documentos/00_marco_del_proyecto.md`, versionado en git. `AGENTS.md` debe apuntar a esa ruta |
| Offline "fuerte" (sin red total) | `[EN VALIDACIÓN]` | Resultado **reportado** por Graffe (2026-10-16), sin verificación independiente: punto 1 NO (el service worker no sirve la caché al recargar); puntos 2, 3 y 6 SÍ, que son del lado cliente; punto 4 con la lógica lista pero sin prueba contra FastAPI; punto 5 PENDIENTE. **La sincronización contra el backend y la idempotencia no están demostradas.** Por criterio rige la forma débil. Hora de corte para la prueba 5 y el arreglo del service worker: `[12:00]`. Si esa hora pasa sin aprobación, la forma débil queda como definitiva y la sincronización se presenta como "no demostrada" |
| Forma débil con lectura desde caché | `[DECIDIDO]` como diseño; su demostración depende de la prueba 5 | Cola idempotente + copia de lectura + reintentos e indicador de pendientes. Regla de uso: no recargar sin conexión. Texto de interfaz: "con conectividad limitada", no "incluso sin conexión" |
| Alcance del offline | `[DECIDIDO]` | Solo recepción de lotes + lectura de lo ya cargado. Transformar y cambiar estados exigen conexión |
| Esquema de datos | `[ABIERTO]` | En espera. Hay propuesta de Alejandro (v1) con puntos por resolver, ver §8. Se resuelve con la lista de verificación de comportamiento, no con discusión de forma |
| Ficha pública (RF06) | `[PROPUESTO]` | Plantilla HTML servida por el backend con el esquema público de lista blanca; la SPA no la renderiza. Motivo: red lenta del comprador y ningún costo interno puede llegar al navegador. El administrador solo genera enlace y QR. `/api` y `/publico` quedan fuera del fallback del service worker |
| Contrato de idempotencia | `[PROPUESTO]` | `uuid_cliente` único más hash del contenido. Repetición igual devuelve el original; misma clave con contenido distinto, 422. Claves sin caducidad. Sale de `documentos/research/` |
| Despliegue | `[PROPUESTO]` | Docker Compose con base, API y frontend + alternativa sin contenedor en el README |
| Research de referencias | `[DECIDIDO]` como insumo | Cerrado en lo documental. No es entregable formal; alimenta E01, E03 y E09 |

## 8. Arquitectura vigente y puntos pendientes de datos

Un solo repositorio. El backend FastAPI aplica las reglas de inventario, costos y permisos y sirve el build del frontend; el frontend muestra y captura, nunca decide. Las reglas de negocio viven como funciones puras con pruebas unitarias.

**Puntos a resolver cuando se retome el esquema** `[ABIERTO]`: una sola fuente para los costos (hoy hay tres), fusionar recepción con lote o justificar la separación, catálogo de municipios en lugar de texto libre, columna de motivo en la auditoría, regla escrita de propagación del bloqueo a los productos derivados (liberar el padre no libera a los hijos), y que la compra del cacao no se sume al costo de etapa del ejemplo del reto (1.600.000 / 80 = 20.000 COP/kg). Auditoría de solo inserción reforzada en la base.

**Cola local del navegador** `[DECIDIDO]`: solo guarda la cola de operaciones y una copia de lectura. El esquema real vive en el servidor y no se replica en el cliente. La cola es un módulo único y transversal del frontend (`offline/`), no una por módulo; solo recepción escribe en ella.

**Renderizado** `[DECIDIDO]` en lo que ya existe: la aplicación de operador y administrador se renderiza en el cliente (el respaldo offline lo exige). La ficha pública es la excepción propuesta (ver §7).

## 9. Fases por prioridad

Las horas se cuentan desde H0 (apertura oficial) `[__:__]`. H24 `[__:__]`. La hora 12 es la incidencia de CAC001.

| Fase | Prioridad | Qué se hace | Puerta de salida (gate) |
|---|---|---|---|
| P0 Alineación | Ahora | Alcance confirmado por los cuatro, tablero al día, esquema decidido, hora de corte del offline | Alcance firmado en el grupo; sin decisiones abiertas en la ruta crítica |
| P1 Núcleo vertical | Crítica | Login y roles, RF01, RF08, RF02, RF03 con un lote de punta a punta, migración 0001, CI mínima | Lote → transformación → trazabilidad persistente, demostrable |
| P2 Reglas y control | Crítica | RF04, RF05, RF12, RF09, RF10, RF06, RF11 | Las nueve pruebas del jurado pasan con valores cambiados |
| P3 Diferenciador | Alta, con corte | Recepción con conectividad limitada y panel de analítica | Criterio del Anexo A y tres consultas del panel |
| P4 Evidencia y cierre | Crítica | Pruebas (15 casos, 5 automáticas), regresión de hora 12, 100 registros, respaldo y restauración, usabilidad con una persona ajena, README, documentos, pitch | Instalación limpia en otra máquina; commit y etiqueta finales |

**Continuación del frontend** `[PROPUESTO]`. Orden de trabajo, cada fase con su condición de salida:

| Fase | Qué | Sale cuando |
|---|---|---|
| F0 Integración | Pull de ramas, integrar `backend` y `frontend` a `master` por pull request, arranque con un solo comando | Otra persona la levanta desde cero |
| F1 Cimiento offline | Prueba 5 de idempotencia contra FastAPI; arreglo del service worker (límite 30 min, si no queda declarado como limitación) | Los seis puntos del Anexo A tienen sí o no |
| F2 Backend real | Login y roles reales, tipos generados desde OpenAPI, código de lote asignado por el servidor, fecha con hora local del dispositivo, lista desde la API sin `seed.ts` | Login, recepción y lista sobreviven a un reinicio |
| F3 Pantallas faltantes | Transformación, trazabilidad, estados, auditoría, CSV; ficha pública según §7 | Las nueve pruebas del jurado se recorren desde la interfaz |
| F4 Analítica y UX | Panel de tres consultas, móvil, accesibilidad, prueba con persona ajena (E06) | Registro de E06 con una mejora documentada |
| F5 Congelación | Build versionado con aviso de actualización, perfil de navegador limpio, nombre KallpaCacao | Etiqueta final y hash en `ENTREGA.md` |

**Eventos fijos.** Hora 12: incidencia de CAC001 (bloqueo, origen, cantidades, tarjeta de cambio y regresión; no se presenta como resuelta antes de ejecutarla). Antes de las 02:00: E01, tablero y esquema base de arquitectura (acordado con Emanuel).

**Reglas de corte** `[PROPUESTO]`:
1. Si a la hora 14 el núcleo (P1) no es demostrable, el offline pasa a la forma débil y la analítica se reduce a tres consultas fijas.
2. A la hora 21 se congelan funcionalidades; solo se corrigen fallas y se consolida la entrega.
3. A la hora 23 nadie toca la rama principal salvo el integrador; la etiqueta final queda registrada en `ENTREGA.md` con el hash completo.

## 10. Matriz de responsabilidades `[PROPUESTO, confirmar en 5 minutos]`

R = responsable (entrega y responde). A = apoyo (revisa o colabora).

| Área / entregable | Graffe | Alejandro | Brayan | Emanuel |
|---|---|---|---|---|
| Alcance, tablero, repo, integración y commit final (E10) | A | A | R | A |
| Esquema de datos y migraciones | A | R | A (revisa) | |
| API de lotes, transformación, inventario, estados, auditoría | | R | A | |
| Permisos por rol y ficha pública (serializador propio) | | R | A | A (pruebas negativas) |
| Reglas puras: merma, costo, margen, alertas, con pruebas | | A | R | A (casos) |
| Panel de analítica (consultas y vista) | R (vista) | A | R (consultas) | |
| UI operador/administrador/público, móvil y accesibilidad | R | | | A (revisión de UX) |
| Cola offline y cliente de sincronización | R | | | |
| Endpoint idempotente de sincronización | A | R | | |
| Despliegue, Docker, respaldo y restauración | | A | R | |
| Casos de prueba, informe y regresión (E05) | A | A | A | R |
| Prueba de usabilidad con persona ajena (E06) | A | | | R |
| E01, E02, E03, E07 (documentos) | A | A (E03) | A | R |
| Bitácora de IA y componentes externos (E08) | A | A | A | R (consolida) |
| Pitch y propuesta de piloto (E09) | A | | R | A |
| Research de referencias | | | R | |

**Nota de carga.** Alejandro concentra esquema, backend y endpoint de sincronización. Por eso se propone que Brayan tome las reglas puras y las consultas de analítica, que pueden escribirse y probarse sin base de datos y desbloquean RF04, RF05 y RF12.

## 11. Trazabilidad semilla (se completa durante el desarrollo)

El estado de cada requisito se llena con la auditoría; hasta entonces no se asume.

| Requisito | Historia | Módulo | Prueba | Responsable | Estado |
|---|---|---|---|---|---|
| RF01 Recepción de lotes | HU01 | lotes | Lote válido; cantidad ≤ 0 o campo vacío rechazados | Alejandro / Graffe | Por auditar |
| RF02 Transformación | HU02 | transformacion | 100 → 80 kg vinculado al lote de origen | Alejandro | Por auditar |
| RF03 Trazabilidad | HU03 | trazabilidad | Recorrido lote → producto; 100 registros < 3 s | Alejandro | Por auditar |
| RF04 Alerta | HU04 | alertas | Merma 20 % dispara alerta sobre 15 % | Brayan | Por auditar |
| RF05 Indicador económico | HU05 | economia | 20.000 COP/kg con fórmula visible | Brayan | Por auditar |
| RF06 Ficha comercial | HU06 | publico | Comprador sin costos internos | Alejandro | Por auditar |
| RF07 Persistencia | HU07 | datos | Reinicio y restauración sin pérdida ni duplicación | Brayan | Por auditar |
| RF08 Inventario | HU08 | inventario | Consumo excesivo y reenvío sin doble consumo | Alejandro | Por auditar |
| RF09 Estados | HU09 | estados | Operador no libera; bloqueo de CAC001 visible | Alejandro | Por auditar |
| RF10 Auditoría | HU10 | auditoria | Cambio auditado con valor anterior y nuevo | Alejandro | Por auditar |
| RF11 Consulta y CSV | HU11 | reportes | Filtros y CSV solo para administrador | Alejandro | Por auditar |
| RF12 Balance económico | HU12 | economia | Margen 20 %; salida cero sin dividir | Brayan | Por auditar |

## 12. Riesgos

| Riesgo | Mitigación |
|---|---|
| Dispersión: cada quien avanza por su lado sin contexto | Este documento + diez minutos frente al tablero cada tres o cuatro horas |
| Offline consume el tiempo del núcleo | Hora de corte, forma débil y regla de la hora 14 |
| Reglas en el frontend o permisos solo visuales | Backend como única autoridad; revisión de PR contra esta regla |
| Inconsistencias en datos (valores duplicados) | Fuentes únicas; script de integridad entre libro de movimientos y disponible |
| Instalación limpia falla en la máquina del jurado | Probar en otra máquina; README con alternativa sin contenedor |
| Afirmar resultados no demostrados (incluido el offline) | Metas como hipótesis; resultados reportados se rotulan "reportado"; nada se presenta resuelto antes de ejecutarse |
| Afirmar cumplimiento de EUDR o GS1 | No se afirma: trazabilidad por lote sin parcela; en el pitch, primera milla, transformación, merma y costos, con la parcela como siguiente fase |
| El marco no llega al resto del equipo ni a sus agentes | Vive en `documentos/` y no en una carpeta ignorada por git; `AGENTS.md` apunta a esa ruta |
| Documentación tardía | Documentos en markdown junto al código; exportar PDF desde H21 |

## 13. Pendientes de confirmación y de verificación

**Confirmar en el grupo (diez minutos).** Hasta que se confirmen, nadie implementa lo marcado como propuesto.

| Qué | Quién decide | Estado |
|---|---|---|
| H0 y H24 reales | Todos | `[__:__]` sin llenar |
| Matriz de responsabilidades (§10) | Todos | `[PROPUESTO]` |
| Ficha pública servida por el backend (§7) | Alejandro y Brayan | `[PROPUESTO]` |
| Contrato de idempotencia con hash y 422 (§7) | Alejandro y Graffe | `[PROPUESTO]` |
| Fases F0 a F5 del frontend (§9) | Graffe y Brayan | `[PROPUESTO]` |
| Hora de corte de la prueba 5 y del service worker | Graffe y Brayan | `[HH:MM]` sin llenar |
| Verificación de comportamiento del esquema (costos coherentes, compra fuera del costo de etapa, motivo en auditoría, auditoría inmutable, consumo concurrente, reenvío) | Alejandro y Brayan | `[ABIERTO]` |

**Verificar o hacer a mano.**

| Qué | Quién | Nota |
|---|---|---|
| Capturas de DaTIC en "Servicios móviles", variable "Cobertura", 4G por operador, zonas rurales | Brayan | Guardar con fecha en `documentos/evidencias/datic/` |
| Prueba 5 de idempotencia contra FastAPI | Graffe | Con corte de red a mitad de la petición |
| Actualizar la ruta del marco en `AGENTS.md` y hacer commit de `documentos/` | Brayan | El marco no llega al equipo hasta entonces |
| Consulta al mentor sectorial (o declarar "no realizada" en E01) | Emanuel | No se inventa |
| Revisar la propuesta COM 52026PC0661 | Cualquiera, baja prioridad | Solo importa si el pitch llega a citar fechas de la EUDR |

---

## Anexo A. Criterio de aceptación de la exploración offline

Alcance: solo recepción de lotes sin conexión y lectura de lo ya cargado. Se aprueba si, en un teléfono real en modo avión (no solo simulación del navegador), se cumple todo:

1. Tras una primera visita con red, la app abre y recarga sin conexión y muestra los lotes cargados antes.
2. Se registra un lote sin red; queda en cola local con UUID de operación y de lote generados en el cliente, hora de captura y marca "pendiente de enviar".
3. La validación corre también offline: cantidad ≤ 0 o campo vacío no entran a la cola.
4. Al volver la red sincroniza una sola vez (automático o con botón "Sincronizar ahora"; sin depender de Background Sync). El servidor devuelve el código asignado y su hora.
5. Reenviar la misma cola, cortando la conexión a mitad de la petición y repitiendo, no duplica nada.
6. Si el servidor rechaza una operación, queda marcada con su error y no bloquea las demás.

Resultado reportado por Graffe (2026-10-16), sin verificación independiente: 1 NO (al recargar sin red aparece el dinosaurio; el service worker no sirve la caché estática). 2 SÍ. 3 SÍ. 4 SÍ, descrito como lógica lista, sin prueba contra FastAPI. 5 PENDIENTE (reintento con corte de señal contra FastAPI). 6 SÍ.

Decisión: cumple 1 a 6 → forma fuerte. Falla solo el punto 1 → forma débil. Falla el 4 o el 5 → se corrige primero en el servidor, porque esa idempotencia también protege el inventario (RF08).

## Anexo B. Vocabulario común

**MVP**: producto mínimo que cierra el flujo completo con datos persistentes. **Diferenciador**: mejora libre sobre el núcleo que debe demostrarse y compararse con la alternativa actual de la asociación (cuadernos y hojas de cálculo). **Indicador**: medida de beneficio con su forma de medición. **Criterio de aceptación**: condición comprobable de una historia. **Prueba de regresión**: confirma que un cambio no rompió lo anterior. **Idempotencia**: repetir una operación no cambia el resultado. **Merma**: (entrada − salida) ÷ entrada × 100; alerta sobre 15 % (regla del ejercicio, no estándar agronómico). **Congelación**: commit y etiqueta final a la hora 24. **Piloto**: prueba comercial de 30 días con una asociación; sus metas son hipótesis.

## Anexo C. Historial de versiones

| Versión | Fecha | Cambios | Autor |
|---|---|---|---|
| v0.1 | 2026-10-15 | Marco inicial: pregunta, árbol, objetivos, alcance, decisiones, fases, responsabilidades | Brayan |
| v0.2 | 2026-10-16 | Resultado offline de Graffe y forma débil decidida; ficha pública servida por el backend y contrato de idempotencia (propuestos); límite EUDR/GS1; evidencia DaTIC para R5; fases de continuación del frontend (propuestas); ubicación corregida | Redacción asistida por Claude Code, a confirmar por el grupo |
| v0.3 | 2026-10-16 | Ubicación movida a `documentos/` (`.docs/` está ignorado por git); fila de offline corregida para distinguir lo reportado de lo demostrado; verificación del Reglamento 2026/2102 para el cacao; dato DANE/MinTIC; estados de §11 en "Por auditar"; nueva sección 13 de pendientes de confirmación | Brayan, con redacción asistida; a confirmar por el grupo |