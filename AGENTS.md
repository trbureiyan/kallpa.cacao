# AGENTS

> [!IMPORTANT]
> **Directiva de Interacción:** El agente se refiere al proyecto como `kallpa.cacao` y trata al equipo de la hackathon como la parte principal. El equipo es responsable de explicar cada línea en la defensa: preferir soluciones simples y legibles sobre soluciones ingeniosas. Si algo del reto es ambiguo, preguntar; no inventar requisitos ni resultados de pruebas. Si una prueba falla, reportarlo tal cual.

`kallpa.cacao` | MVP de trazabilidad, transformación y comercialización de cacao para una asociación cacaotera ficticia del Huila (II Hackathon de Programación USCO, reto "Cacao con historia, calidad y valor"). Produce lotes trazables, inventario, merma y costos, y una ficha comercial pública.
Stack `[DECIDIDO]` por ahora: React + TypeScript + Tailwind (Vite) / Python FastAPI / PostgreSQL / SQLAlchemy + Alembic / Pytest. Monolito modular en logica; Compose despliega PostgreSQL, API FastAPI y frontend Nginx en servicios separados.

Contexto del evento:

- 24 horas continuas de construcción. El código se congela con una etiqueta o commit final; después no se edita.
- Caso y datos 100 % simulados. Sin datos reales, sin secretos.
- Especificación completa del reto: `.docs/reto_cacao.md`. Es normativa; si este archivo y el reto chocan, gana el reto y se corrige este archivo.
- Marco del proyecto: `.docs/00_marco_del_proyecto.md`. Decisiones del equipo; resumen operativo y reglas de uso en la sección siguiente.
- En este checkout inspeccionado, `.docs/` no existe. La especificacion esta en `concurso/Reto_Oficial_Devurity_Agroindustria.pdf`; no reconstruir decisiones del marco ausente ni crear `.docs/` sin acuerdo.

---

## Marco del proyecto

Documento: `.docs/00_marco_del_proyecto.md`. **Versión sincronizada con este resumen: v0.1 (2026-10-15).** Lo que no esté en el marco no está decidido.

### Qué manda cada documento

| Documento | Manda sobre | No contiene |
|---|---|---|
| `.docs/reto_cacao.md` | Requisitos RF01–RF12, criterios, entregables, valores de ejemplo | Decisiones del equipo |
| `.docs/00_marco_del_proyecto.md` | Alcance, objetivos, decisiones y su estado, responsabilidades, fases y reglas de corte, riesgos del plan, criterio de aceptación offline | Código, convenciones de implementación, resultados de pruebas (viven en `tests/casos_manuales.md` y `ENTREGA.md`) |
| `AGENTS.md` | Cómo trabaja el agente, capas y convenciones de código; resumen del marco | Detalle del marco: si hay duda, se abre el marco |
| `documentos/` | Entregables E01–E09 | Decisiones nuevas: se toman en el marco |

### Resumen operativo (lo que condiciona el código)

- **Dentro:** RF01–RF12 con CAC001–003, tres perfiles (operador, administrador, comprador anónimo), recepción con conectividad limitada `[EN VALIDACIÓN]` y un panel de analítica en el servidor con tres preguntas: origen o productor con más merma, lotes con menor margen, lotes bloqueados o con alerta abierta.
- **Fuera:** IA, sensores, pagos, notificaciones, varias asociaciones, transformación sin conexión, resolución manual de conflictos de sincronización, mapas, roles adicionales. Lo que no esté en "dentro" se pospone aunque tiente.
- **Límites declarados:** una transformación consume un solo lote de entrada (si se mezclan, se conservan todos los orígenes); unidad única kg; datos sintéticos.
- **Offline `[DECIDIDO]` en alcance:** solo recepción de lotes y lectura de lo ya cargado. Transformar y cambiar estados exigen conexión. La cola local guarda solo operaciones y una copia de lectura; el esquema real vive en el servidor. Sin Background Sync. La forma "fuerte" (sin red total) sigue `[EN VALIDACIÓN]` con el criterio del marco, Anexo A; si falla, forma débil (reintentos, tiempos límite, indicador de pendientes) sobre la misma cola idempotente. Si falla la idempotencia, se corrige primero en el servidor: también protege el inventario.
- **Esquema de datos `[ABIERTO]`:** no crear modelos ni migraciones definitivas sin acuerdo; proponer. Puntos pendientes en marco §8 (fuente única de costos, motivo en auditoría, propagación del bloqueo a derivados, compra del cacao fuera del costo de etapa).
- **Reglas de corte `[PROPUESTO]`:** hora 14 sin núcleo demostrable, offline pasa a forma débil y la analítica a tres consultas fijas; hora 21 congelar funcionalidades; hora 23 solo el integrador toca la rama principal.
- **Responsables:** matriz en marco §10 (`[PROPUESTO]`). El agente no asigna ni reasigna trabajo.

### Cómo usa el agente el marco

