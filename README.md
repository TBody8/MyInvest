# 📈 Mis Inversiones | Trading 212 Dashboard

Dashboard financiero personal, ultraligero y enfocado exclusivamente en el **beneficio real** de tus inversiones en Trading 212. Diseñado **Mobile-First**, con soporte completo **PWA** (instalable en tu móvil), tipografía suiza/financiera (**Satoshi + JetBrains Mono**), modo oscuro nativo, base de datos local SQLite para snapshots históricos automáticos y preparado para auto-alojarse en tu **VPS**.

---

## 🚀 Características Principales

### 1. 💰 Foco Absoluto en el Beneficio Real
- El **beneficio real neto** en euros y porcentaje es el protagonista visual (`[Valor Cartera] - [Total Invertido]`).
- Variación intradía calculada (`▲ +42,30 € (+1,85 %) hoy`).
- Referencias limpias en línea de **Total Invertido** y **Valor de Cartera** (sin saturar con efectivo sin invertir ni dividendos irrelevantes).

### 2. 📊 Gráfico Multifunción con Dropdown de Vistas
Donde se sitúa el título del gráfico, dispones de un **desplegable interactivo** para alternar entre 3 modos de análisis:
1. **Beneficio Real (€):** curva de ganancia/pérdida neta acumulada en euros con línea de referencia en 0 €.
2. **Valor de Cartera (€):** curva de patrimonio total de la cartera a lo largo del tiempo.
3. **Rentabilidad (%):** rendimiento porcentual acumulado de la inversión.

Debajo del gráfico se sitúa el **selector temporal táctil**:
- **1D** (Intradía) · **1S** (1 Semana) · **1M** (1 Mes) · **1A** (1 Año) · **TODO** (Histórico completo).

### 3. 🎯 Métricas de Rendimiento Clave
- **TWR (Time-Weighted Return):** mide tu habilidad como inversor eliminando la distorsión del timing de depósitos/retiradas.
- **vs S&P 500:** comparativa de rendimiento frente al índice global de referencia.
- **Concentración:** alerta si algún activo supera el 25% del portfolio para cuidar la diversificación.

### 4. 🍩 Composición & Tabla de Posiciones
- **Distribución de activos:** gráfico donut minimalista con porcentajes y euros por activo.
- **Tabla de posiciones abiertas:** buscador en tiempo real, ordenación por cualquier columna, con scroll horizontal táctil para móvil.

### 5. 📅 Heatmap de Rendimiento Mensual
- Matriz compacta mes a mes con el retorno porcentual para evaluar la consistencia temporal.

### 6. 📱 Mobile-First & PWA (Descargable en tu móvil)
- **Instalable en iOS y Android:** botón directo para añadir a la pantalla de inicio como una aplicación nativa.
- **Service Worker (`public/sw.js`):** estrategia network-first para llamadas a la API con fallback a caché local cuando estés sin conexión.
- **Diseño sin "AI Slop":** sin tarjetas dentro de tarjetas ni iconos en círculos de colores. La jerarquía la define el propio dato mediante tipografía y separadores sutiles.

### 7. ⏰ Snapshots Automáticos en VPS (node-cron + SQLite)
- Incluye un cron job interno (`src/lib/cron.ts`) que corre a las **21:00 CET** (cierre de mercados europeos).
- Guarda automáticamente una foto diaria del valor y posiciones en SQLite (`prisma/portfolio.db`).
- Botón en la app para **forzar snapshot manual** en cualquier momento.

---

## ⚙️ Conexión con tu cuenta de Trading 212

Abre o crea el archivo `.env.local` en la raíz del proyecto:

```env
DATABASE_URL="file:./portfolio.db"
T212_API_KEY="tu_api_key_aqui"
T212_BASE_URL="https://live.trading212.com/api/v0"
SNAPSHOT_CRON="0 21 * * *"
ENABLE_DEMO_FALLBACK="true"
```

> **Nota:** Si la API key está vacía o no responde, la app entra automáticamente en **Modo Demostración** con datos realistas para que siempre puedas navegar por la interfaz y probarla.

---

## 🖥️ Comandos de Desarrollo y Producción

```bash
# Instalar dependencias
npm install

# Generar cliente de Prisma y base de datos SQLite
npx prisma db push

# Poblar con datos históricos de ejemplo
npm run seed

# Compilar para producción
npm run build

# Iniciar servidor
npm start
```

---

## 🚀 Despliegue en VPS (Ubuntu / Debian)

Hemos incluido la carpeta `deploy/` con todo listo para tu servidor:

1. Clona o copia el proyecto en tu VPS.
2. Configura tu `.env.local` con tu API key.
3. Ejecuta el instalador automatizado:
   ```bash
   chmod +x deploy/setup-vps.sh
   ./deploy/setup-vps.sh
   ```
4. El script instala Node 22, PM2, compila la app y la arranca en el puerto 3000 con reinicio automático.
