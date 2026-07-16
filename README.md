# Extractor de Anexos — Compras Públicas (Fase 1)

Herramienta interna de Coresolutions para extraer y visualizar requisitos técnicos
de pliegos de compras públicas, como base para completar Anexo 2 (Personal Técnico)
y Anexo 3 (Experiencia del Personal Técnico).

Esta fase **solo extrae y visualiza** — no genera documentos. Los PDFs en sí
nunca se guardan, pero **sí persisten** (en Vercel Blob, no solo en el navegador)
tanto el roster de **técnicos** como el resultado del análisis por **número de
proceso**, para poder reutilizarlos entre sesiones y usuarios (ver más abajo).

## Cómo funciona

1. La pantalla de inicio (`/`) es un **buscador de procesos**: un campo de
   búsqueda (por nombre o número) y, debajo, la lista de todos los procesos ya
   analizados (guardados en Vercel Blob). El botón **"+ Nuevo proceso"** lleva
   a la pantalla de análisis; hacer clic en un proceso de la lista lo reabre
   sin volver a usar IA.
2. En `/analizar` se suben uno o más PDFs (el pliego, o varios documentos del
   mismo proceso) en la columna izquierda; cada uno se visualiza embebido y
   navegable, con pestañas para cambiar entre ellos si hay más de uno.
   **Subir un archivo no dispara el análisis automáticamente** — hay que
   presionar el botón **"Analizar"**.
3. Al presionar "Analizar", el texto de cada PDF se extrae **en el navegador**
   (`pdfjs-dist`) — los archivos nunca se suben al servidor. Solo el texto
   extraído de todos los documentos se envía en una sola solicitud a
   `/api/extract`, que lo analiza con la API de Claude (Anthropic) usando un
   prompt que fuerza una salida JSON estructurada.
4. La columna derecha muestra **un único resultado consolidado**: si el mismo
   requisito o perfil aparece repetido entre documentos (o dentro del mismo
   documento), se combina en una sola entrada — tanto por instrucción explícita al
   modelo como por una limpieza de duplicados exactos en el servidor. Agregar o
   quitar un documento invalida el análisis anterior y requiere presionar
   "Analizar" de nuevo.
5. En el botón **Técnicos** del encabezado se administra un roster de técnicos
   (nombre, cédula, rol, título de tercer nivel, cuarto nivel/maestría, nivel de
   estudio, fecha de contrato, fecha de ingreso, certificaciones), guardado de
   forma persistente en Vercel Blob. Cada técnico puede tener documentos
   adjuntos agrupados por tipo — **Senescyt** (título registrado) y
   **Certificaciones**, cada uno con uno o varios archivos (ej. varias páginas
   escaneadas de un mismo documento) — con vista previa integrada (imágenes o
   PDF embebidos, sin salir de la app). Agregar un nuevo tipo de documento es
   una línea de código (`TIPOS_DOCUMENTO` en `TecnicosManager.tsx`). En cada
   fila del Anexo 2 se puede asignar un técnico del roster al perfil
   detectado, autocompletando el campo "Nombre" y avisando si el título del
   técnico no coincide con el requerido — la comparación tolera variantes de
   redacción y no avisa cuando el pliego acepta "afines".
6. Al inicio de la columna derecha se destacan las **fechas clave del proceso**
   (presentación de oferta, puja/subasta inversa y adjudicación), con fecha y hora
   cuando el pliego las indique.
7. El botón **"Vista previa Anexo 2"** abre el documento completo replicando
   el formato exacto de la plantilla oficial (`Anexo_2_personal_tecnico.docx`):
   fondo blanco, membrete con el logo de CORESOLUTIONS y datos de contacto,
   tipografía Calibri en los mismos tamaños que el original, título en azul
   (#1F4E79) con línea inferior, tabla con encabezado azul marino (#44546A) y
   texto blanco en negrita, párrafos justificados. El documento respeta el
   mismo orden y paginación que el archivo real — cada sección empieza en una
   página nueva: (1) portada con título, resumen de la empresa y la tabla de
   "Cumplimiento de personal técnico mínimo"; (2) "Títulos profesionales y
   formación académica" (con los documentos Senescyt de cada técnico asignado
   insertados automáticamente); (3) "Certificaciones de consultores y
   especialistas técnicos" (ídem); (4) bloque de firma, con espacio en blanco
   reservado para firmar antes de la línea y el nombre. El botón
   **"Editar todo"** vuelve editable a mano absolutamente todo el texto —
   celdas de la tabla, párrafos introductorios, membrete y firma — sin
   depender de lo que detectó la IA o del técnico asignado; la fecha de firma
   es siempre editable, incluso fuera de "Editar todo", porque cambia en cada
   proceso. Los cambios se guardan automáticamente al salir de cada campo,
   persistidos junto con el resto del análisis en Vercel Blob. Los botones
   **"Descargar PDF"** (usa el diálogo de impresión del navegador, ya
   configurado para mostrar solo el documento) y **"Descargar Word"** (genera
   un `.docx` real con la misma estructura, tabla e imágenes de los técnicos,
   usando la librería `docx`) permiten obtener el archivo final.