1. `[DECIDIDO]`: se implementa sin preguntar de nuevo.
2. `[EN VALIDACIÓN]` y `[PROPUESTO]`: se implementan solo si el usuario lo pide, dejando visible la dependencia.
3. `[ABIERTO]` o no cubierto: no se implementa por suposición. Se pregunta una sola vez, con recomendación, agrupando las dudas.
4. Fuera de alcance: detenerse y avisar; no agregarlo.
5. El agente **no edita el marco**. Si detecta un choque o una decisión nueva, la entrega al cierre de la tarea (no a cada paso) con este bloque y sigue con lo vigente:

```text
PROPUESTA DE CAMBIO AL MARCO:
1. Sección: {§ y etiqueta actual}
2. Cambio: {texto propuesto}
3. Motivo: {qué lo exige y evidencia}
4. Efecto: {qué de AGENTS.md y de documentos/ se actualiza}
```

6. Si la versión del marco difiere de la sincronizada arriba, avisar y revisar este resumen antes de seguir.
7. Choques: marco contra reto, gana el reto; marco contra este archivo, gana el marco y se corrige este archivo.

### Control de cambios del marco (manual)

- Lo editan personas, a mano. Cambios de alcance, stack, offline, estado de una decisión o responsabilidades se acuerdan en el grupo antes de escribirse.
- Cada cambio agrega una fila al historial (Anexo C: versión, fecha, qué cambió, autor) y, en el mismo commit `docs:`, actualiza este resumen y la versión sincronizada. Las correcciones de redacción no suben versión.
- No se cambia por tareas rutinarias ni para reflejar avance diario; eso va en el tablero y en `ENTREGA.md`.

---

## Repository Map

```text
kallpa.cacao/
├── ENTREGA.md                       # E10: índice, hash del commit final, matriz requisito→componente→prueba→resultado
├── README.md                        # E07: versiones, instalación, ejecución, pruebas, usuarios demo
├── Makefile                         # setup, run, test, seed, backup, restore, perf
├── .env.example                     # sin secretos; .env real nunca se versiona
├── .gitignore                       # .env, datos/runtime, node_modules, dist
├── .github/workflows/ci.yml         # pytest + tipos + build
├── .docs/                           # reto oficial y contexto; NO modificar sin preguntar
│
├── backend/                         # API (FastAPI, SQLAlchemy, Alembic); la mantiene la rama backend
│   ├── app/
│   │   ├── main.py                  # monta los routers; la API aún no sirve el build del frontend
│   │   ├── config.py · database.py  # configuración por variables de entorno (.env en backend/) y sesión
│   │   ├── api/                     # un router por área: auth, receptions, lots, transformations, inventory,
│   │   │                            #   alerts, economics, audit, public, exports, users, analytics
│   │   ├── security/                # authentication.py, permissions.py: require_roles(), ÚNICO punto de control de acceso
│   │   ├── services/                # reglas y transacciones: inventario, transformación, trazabilidad, alertas, economía
│   │   └── models/ · schemas/       # tablas y contratos de entrada y salida
│   ├── migrations/                  # Alembic
│   ├── tests/                       # pytest del backend
│   └── Dockerfile · docker-compose.yml · requirements.txt · requirements-dev.txt
│
├── src/
│   └── frontend/
│       ├── package.json · vite.config.ts · tsconfig.json
│       └── src/
│           ├── main.tsx · App.tsx
│           ├── api/                 # cliente y tipos generados desde OpenAPI — no editar a mano lo generado
│           ├── app/                 # rutas, providers, layouts (operador/admin/público)
│           ├── shared/              # componentes UI, hooks, formato de números y fechas
│           └── features/            # un directorio por módulo del backend
│               ├── auth/ · recepcion/ · transformacion/ · trazabilidad/
│               ├── inventario/ · estados/ · auditoria/ · reportes/
│               ├── ficha-publica/
│               └── offline/         # cola local (IndexedDB), banner de conectividad
│
├── tests/
│   ├── backend/
│   │   ├── unit/                    # merma, costos, transiciones de estado, inventario
│   │   ├── integration/             # permisos, idempotencia, ficha sin costos, auditoría
│   │   ├── regresion/               # incidencia de la hora 12 (CAC001)
│   │   └── rendimiento/             # trazabilidad sobre 100 registros, con método declarado
│   └── casos_manuales.md            # los 15 casos: esperado, obtenido, estado, evidencia
│
├── datos/
│   ├── semilla/                     # CAC001-003 y usuarios demo
│   ├── sinteticos/                  # generador de los 100 registros
│   ├── respaldo/                    # respaldo de demostración + checksums
│   └── runtime/                     # estado local de ejecución de la base — ignorado por git, nunca versionar (ubicación según despliegue, marco §7)
│
├── scripts/                         # seed, backup, restore, verificar_integridad
├── documentos/                      # E01–E09 en markdown, exportables a un PDF (máx. 15 páginas)
│   ├── E08_IA_y_fuentes.md          # bitácora de IA: se actualiza con cada componente relevante
│   ├── cambios/                     # CC-001: tarjeta de cambio de la hora 12
│   ├── diagramas/
│   └── evidencias/                  # salidas de pytest, mediciones
├── pitch/                           # E09: máximo cinco diapositivas
└── AGENTS.md
```

