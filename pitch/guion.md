# Guion de pitch — kallpa.cacao

**Duración objetivo:** 4:35, incluida una demostración breve. **Formato:** cinco diapositivas. Los datos del ejemplo son sintéticos.

> Antes de presentar: acuerden el nombre que usarán (kallpa.cacao o AgroCacao Huila), el cliente/pagador, el precio en COP, el alcance del piloto y su costo operativo. Sustituyan los campos entre corchetes; no improvisen esas cifras.

## Diapositiva 1 — Un lote, una historia (0:00–0:40)

**En pantalla:** Recepción → transformación → trazabilidad → decisiones comerciales.

**Guion:**

¿Qué puede responder una asociación cacaotera cuando un comprador pregunta de dónde viene un producto, cuánto cacao entró al proceso y qué ocurrió durante su transformación? Si esos datos están repartidos, reconstruir la historia toma tiempo y aumenta el riesgo de perder contexto. kallpa.cacao conecta recepción, inventario, transformación, costos y consulta comercial en un mismo recorrido. Lo construimos para el reto con una asociación ficticia y datos sintéticos del Huila; todavía no afirmamos resultados de una operación real.

## Diapositiva 2 — El recorrido conectado (0:40–1:15)

**En pantalla:** Productor y origen → lote recibido → proceso y merma → producto consultable.

**Guion:**

El operador registra el lote y su origen. Al procesarlo, el servidor valida las existencias, registra el consumo y crea una salida vinculada con el material de origen. Así se puede consultar el historial desde el lote recibido o desde el producto resultante. El administrador revisa inventario, alertas, costos y auditoría. El comprador accede a una ficha pública que omite costos internos y datos privados del productor. Veamos el ejemplo del reto.

## Diapositiva 3 — CAC001: de 100 kg a 80 kg (1:15–2:35)

**En pantalla:** CAC001 · Rivera · 100 kg recibidos → 80 kg de salida · merma 20 %.

**Guion y demostración:**

Este es CAC001, asociado a Productor A y al municipio de Rivera. Es un caso sintético. Registramos 100 kg y, en la etapa de procesamiento, obtenemos 80 kg. La merma se calcula así: entrada menos salida, dividido entre la entrada, por cien. El resultado es 20 %. Como supera el umbral del 15 % indicado para el reto, aparece una alerta con la regla y su causa.

Ahora abro la trazabilidad: la salida conserva el vínculo con la recepción y su origen. También puedo mostrar el estado y el registro de auditoría. Si un administrador bloquea el lote, debe indicar un motivo; la ficha pública deja de ofrecerlo como disponible y el historial se conserva.

**Acciones:** mostrar CAC001, la transformación, la alerta, el historial y la ficha pública. Dejar los datos cargados antes de iniciar; no llenar formularios en vivo.

## Diapositiva 4 — Campo y decisiones (2:35–3:35)

**En pantalla:** Captura de recepción offline · analítica de mermas · alertas y lotes bloqueados.

**Guion:**

En zonas con conectividad limitada, la recepción puede guardarse en el dispositivo y sincronizarse al recuperar la conexión. El alcance offline cubre recepciones y consultas de datos ya cargados; las transformaciones y los cambios de estado requieren conexión para validar inventario y permisos en el servidor. Para administración, el panel reúne mermas por origen o productor, lotes con menor margen estimado y lotes bloqueados o con alertas abiertas. Es información para decidir qué revisar; no significa que ya hayamos reducido pérdidas reales.

## Diapositiva 5 — Piloto medible (3:35–4:35)

**En pantalla:** 30 días · [asociación cliente/pagador] · COP [precio] · dos métricas.

**Guion:**

Proponemos un piloto de 30 días con [cliente/pagador]. Incluiría [número de usuarios, lotes y acompañamiento] por COP [precio acordado]. Antes de ofrecerlo, estimaremos alojamiento, soporte y demás costos de operación.

Mediremos dos cosas: primero, el porcentaje de lotes piloto cuyo historial puede recorrerse desde la recepción hasta el producto; segundo, el tiempo que tarda el equipo en reconstruir la historia de un lote. Son metas que evaluaremos durante el piloto, no resultados que ya hayamos obtenido.

kallpa.cacao busca que cada lote tenga una historia verificable y que las decisiones sobre inventario, merma y disponibilidad se apoyen en registros. El siguiente paso es validar el flujo con una asociación y medir esos indicadores. Muchas gracias.

## Preguntas probables

**¿La merma del 20 % ocurrió en una finca real?** No. Es el ejemplo sintético del reto: 100 kg de entrada y 80 kg de salida.

**¿Qué funciona sin conexión?** La captura de recepciones y la consulta de datos que ya estaban cargados. La transformación y los cambios de estado necesitan conexión. La sincronización offline debe demostrarse en el dispositivo y navegador preparados para la exposición.

**¿El margen mostrado representa una venta?** No. Es una estimación del ejemplo: COP 1.600.000 de costo de etapa / 80 kg = COP 20.000/kg. Con un precio propuesto de COP 25.000/kg, el margen sobre la venta es 20 %. El costo de compra del cacao se muestra aparte; no hay un flujo de ventas implementado.

**¿Cómo evitan consumir dos veces el mismo inventario?** El servidor procesa la operación con idempotencia y valida/consume el inventario dentro de una transacción. En la prueba concurrente realizada en PostgreSQL temporal, de dos consumos de 7 kg contra 10 kg solo uno tuvo éxito y el saldo quedó en 3 kg.

**¿Qué datos ve el comprador?** Una ficha con campos aprobados; no incluye costos internos ni datos privados del productor. Un lote bloqueado no se presenta como disponible.

## Preparación para hablar con seguridad

- Ensayen tres veces con cronómetro. Apunten a 4:30–4:40 y dejen margen para una pausa o una transición lenta.
- Memoriza el recorrido, no cada frase: problema → flujo → ejemplo → diferenciadores → piloto.
- Una persona presenta y otra opera la aplicación. Acordad de antemano cuándo cambia cada pantalla.
- Antes del evento, comprueben CAC001, las credenciales, la API, la ficha pública y la sincronización en el mismo navegador/dispositivo que usarán.
- Si la red falla, expliquen la limitación y usen evidencia preparada identificándola como captura o resultado previo; no la presenten como una acción en vivo.
- No borren los datos locales del navegador si hay recepciones pendientes. No siembren ni reinicien la base persistente justo antes de presentar.
- No digan que el sistema certifica cacao, que ya redujo pérdidas, que ejecutó ventas reales ni que la prueba temporal representa producción.
- Si no tienen una cifra comercial aprobada, presenten el piloto como propuesta en validación; no inventen un precio.
