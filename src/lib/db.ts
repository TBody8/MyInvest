import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string | undefined {
  // Si en Dokploy / Docker se inyecta una URL absoluta explícita y existe, usarla
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:/") && !process.env.DATABASE_URL.startsWith("file:./")) {
    const filePath = process.env.DATABASE_URL.replace(/^file:/, "");
    if (fs.existsSync(filePath)) {
      return process.env.DATABASE_URL;
    }
  }

  // Buscar el archivo real portfolio.db en ubicaciones estándar (root, standalone, parent o Docker)
  const candidates = [
    process.env.DATABASE_URL?.replace(/^file:/, ""),
    path.resolve(process.cwd(), "prisma/portfolio.db"),
    path.resolve(process.cwd(), "../prisma/portfolio.db"),
    path.resolve(process.cwd(), "../../prisma/portfolio.db"),
    "/app/prisma/portfolio.db",
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return `file:${c.replace(/\\/g, "/")}`;
    }
  }

  return process.env.DATABASE_URL;
}

const dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