**Ubicación de la API:** `backend/`. Se eliminó `src/backend/`, que solo tenía 83 archivos vacíos sin referencias. El backend agrupa por capa (`api/`, `services/`, `models/`), no por módulo como describen «Layer architecture» y «Estructura de módulos (backend)» más abajo; esas secciones siguen siendo la intención de diseño y las reglas que valen son las de permisos, inventario, idempotencia y auditoría. Contrato frontend–backend: `docs/contrato-api.md`.

Crear módulos y directorios solo cuando se vayan a usar de inmediato. No dejar directorios vacíos sin propósito. El árbol de arriba es el destino; no todo existe todavía. El scaffolding actual está vacío (stubs de 0 bytes), así que antes de proponer nada inspeccionar `src/` y respetar lo que haya agregado el equipo.

**Layer architecture:** `Request → router (require_role) → service → rules (funciones puras) / models → DB`. El frontend solo muestra: consume la API y nunca decide.

---

## Commands

| Command | Purpose | Notes |
|---|---|---|
| `make setup` | Instala dependencias de backend y frontend | Instalación limpia en pocos comandos; por definir |
| `make run` | Construye el frontend y arranca el backend en un solo proceso | Puerto por definir |
| `make test` | Ejecuta pytest (unit, integration, regresión) | Debe pasar antes de cada commit |
| `make perf` | Mide trazabilidad sobre 100 registros sintéticos | Declarar método y equipo; objetivo <= 3 s |
| `make seed` | Carga CAC001–003 y usuarios demo | Ver Dangerous Commands |
| `make backup` | Respalda la base a `datos/respaldo/` con checksum (método por definir) | Idempotente |
| `make restore` | Restaura un respaldo | Ver Dangerous Commands |

Los targets del `Makefile` existen pero aún están vacíos. Completarlos antes de documentarlos en `README.md`. Frontend (desde `src/frontend/`): `pnpm test` (vitest), `pnpm exec tsc -b` (tipos), `pnpm exec eslint .` (lint), `pnpm build`. Variables del frontend (`src/frontend/.env.example`): `VITE_API_URL` y `VITE_PERMITIR_MODO_LOCAL` (`false` en la evaluación; `true` solo para trabajar sin servidor, en `.env.local`). CI en `.github/workflows/ci.yml`: tipos, lint, pruebas y build del frontend; pytest del backend cuando existe `backend/`. Backend: `python -m pytest -q` desde `backend/`.

### Dangerous Commands

> [!CAUTION]
> Los siguientes comandos modifican esquema, datos o estado remoto. **Nunca ejecutar autónomamente sin confirmación explícita del usuario.** Declarar la intención y esperar aprobación. Algunas operaciones son irreversibles.

- `make seed`: inserta datos en la base activa; puede duplicar o pisar registros.
- `make restore`: reemplaza la base activa por un respaldo; pierde lo posterior al respaldo.
- Borrar o recrear `datos/runtime/`: destruye los registros persistidos (falla crítica del reto).
- Cualquier migración destructiva, `DROP`, `DELETE` o `UPDATE` masivo sobre tablas de movimientos o auditoría.
- `git push`, creación de la etiqueta final, force-push o reescritura de historial.

---

## Task Intake and Research

When assigned a task:

1. Leer `AGENTS.md` primero (incluye el resumen del marco). Abrir `.docs/00_marco_del_proyecto.md` completo si la tarea toca alcance, modelo de datos, offline, fases o responsabilidades, y la sección correspondiente de `.docs/reto_cacao.md` si toca requisitos o criterios.
2. Leer el prompt con atención. Identificar objetivo, restricciones y alcance (qué RF toca) antes de tocar archivos.
3. Inspeccionar los archivos relevantes con lecturas exactas y dirigidas. No hacer escaneos amplios de directorios cuando se conocen rutas específicas.
4. Verificar la implementación actual antes de escribir código. Nunca asumir la estructura: inspeccionarla.
5. Identificar edge cases (ver Current Risk Areas) antes de redactar un plan.
6. Antes de implementar, proponer un plan de pasos pequeños ordenados por dependencia (modelo de datos → reglas puras con pruebas → servicios → routers → frontend) y esperar confirmación.
7. Trabajar en rebanadas verticales delgadas, probando mientras se construye, con commits pequeños.
8. Señalar cualquier decisión riesgosa para las fallas críticas **antes** de implementarla.

### Rules of Engagement

