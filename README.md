# Dashboard de Consultas — Recaudamas

Dashboard en tiempo real que muestra, mes a mes, la cantidad de consultas de
facturación realizadas, obteniendo los datos desde la API de Recaudamas.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** para los estilos
- **Chart.js** (via `react-chartjs-2`) para los gráficos

## Características

- Tarjetas resumen: total de consultas, promedio mensual, mes pico y meses con actividad.
- Gráfico de **barras** (consultas por mes) y de **línea** (tendencia).
- Tabla de **detalle mensual** con estado OK/Error por mes.
- Selector de rango de fechas y botón **Actualizar** (recarga bajo demanda).
- Rango por defecto: **01/01/2026 → fecha actual del sistema**.
- **Exportar a CSV** (separador `;`, compatible con Excel en español).
- UI responsive con estados de carga (skeletons) y manejo de errores.

## Estructura del proyecto

```
estadisticas-ulloa/
├── app/
│   ├── layout.tsx              # Layout raíz + metadata
│   ├── globals.css             # Estilos Tailwind
│   ├── page.tsx                # Dashboard (cliente) con Chart.js
│   └── api/facturacion/route.ts  # API route: consulta Recaudamas mes a mes
├── components/charts.tsx       # Registro de Chart.js + exports Bar/Line
├── lib/types.ts                # Tipos compartidos
├── .env.local                  # Variables locales (NO versionado)
└── .env.example                # Documentación de variables requeridas
```

## Cómo funciona

La ruta `/api/facturacion` consulta la API externa de Recaudamas **una vez por
mes**, usando las fechas de inicio y fin de cada mes, y devuelve un agregado:

```json
{
  "success": true,
  "total": 319,
  "from": "2026-01-01",
  "to": "2026-09-03",
  "count": 9,
  "months": [
    { "month": "2026-05", "label": "Mayo", "totalConsultas": 60, ... }
  ],
  "errors": 0
}
```

### Rango de fechas por defecto

- **Fecha de inicio:** `01/01/2026`.
- **Fecha final:** la fecha actual del sistema (calculada dinámicamente).

El usuario puede modificar el rango desde el dashboard mediante los campos de
fecha y el botón **Aplicar rango**. La fecha final por defecto se obtiene de
`new Date()` en el cliente y en el servidor, por lo que siempre refleja el día
de hoy en formato `YYYY-MM-DD`.

El token de autorización se lee del servidor (nunca se expone al cliente).

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

| Variable                | Descripción                                   |
|-------------------------|-----------------------------------------------|
| `RECAUDAMAS_API_URL`    | URL del endpoint de consulta de facturación   |
| `RECAUDAMAS_API_TOKEN`  | Token Bearer de la API                        |

```env
RECAUDAMAS_API_URL=https://www.recaudamas.com.co/api/controllers/facturacion/consultTotalFacturas
RECAUDAMAS_API_TOKEN=TU_TOKEN_AQUI
```

## Desarrollo

```powershell
npm install
npm run dev        # http://localhost:3000
```

## Build de producción

```powershell
npm run build
npm start
```

## Despliegue en Vercel

### Opción 1 — CLI (comando combinado)

```powershell
# 1. Login (abre el navegador, solo la primera vez)
vercel login

# 2. Despliegue a producción
vercel --prod --yes
```

### Opción 2 — Configurar variables + desplegar (paso a paso)

```powershell
vercel login

# Vincular el proyecto (detecta Next.js automáticamente)
vercel link --yes --project estadisticas-ulloa

# Configurar variables de entorno (Production, Preview, Development)
vercel env add RECAUDAMAS_API_URL production,preview,development `
  --value "https://www.recaudamas.com.co/api/controllers/facturacion/consultTotalFacturas" `
  --type config --yes

vercel env add RECAUDAMAS_API_TOKEN production,preview,development `
  --value "TU_TOKEN_AQUI" --type secret --yes

# Desplegar
vercel --prod --yes
```

> Nota: para desplegar automáticamente en cada `git push`, conecta el
> repositorio con `vercel git connect` o desde el dashboard de Vercel
> (Add New Project → importar el repo).

## Repositorio

- GitHub: https://github.com/afosoriobyp/estadisticas-ulloa
- Producción: https://estadisticas-ulloa.vercel.app