# Extractor de Anexos — Compras Públicas (Fase 1)

Herramienta interna de Coresolutions para extraer y visualizar requisitos técnicos
de pliegos de compras públicas, como base para completar Anexo 2 (Personal Técnico)
y Anexo 3 (Experiencia del Personal Técnico).

Esta fase **solo extrae y visualiza** — no genera documentos. Los PDFs en sí
nunca se guardan, pero **sí persisten** (en Vercel Blob, no solo en el navegador)
tanto el roster de **técnicos** como el resultado del análisis por **número de
proceso**, para poder reutilizarlos entre sesiones y usuarios (ver más abajo).

## Cómo funciona

1. El usuario sube uno o más PDFs (el pliego, o varios documentos del mismo proceso)
   en la columna izquierda; cada uno se visualiza embebido y navegable, con pestañas
   para cambiar entre ellos si hay más de uno.
2. El texto de cada PDF se extrae **en el navegador** (`pdfjs-dist`) — los archivos
   nunca se suben al servidor. Solo el texto extraído de todos los documentos se
   envía en una sola solicitud a `/api/extract`, que lo analiza con la API de Claude
   (Anthropic) usando un prompt que fuerza una salida JSON estructurada.
3. La columna derecha muestra **un único resultado consolidado**: si el mismo
   requisito o perfil aparece repetido entre documentos (o dentro del mismo
   documento), se combina en una sola entrada — tanto por instrucción explícita al
   modelo como por una limpieza de duplicados exactos en el servidor. Al agregar o
   quitar un documento, el análisis se vuelve a consolidar automáticamente.
4. En el botón **Técnicos** del encabezado se administra un roster de técnicos
   (nombre, cédula, título académico, nivel de estudio, certificaciones), guardado
   de forma persistente en Vercel Blob. En cada fila del Anexo 2 se puede asignar
   un técnico del roster al perfil detectado, autocompletando el campo "Nombre" y
   avisando si el título del técnico no coincide con el requerido.
5. Al inicio de la columna derecha se destacan las **fechas clave del proceso**
   (presentación de oferta, puja/subasta inversa y adjudicación), con fecha y hora
   cuando el pliego las indique.
6. Cada análisis se guarda en Vercel Blob asociado a un **número de proceso**
   (campo editable en la barra superior; se intenta autodetectar del propio
   texto del pliego, ej. buscando "CÓDIGO DEL PROCESO"). Si vuelves a subir
   documentos del mismo proceso, el resultado se carga desde el caché **sin
   volver a llamar a Claude** — el badge "Cargado desde caché" lo indica, con
   un botón "Reanalizar con IA" para forzar un análisis nuevo (por ejemplo, si
   el pliego cambió).
7. Cada proceso guardado recibe además un **nombre automático de proyecto**
   con el formato `CLIENTE-AÑOMESDIA-DESCRIPCION` (ej.
   `ETAPA EP-260716-STORAGE Y VMS`), generado a partir de la entidad
   contratante y el objeto de contratación detectados por el modelo, más la
   fecha del análisis. En el botón **Procesos** del encabezado se abre un
   menú con todos los procesos guardados (nombre, número, fecha, documentos)
   para reabrir cualquiera de ellos — sin volver a usar IA — o eliminarlo.

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