- Empezar con el conjunto mínimo de archivos plausible. Búsqueda dirigida sobre escaneos amplios.
- Ignorar `dist/`, `build/`, `node_modules/`, `.cache/`, `__pycache__/`, `.venv/`, `.pytest_cache/`, `datos/runtime/`.
- Sincronía obligatoria entre unidades:
  - Si se toca un modelo: revisar también su servicio, sus schemas, el router, la migración y las pruebas.
  - Si se toca `permissions.py` o un router: revisar que todos los routers sigan usando `require_role`.
  - Si se toca un schema público (`modules/publico`): revisar la prueba de ficha sin costos.
  - Si cambia la API: regenerar los tipos de `src/frontend/src/api/`.
  - Si cambia una regla en `rules.py`: actualizar la prueba unitaria y, si aplica, el caso en `tests/casos_manuales.md`.
- Los 12 RF, los valores del ejemplo y las fallas críticas se resumen abajo; el detalle vive en `.docs/reto_cacao.md`.

**Audit before acting:** Verificar cada hallazgo contra el código actual. Corregir solo los problemas aún válidos. Saltear el resto con una razón breve. Mantener los cambios mínimos. Validar después.

### Documentation Maintenance

- `AGENTS.md` es documentación versionada del proyecto, no una nota local desechable.
- Todo cambio grande en arquitectura, auth, seguridad, base de datos, dependencias, rutas o flujo de trabajo debe revisar este archivo y los docs relacionados, y actualizarlos en el mismo commit.
- Si tras la revisión no se necesita ninguna edición, registrar esa decisión en el resumen del cambio.
- **Bitácora de IA obligatoria:** cada vez que se genere un componente relevante, añadir una entrada a `documentos/E08_IA_y_fuentes.md` con: herramienta, propósito, archivos afectados y qué debe revisar un humano.
- **Declaración de terceros:** toda librería y plantilla se declara con fuente y licencia en `documentos/E08_IA_y_fuentes.md`.
- **Precedencia de documentos:** `.docs/reto_cacao.md` (normativo) > este archivo > `documentos/` > comentarios en código.
- `ENTREGA.md` debe coincidir con el commit final; mantener la matriz requisito→componente→prueba→resultado al día.

---

## Current Risk Areas

Document known landmines here. Be specific: name the files, describe the behavior, state the failure mode.

**Fallas críticas del reto (cualquiera hunde el criterio):** perder registros, consumir más existencia de la disponible, exponer información interna al público, permitir liberar sin autorización. Toda decisión de diseño se evalúa contra estas cuatro.