8. Cada análisis se guarda en Vercel Blob asociado a un **número de proceso**
   (campo editable en la barra superior; se intenta autodetectar del propio
   texto del pliego, ej. buscando "CÓDIGO DEL PROCESO"). Si no hay número
   detectable, se usa como clave el **nombre automático de proyecto**
   (`CLIENTE-AÑOMESDIA-DESCRIPCION`, ej. `ETAPA-260716-STORAGE Y VMS`),
   generado a partir de la entidad contratante y el objeto de contratación que
   detecta el modelo. Si vuelves a analizar el mismo proceso, el resultado se
   carga desde el caché **sin volver a llamar a Claude** — el badge "Cargado
   desde caché" lo indica, con un botón "Reanalizar con IA" para forzar un
   análisis nuevo (por ejemplo, si el pliego cambió).
9. El botón **"← Volver"** regresa al buscador de procesos. Si el análisis
   actual todavía no se ha guardado en la base de datos, intenta guardarlo
   antes de salir; si el guardado falla, muestra una advertencia antes de
   dejar la página para no perder el trabajo en silencio. Un badge junto al
   número de proceso indica el estado: "Guardando…", "Guardado ✓" o "Error al
   guardar" (con opción de reintentar).

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # agrega tu ANTHROPIC_API_KEY
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable               | Descripción                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`    | API key de Anthropic usada por `/api/extract`.                     |
| `ANTHROPIC_MODEL`      | Opcional. Modelo de Claude a usar (por defecto `claude-haiku-4-5-20251001`, económico para pruebas). Cambia a `claude-sonnet-5` u otro modelo para producción. |
| `BLOB_READ_WRITE_TOKEN`| Token de Vercel Blob usado por `/api/tecnicos` (roster de técnicos) y `/api/procesos` (caché de análisis por proceso). Se inyecta automáticamente al conectar un Blob Store al proyecto (ver despliegue abajo) — no hace falta configurarlo a mano en Vercel, pero sí en local. |

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura la variable de entorno `ANTHROPIC_API_KEY` en el proyecto.
3. Ve a la pestaña **Storage** del proyecto → **Create Database** → **Blob** →
   conéctalo al proyecto. Esto agrega automáticamente `BLOB_READ_WRITE_TOKEN`
   como variable de entorno (necesario para que persistan el roster de
   técnicos y el caché de análisis por proceso).
4. Despliega (o redeploy si el proyecto ya existía) para que las variables de
   entorno nuevas se apliquen.

Para desarrollo local, copia el mismo `BLOB_READ_WRITE_TOKEN` del proyecto en
Vercel a tu `.env.local` (Settings → Environment Variables) — sin él, `/api/tecnicos`
y `/api/procesos` responden con un error claro en vez de fallar en silencio.

## Stack

- Next.js (App Router) + TypeScript
- `react-pdf` para la visualización del PDF
- `pdfjs-dist` para extraer el texto del PDF en el navegador (evita subir el
  archivo completo y el límite de tamaño de payload de las funciones serverless)
- `@anthropic-ai/sdk` para la extracción de requisitos vía Claude
- `@vercel/blob` para persistir el roster de técnicos y el caché de análisis
  por proceso, cada uno como documentos JSON
- `docx` para generar el archivo Word del Anexo 2 con el mismo formato que la
  plantilla oficial; "Descargar PDF" usa el diálogo de impresión del
  navegador sobre esa misma vista previa

## Pruebas end-to-end

```bash
npm run test:e2e
```

Corre la suite de Playwright en `e2e/` contra un servidor de desarrollo local
(arrancado automáticamente). Todas las llamadas a `/api/*` se simulan con
`page.route` (ver `e2e/mocks.ts`), así que no hace falta `ANTHROPIC_API_KEY`
ni `BLOB_READ_WRITE_TOKEN` para correrlas. Cubre: el buscador de procesos, el
análisis manual (sin auto-análisis, caché por número de proceso, guardado al
salir con "Volver"), el roster de técnicos (alta y documentos multi-archivo),
y el Anexo 2 (tolerancia de "afines" en la coincidencia de título, la
regresión del override vacío, el orden/paginación de la vista previa, la
fecha siempre editable y la exportación a Word). Se ejecuta automáticamente
en GitHub Actions (`.github/workflows/e2e.yml`) en cada push a `main` y en
cada pull request.
