# Extractor de Anexos — Compras Públicas (Fase 1)

Herramienta interna de Coresolutions para extraer y visualizar requisitos técnicos
de pliegos de compras públicas, como base para completar Anexo 2 (Personal Técnico)
y Anexo 3 (Experiencia del Personal Técnico).

Esta fase **solo extrae y visualiza** — no genera documentos ni guarda datos entre
sesiones.

## Cómo funciona

1. El usuario sube un PDF (el pliego) en la columna izquierda; se visualiza embebido
   y navegable.
2. El texto del PDF se extrae **en el navegador** (`pdfjs-dist`) — el archivo nunca
   se sube al servidor. Solo el texto extraído se envía a `/api/extract`, que lo
   analiza con la API de Claude (Anthropic) usando un prompt que fuerza una salida
   JSON estructurada.
3. La columna derecha muestra los requisitos detectados y los campos sugeridos para
   Anexo 2 y Anexo 3.

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