- **[Control de acceso]**: `core/permissions.py::require_role` es el único punto de control, aplicado a cada router. Ocultar botones en el frontend no es seguridad. Un router sin `require_role` es una falla crítica (liberar sin autorización o filtrar costos).
- **[Ficha pública]**: `modules/publico` usa un esquema de salida propio con lista blanca de campos. Nunca reutilizar el schema interno del lote: costos, productor privado y datos internos se filtrarían. Un lote bloqueado no se ofrece como disponible.
- **[Inventario]**: el disponible se deriva del libro de movimientos (recibido − consumido); no existe como número suelto editable. El consumo se valida y se escribe en la misma transacción, con restricción en la base además de la validación en código. Dos peticiones concurrentes no deben poder sobrepasar la existencia.
- **[Idempotencia]**: la clave de idempotencia es única por operación y vive en la base (índice único). Reenviar la misma operación devuelve el resultado original sin volver a consumir. Aplica a transformaciones y a la sincronización offline.
- **[Auditoría]**: tabla de solo inserción (sin `UPDATE`/`DELETE` desde el código). Se escribe en la misma transacción que la operación auditada: quién, cuándo (hora del servidor, `core/clock.py`), qué cambió, valor anterior y nuevo. La hora de captura offline del cliente es un campo aparte y nunca reemplaza la hora del servidor.
- **[Transacciones y errores]**: un error no deja registros parciales ni pierde datos válidos. Toda operación multi-escritura va en una sola transacción con rollback completo.
- **[Persistencia y respaldo]**: PostgreSQL (marco §7); estado local ignorado por git. Verificar restauración por cantidades e identificadores, sin pérdida ni duplicación. Método y ubicación del respaldo por definir; no respaldar con copia de archivos de una base en escritura activa. `[RESUELTO]` la versión anterior de esta entrada asumía SQLite y copia de archivo.
- **[Valores del jurado]**: el jurado cambiará los valores de prueba. Merma, costo unitario y margen se calculan siempre; nunca hardcodear 20 %, 15 %, 20.000 ni 25.000. El umbral de alerta (15 %) es configuración, no literal en la lógica.
- **[División entre cero]**: costo unitario con salida vendible 0 y margen con precio 0 deben devolver un resultado explícito (error de dominio o valor nulo explicado), nunca una excepción sin manejar ni `inf`.
- **[Salida mayor que entrada]**: solo se acepta con justificación registrada (p. ej. adición de insumos). Sin justificación se rechaza. No comparar masas de etapas con bases distintas sin explicar el balance.
- **[Mezcla de lotes]**: una operación transforma un solo lote; si se mezclan, se conservan todos los orígenes en la trazabilidad.
- **[Offline]**: alcance limitado a la RECEPCIÓN de lotes. UUID técnico generado en el cliente; el servidor asigna el código legible (`CACxxx`) al sincronizar. Sincronización idempotente. Si a la hora 14 RF01–RF12 no recorren el flujo con pruebas, el offline se reduce o se descarta.
- **[Incidencia hora 12]**: bloquear CAC001, identificar origen y explicar cantidades afectadas, sin borrar historial. Requiere tarjeta de cambio (`documentos/cambios/CC-001`), ajuste de un criterio de aceptación y prueba de regresión en `tests/backend/regresion/`. Bloquear es un cambio de estado auditado, nunca un borrado.
- **[CSV]**: el CSV (RF11) y los cálculos autoritativos se generan en el servidor, solo para administrador.
- **[RESUELTO · Frontend sin backend, fase 1]** (ver «Fuente única por sesión»): hasta integrar el backend, el frontend ejecuta las reglas contra Dexie (`features/*/api/*Db.ts`) como respaldo local. Esto contradice «el frontend nunca decide» y es transitorio: en la fase 2 cada servicio llama primero a la API y Dexie queda como cola de recepciones. La rama `frontend` es la fuente de verdad de los contratos; lo que difiera en la rama `backend` se adapta del lado del backend.
- **[Vocabulario vigente]**: los campos y estados del frontend están en inglés/mayúsculas (`lotCode`, `producer`, `status` con `PENDIENTE|LIBERADO|BLOQUEADO`) y la rama `backend` también usa nombres en inglés. Se acordó mantenerlos en lugar de migrar a español; esta entrada reemplaza lo dicho en Domain Language sobre nombres idénticos en español.
- **[Usuarios demo locales]**: `context/usuariosDemo.ts` guarda usuarios de demostración solo para el modo sin backend. En la fase 2 la autenticación real la hace el servidor; estos usuarios solo se ofrecen con `VITE_PERMITIR_MODO_LOCAL=true` y deben desaparecer del despliegue final.
- **[Fuente única por sesión]**: al iniciar sesión, si la API responde todo va a la API (`features/*/api/*Api.ts`); solo si no hay red y `VITE_PERMITIR_MODO_LOCAL=true` todo va a Dexie (`*Db.ts`). Nunca se mezclan por llamada: dejaría lotes locales que el servidor no conoce y existencias duplicadas. Dexie conserva la cola de recepciones pendientes y la copia del catálogo de fincas. Un 401 con sesión la cierra sin tocar la cola.
- **[Modo local en la evaluación]**: `VITE_PERMITIR_MODO_LOCAL` debe ir en `false` en la entrega. Encendido, un fallo de red muestra datos de demostración en lugar del servidor.
- **[Contrato con el backend]**: `docs/contrato-api.md` lista endpoints, equivalencias de vocabulario y deltas pendientes. Si cambia un endpoint, se actualiza ese archivo y las pruebas de `*Api.test.ts` en el mismo commit. La forma de `/lots/{id}/traceability`, `/economics` y `/audit` se armó leyendo el código del backend y debe verificarse contra la API en marcha.
- **[CSV del servidor]**: `GET /exports/lots.csv` no neutraliza texto que Excel lee como fórmula; el CSV local sí. En modo API el archivo es el del servidor, así que el riesgo vive allí hasta que lo corrijan.
- **[Costo sin dato]**: el frontend omite `costs_cop` cuando el operador no lo escribe, pero el backend lo toma como 0 y el costo unitario deja de ser «no calculable». Hasta que el servidor acepte «sin dato», un costo de 0 puede ser un costo no registrado.
- **[Versiones del backend]**: `backend/requirements.txt` usa rangos y no hay lockfile; contradice «Supply Chain and Dependencies» y hace que CI pueda instalar versiones distintas.
- **[Datos sintéticos]**: solo datos sintéticos. Sin contraseñas, claves ni información privada en el repo ni en herramientas de IA.
- **[Dependencias]**: `[RESUELTO]` FastAPI y PostgreSQL ya están `[DECIDIDO]` en el marco (SQLite descartado). Sigue vigente: no instalar dependencias sin aprobación, versión exacta y declaración en E08 (ver Manual Actions).

Esta sección es un documento vivo. Agregar una entrada cada vez que se descubre un gotcha. Nunca borrar: marcar como `[RESUELTO]` si ya no aplica.

---

## Domain Language

El dominio se nombra en **español** y el término es **idéntico** en el modelo de datos, las rutas de API, los tipos (TypeScript, schemas Pydantic, modelos) y el texto de interfaz. No hay capa de traducción entre capas. Si aparece una, es un error de diseño. Sin tildes ni `ñ` en identificadores de código (`transformacion`, no `transformación`); con tildes en texto visible al usuario.

### Entidades principales

