const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool = null;

function createPool() {
  if (pool) return pool;

  const sslCaPath = process.env.DB_SSL_CA;
  let sslConfig = {};

  if (sslCaPath && fs.existsSync(sslCaPath)) {
    sslConfig = {
      ca: fs.readFileSync(sslCaPath),
      rejectUnauthorized: true,
    };
    console.log('[DB] SSL CA cargado desde:', sslCaPath);
  } else if (sslCaPath) {
    console.warn('[DB] Archivo SSL CA no encontrado:', sslCaPath);
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: sslConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  pool.on('error', (err) => {
    console.error('[DB] Error en pool:', err);
  });

  console.log('[DB] Pool de conexiones creado');
  return pool;
}

async function testConnection() {
  const p = createPool();
  const conn = await p.getConnection();
  await conn.ping();
  conn.release();
  return true;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Pool cerrado');
  }
}

module.exports = {
  createPool,
  testConnection,
  closePool,
  getPool: () => createPool(),
};
