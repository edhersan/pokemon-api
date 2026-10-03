require("dotenv").config();

const express = require("express");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const swaggerDefinition = require("../lib/swagger");
const { createPool, testConnection, getPool } = require("../lib/db");

const app = express();

// Swagger spec
const swaggerSpec = swaggerJsdoc(swaggerDefinition);

// Custom HTML template for Swagger UI using CDN
const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pokédex API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" >
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.9.0/favicon-32x32.png" sizes="32x32" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.9.0/favicon-16x16.png" sizes="16x16" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
    .swagger-ui .topbar { display: none }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true
      });
      window.ui = ui;
    };
  </script>
</body>
</html>
`;

// Swagger UI en /docs - usando HTML personalizado con CDN
app.get("/docs", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(swaggerHtml);
});

// Spec JSON en /docs.json
app.get("/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use(cors());
app.use(express.json());

// ============================================
// MIDDLEWARE DE LOGGING
// ============================================
app.use((req, res, next) => {
  const start = Date.now();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${ip} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// ============================================
// HELPER: Validar ID de Pokémon
// ============================================
function validatePokemonId(idParam) {
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) {
    return { valid: false, id: null };
  }
  return { valid: true, id };
}

// ============================================
// ENDPOINT: Raíz - Info de la API
// ============================================
/**
 * @swagger
 * /:
 *   get:
 *     summary: Información general de la API
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Información de la API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: Pokédex API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 docs:
 *                   type: string
 *                   example: /docs
 */
app.get("/", (req, res) => {
  res.json({
    name: "Pokédex API",
    version: "1.0.0",
    docs: "/docs"
  });
});

// ============================================
// ENDPOINT: Health Check
// ============================================
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar salud de la API y base de datos
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: API y base de datos funcionando
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Base de datos desconectada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get("/health", async (req, res) => {
  try {
    await testConnection();
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (err) {
    console.error("[HEALTH] Error:", err);
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: err.message,
    });
  }
});

// ============================================
// ENDPOINT: Datos del Pokémon
// ============================================
/**
 * @swagger
 * /pokemon/{id}:
 *   get:
 *     summary: Obtener datos básicos de un Pokémon
 *     tags: [Pokémon]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del Pokémon (número de Pokédex)
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 25
 *     responses:
 *       200:
 *         description: Datos del Pokémon
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pokemon'
 *       400:
 *         $ref: '#/components/responses/InvalidId'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
app.get("/pokemon/:id", async (req, res) => {
  const { valid, id } = validatePokemonId(req.params.id);
  if (!valid) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, name, height_m, weight_kg, species_url 
       FROM pokemon 
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("[POKEMON] Error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ============================================
// ENDPOINT: Sprites del Pokémon
// ============================================
/**
 * @swagger
 * /pokemon/{id}/sprites:
 *   get:
 *     summary: Obtener sprites/imágenes de un Pokémon
 *     tags: [Pokémon]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del Pokémon (número de Pokédex)
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 25
 *     responses:
 *       200:
 *         description: URLs de sprites del Pokémon
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sprites'
 *       400:
 *         $ref: '#/components/responses/InvalidId'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
app.get("/pokemon/:id/sprites", async (req, res) => {
  const { valid, id } = validatePokemonId(req.params.id);
  if (!valid) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT pokemon_id, front_default, front_shiny, back_default, 
              official_artwork_front, dream_world_front
       FROM pokemon_sprites 
       WHERE pokemon_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("[SPRITES] Error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ============================================
// ENDPOINT: Movimientos del Pokémon
// ============================================
/**
 * @swagger
 * /pokemon/{id}/moves:
 *   get:
 *     summary: Obtener lista de movimientos de un Pokémon
 *     tags: [Pokémon]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del Pokémon (número de Pokédex)
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 25
 *     responses:
 *       200:
 *         description: Lista de movimientos del Pokémon
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MovesResponse'
 *       400:
 *         $ref: '#/components/responses/InvalidId'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
app.get("/pokemon/:id/moves", async (req, res) => {
  const { valid, id } = validatePokemonId(req.params.id);
  if (!valid) {
    return res.status(400).json({ error: "invalid_id" });
  }

  try {
    const pool = getPool();
    
    // Primero verificar que el Pokémon existe
    const [pokemonRows] = await pool.execute(
      `SELECT id FROM pokemon WHERE id = ?`,
      [id]
    );
    
    if (pokemonRows.length === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    // Obtener movimientos
    const [moveRows] = await pool.execute(
      `SELECT m.name 
       FROM moves m
       JOIN pokemon_moves pm ON m.id = pm.move_id
       WHERE pm.pokemon_id = ?
       ORDER BY m.name`,
      [id]
    );

    const moves = moveRows.map(row => row.name);

    res.json({
      pokemon_id: id,
      moves,
    });
  } catch (err) {
    console.error("[MOVES] Error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ============================================
// ERROR HANDLER GLOBAL
// ============================================
app.use((err, req, res, next) => {
  console.error("[GLOBAL ERROR]", err);
  res.status(500).json({ error: "internal_error" });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({ error: "not_found" });
});

module.exports = app;