| Entidad | Descripción |
|---|---|
| `lote` | Cacao recibido de un productor. Id único legible (`CAC001`), productor, origen, fecha, cantidad, unidad |
| `movimiento` | Línea del libro de inventario (recibido, consumido). El disponible se deriva de la suma |
| `transformacion` | Operación sobre un lote: etapa, responsable, fecha, entradas, salidas, incidencias |
| `salida` | Producto resultante, ligado a su lote de origen |
| `incidencia` | Hecho registrado durante una etapa o reportado por el comprador |
| `alerta` | Resultado de una regla (merma, registro incompleto, retraso, costo) con regla y causa explicadas |
| `auditoria` | Registro inmutable: quién, cuándo, qué cambió, valor anterior y nuevo |
| `usuario` | Persona con un rol |
| `ficha_publica` | Vista pública de un lote con campos autorizados |

Roles (enum cerrado):

| Rol | Puede |
|---|---|
| `operador` | Registrar recepción, transformación e incidencias |
| `administrador` | Inventario, costos, alertas, cambio de estado, auditoría, exportación CSV |
| `comprador` | Solo consultar la ficha pública (sin necesidad de cuenta interna) |

Tipos de alerta (enum cerrado; no inventar otros): `merma`, `registro_incompleto`, `retraso`, `costo`.

### Estados del lote

Enum canónico, el mismo valor exacto en base de datos, API y UI:

| Valor | Significado |
|---|---|
| `pendiente` | Recibido, aún sin decisión del administrador |
| `liberado` | Autorizado por el administrador; se puede ofrecer |
| `bloqueado` | Retenido por el administrador con motivo; no se ofrece como disponible |

Solo el `administrador` cambia el estado, con motivo obligatorio. Las etiquetas de presentación se derivan en un solo lugar (`shared/`), nunca sueltas en componentes. Las transiciones válidas viven como función pura en `modules/estados/rules.py`.

### Vocabulario de especificación

- **Merma %** = (entrada − salida) / entrada × 100. Alerta si merma > 15 % (umbral configurable). Ejemplo: CAC001, 100 kg → 80 kg = 20 %.
- **Costo unitario** = costo total de la etapa / kg de salida vendible. Ejemplo: 1.600.000 COP / 80 kg = 20.000 COP/kg. Documentar qué costos incluye el total.
- **Margen sobre venta %** = (precio − costo unitario) / precio × 100. Ejemplo: precio 25.000 COP/kg → 20 %.
- Unidades visibles junto a toda cifra: kg, COP, COP/kg, %. Moneda COP con separador de miles.
- Datos base: CAC001 Productor A, Rivera, 100 kg; CAC002 Productor B, Campoalegre, 150 kg; CAC003 Productor C, Algeciras, 80 kg (cacao seco). Municipios son referencias del caso, no afirmaciones sobre productores reales.
- Una salida mayor que la entrada requiere justificación registrada.
- Las reglas de cálculo son del ejercicio, no estándares agronómicos.

---

## Design Patterns and Component Reuse

### Estructura de módulos (backend)

- Cada módulo tiene `router.py`, `service.py`, `schemas.py`, `models.py`, `rules.py`.
- `rules.py` contiene **funciones puras** (merma, costo, margen, transiciones de estado): sin base de datos, sin framework, sin reloj. Son lo primero que se prueba.
- **Un módulo nunca importa modelos de otro módulo, solo su servicio.** Evita acoplamiento y permite razonar sobre transacciones.
- Las reglas de inventario, costos, estados y permisos viven solo en el backend. El frontend muestra, nunca decide.
- Errores de dominio definidos en `core/errors.py` con mensajes claros (qué pasó / por qué / qué hacer). Los routers los traducen a respuestas HTTP; no se filtran trazas.
- Cantidades positivas validadas en schema **y** con restricción (`CHECK`) en la base.

### Frontend

- Un directorio por módulo del backend en `features/`. Componentes de dominio dentro de su feature; primitivos reutilizables en `shared/`. Antes de crear un componente, revisar `shared/`.
- El cliente y los tipos de `api/` se generan desde OpenAPI; no editarlos a mano.
- Interfaz usable en computador y pantalla móvil. Etiquetas en formularios, contraste legible, navegación por teclado, foco visible (nunca anularlo sin sustituto).
- Objetivos táctiles de tamaño cómodo en móvil. Sistema visual y tokens: por definir; hasta entonces, un único archivo de tokens y componentes que consumen solo esos tokens.
- Formato de números y fechas centralizado en `shared/`; no formatear en cada componente.
- Mostrar siempre fórmula, unidades y supuestos junto a los indicadores económicos (RF05, RF12).
- Respetar `prefers-reduced-motion`; animaciones mínimas.

### Naming

