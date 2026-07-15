# Extractor de Anexos — Compras Públicas (Fase 1)

Herramienta interna de Coresolutions para extraer y visualizar requisitos técnicos
de pliegos de compras públicas, como base para completar Anexo 2 (Personal Técnico)
y Anexo 3 (Experiencia del Personal Técnico).

Esta fase **solo extrae y visualiza** — no genera documentos ni guarda datos entre
sesiones.

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

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # agrega tu ANTHROPIC_API_KEY
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable            | Descripción                                   |
| ------------------- | ---------------------------------------------- |
| `ANTHROPIC_API_KEY`  | API key de Anthropic usada por `/api/extract`. |

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura la variable de entorno `ANTHROPIC_API_KEY` en el proyecto.
3. Despliega — no se requiere configuración adicional.

## Stack

- Next.js (App Router) + TypeScript
- `react-pdf` para la visualización del PDF
- `pdfjs-dist` para extraer el texto del PDF en el navegador (evita subir el
  archivo completo y el límite de tamaño de payload de las funciones serverless)
- `@anthropic-ai/sdk` para la extracción de requisitos vía Claude
