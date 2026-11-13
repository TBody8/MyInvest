#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Instalador de 'Mis Inversiones | Trading 212' en VPS"
echo "=========================================================="

# 1. Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Node.js no detectado. Instalando Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Versión de Node.js: $(node -v)"
echo "Versión de NPM: $(npm -v)"

# 2. Instalar PM2 globalmente si no existe
if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2 process manager..."
    sudo npm install -g pm2
fi

# 3. Instalar dependencias del proyecto
echo "Instalando dependencias npm..."
npm install

# 4. Sincronizar base de datos SQLite con Prisma
echo "Generando base de datos SQLite y Prisma Client..."
npx prisma db push

# 5. Ejecutar seed de datos iniciales si no existen datos
npm run seed

# 6. Compilar build de producción optimizado
echo "Compilando aplicación Next.js..."
npm run build

# 7. Iniciar con PM2
echo "Iniciando con PM2..."
pm2 start deploy/ecosystem.config.cjs

# Guardar estado de PM2 para que sobreviva a reinicios del VPS
pm2 save

echo "=========================================================="
echo "  ¡Despliegue completado con éxito!"
echo "  La app está corriendo en http://localhost:3000"
echo "  Usa 'pm2 status' o 'pm2 logs' para monitorizar."
echo "=========================================================="