- Módulos y archivos Python: `snake_case` (`transformacion/service.py`).
- Funciones puras de reglas: verbo + sustantivo (`calcular_merma`, `calcular_costo_unitario`, `puede_transicionar`).
- Componentes React: `PascalCase` (`FormularioRecepcion.tsx`). Hooks: `useX`. Utilidades: `camelCase`.
- Tipos e interfaces TypeScript: `PascalCase`, nombres de dominio en español (`Lote`, `Transformacion`).
- Rutas de API: minúsculas en español, plural, con guiones si hace falta (`/lotes`, `/transformaciones`, `/publico/fichas/{codigo}`).
- Variables de entorno: `SCREAMING_SNAKE_CASE` y declaradas en `.env.example`.

---

## Commits and PRs

### Commits

Corto, directo. Sin storytelling. Todo commit lleva título y descripción explícitos. Commits pequeños, uno por rebanada o paso verificable.

Formato:
- **Título:** `<type>: <qué cambió, máx. 72 chars>`
- **Cuerpo:** separado del título por una línea en blanco. El *por qué*, razones técnicas, alcance. Sin redundancias.

Types: `feature`, `fix`, `hotfix`, `refactor`, `test`, `chore`, `docs`, `style`, `perf`

Buen ejemplo:
```text
feature: add merma and alert rule for transformations

- calcular_merma es función pura en economia/rules.py.
- Alerta cuando merma supera el umbral configurable (15 % por defecto).
- Cubierta por pruebas unitarias con el ejemplo CAC001 y valores nuevos.
```

Malo:
```text
feature: add comprehensive system with full validation and error handling   <- título largo
chore: various improvements and cleanup                                     <- vago, sin cuerpo
```

### Stash Workflow

Preferir `git stash apply` sobre `git stash pop`. `pop` elimina el stash de inmediato; un fallo durante el aplique puede perder cambios. `apply` o `git checkout stash@{n} -- <ruta>` preserva la fuente hasta verificar.

### Architectural decisions

Cuando un cambio introduce una decisión de diseño no obvia, agregar un comentario junto al punto de decisión:

```
# [DECISION] {elección} — {por qué}. {tradeoff o acción futura si aplica}.
```

No escribir ADR separados. La decisión vive con el código. Las dos decisiones técnicas que exige E03 se resumen en `documentos/E03_diseno.md`.

### PRs y etiqueta final

Cada PR pasa: lint + typecheck + build + test (cuando el runner esté definido; ver `ci.yml`). El commit/etiqueta final se registra en `ENTREGA.md` con el hash completo. Tras la etiqueta final el código no se edita.

---

## Manual Actions — Do Not Touch

El agente no debe ejecutar estas acciones. Describir lo que se necesita y pedir al usuario que lo ejecute.

| Action | Why |
|---|---|
| `make seed`, `make restore`, borrar `datos/runtime/` | Mutación o pérdida de datos; pérdida de registros es falla crítica |
| Editar `.env` o secretos | Contiene credenciales; nunca versionar |
| Modificar `core/security.py` o `core/permissions.py` sin aprobación | Cualquier cambio afecta todas las rutas autenticadas y la protección contra liberar sin autorización |
| Git push, merge, etiqueta final o deploy | Operaciones remotas; la etiqueta final congela el código |
| Instalar nuevas dependencias | Requiere declarar fuente y licencia, versión exacta y commit del lockfile |
| Modificar `.docs/` | Contexto normativo del reto; preguntar primero |

Cuando alguna de estas acciones sea necesaria, generar un bloque claro:

```text
MANUAL ACTION REQUIRED:
1. Run: {comando exacto}
2. Verify: {qué verificar}
3. Confirm before I continue with the next step
```

---

## TDD and Validation

### Test-first workflow

1. Escribir el test que define el comportamiento esperado.
2. Ejecutarlo: debe fallar (red).
3. Escribir el código mínimo para que pase (green).
4. Refactorizar si es necesario; los tests deben seguir en verde.
5. Ejecutar la suite completa antes de hacer commit.

Las funciones puras de `rules.py` se escriben primero con su prueba.

### Test conventions

- Framework: pytest para el backend (`TestClient` de FastAPI para integración, base SQLite temporal por prueba). Frontend: vitest con `fake-indexeddb` y `jsdom`; pruebas junto al código (`*.test.ts`), una base Dexie limpia por prueba (`src/test/limpiarDb.ts`).
- Ubicación: `tests/backend/{unit,integration,regresion,rendimiento}/`; casos manuales en `tests/casos_manuales.md`.
- Hora: usar `core/clock.py` sustituible; las pruebas nunca dependen del reloj real.
- Mocking: sin servicios externos reales. Entradas externas simuladas se identifican expresamente.
- Cobertura objetivo: no se exige porcentaje. Las pruebas deben verificar comportamiento relevante, no repetir la implementación.
- Cada test es independiente: sin estado compartido; base y datos propios por prueba.

**Mínimos del reto:** 5 pruebas automáticas relevantes (merma, validación, permisos, idempotencia, ficha sin costos) y 15 casos documentados con ID, requisito, datos, pasos, esperado, obtenido, estado y evidencia. Deben cubrir: flujo feliz, dato inválido, lote duplicado, falta de existencia, reenvío de operación, costos con salida cero, permiso denegado, bloqueo y consulta pública, cambio auditado, persistencia, exportación, respaldo y restauración, además de la regresión de la hora 12 y la medición de rendimiento (100 registros, <= 3 s, método y equipo declarados).

No inventar resultados de pruebas. Registrar lo obtenido tal cual; si falla, indicar corrección o limitación pendiente.

### Validation before claiming done

Antes de declarar el trabajo completo:

1. Typecheck — backend (comando por definir) y `tsc` en frontend. Sin errores.
2. Lint — sin errores.
3. `make test` — todos los tests pasan.
4. Build del frontend — exitoso.
5. Para cambios visibles: recorrer el flujo afectado en la aplicación real.

Si alguno falla, corregir antes de reportar. Si un comando aún no existe, decirlo explícitamente en lugar de omitirlo.

---

## Verify Before Fixing

Antes de implementar cualquier plan o corrección:

1. Verificar el hallazgo: leer el código actual, no suposiciones sobre él.
2. Confirmar que sigue siendo válido: el código pudo haber cambiado.
3. Si es inválido: saltear con una razón de una línea: `# [SKIP] Already handled in {file}:{line}`
4. Si es válido: corregir con cambios mínimos. No refactorizar código adyacente salvo que la corrección lo requiera.
5. Validar: ejecutar el test o comando de verificación relevante.
6. Reportar: qué se corrigió, qué se saltó y por qué.

Esto aplica a toda tarea: bug fixes, features, refactors, auditorías.

---

## Supply Chain and Dependencies

Versiones exactas en los manifiestos (`pyproject.toml`, `package.json`): sin `^`, `~` ni rangos abiertos. Commitear el lockfile con cada cambio que toque el manifiesto.

No cargar código de terceros desde CDN en producción. Todo el código externo se instala como dependencia y se bundlea; la aplicación debe funcionar sin conexión durante la evaluación.

Reglas del evento: el código específico del reto se escribe durante el evento; no reutilizar proyectos previos ni presentar un producto preexistente como nuevo. Toda librería, plantilla, servicio y licencia se declara en `documentos/E08_IA_y_fuentes.md`. Preferir pocas dependencias que el equipo pueda explicar.

---

## Writing and Documentation

El texto en este repositorio sigue: sin emojis, sin relleno, sin vocabulario corporativo. Prosa por defecto, en español. Los comentarios de código explican el *por qué* y el *qué no obvio*, nunca el *cómo*. Marcadores opcionales: `[!]` peligroso, `[?]` incierto, `[x]` deprecado.

Documentos de `documentos/` en markdown, priorizando contenido verificable y breve. Presupuesto total: 15 páginas (sin pitch ni salidas de pruebas); E01 y E06/E07 de 1 a 2 páginas. No afirmar resultados de campo, entrevistas, métricas ni pruebas que no ocurrieron. Distinguir lo tomado del caso, los supuestos y las consultas realmente realizadas. Los resultados esperados del piloto son hipótesis.

### Comment style

Los comentarios suenan como un colega dejando una nota rápida: breves, conceptuales, sin explicar lo obvio.

```
# razón de una decisión que el código no comunica por sí solo
# gotcha conocido que no es evidente desde afuera
# intención de diseño que se perdería en un refactor inocente
```

Docstrings solo en funciones públicas de `rules.py` y de servicios: qué hace, parámetros con unidades, retorno y errores de dominio que lanza.

### UI copy

- Se le habla al usuario de **usted**, en español claro y sin jerga técnica.
- Mensajes de error con tres partes: qué pasó, por qué importa, qué hacer. Ejemplo: "No se registró la transformación. Solicitó 120 kg y el lote CAC001 tiene 100 kg disponibles. Reduzca la cantidad a 100 kg o menos."
- Nunca mostrar trazas, códigos internos ni mensajes de la base de datos.
- Términos del dominio exactamente como en Domain Language; sin sinónimos nuevos.
- La ficha pública jamás menciona costos internos, márgenes ni datos privados del productor.

## Implementación de pantallas conectadas (2026-10-16)

- La aplicación activa compone recepción offline, `WorkspaceViews.tsx`, `UsersView.tsx` y `BusinessViews.tsx` desde `App.tsx`. Las pantallas heredadas desconectadas se guardan en `src/frontend/design-reference/legacy/` y no forman parte del build.
- La cola offline se limita a recepciones. Las transformaciones conservan clave idempotente y payload en `sessionStorage` hasta confirmar respuesta; usuarios, analítica, inventario, estados y auditoría son datos del servidor.
- La API incorpora `/users` (admin), `GET /transformations`, `/analytics/dashboard` (admin) y el municipio nullable de usuario vía migración `b6d1ef3a9204`. Esa migración está creada, pero no se aplicó a PostgreSQL persistente.
- Los umbrales de alerta se configuran por entorno; la alerta de costo está apagada si no se define `COST_ALERT_THRESHOLD_COP_PER_KG`.
