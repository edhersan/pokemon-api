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
// HELPER: Resolver identificador (ID o nombre) a Pokémon
// ============================================
async function resolvePokemonIdentifier(identifier) {
  const pool = getPool();
  const cleanIdentifier = identifier.trim();
  const isNumeric = /^\d+$/.test(cleanIdentifier);
  
  let query, params;
  if (isNumeric) {
    query = `SELECT id, name FROM pokemon WHERE id = ?`;
    params = [parseInt(cleanIdentifier, 10)];
  } else {
    const normalizedName = cleanIdentifier.toLowerCase().replace(/\s+/g, '-');
    query = `SELECT id, name FROM pokemon WHERE LOWER(name) = ?`;
    params = [normalizedName];
  }
  
  const [rows] = await pool.execute(query, params);
  return rows[0] || null;
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
// ENDPOINT: Datos completos del Pokémon (plano: info + sprites + moves)
// ============================================
/**
 * @swagger
 * /pokemon/{identifier}:
 *   get:
 *     summary: Obtener toda la información de un Pokémon (datos básicos, sprites y movimientos)
 *     tags: [Pokémon]
 *     parameters:
 *       - $ref: '#/components/parameters/PokemonIdentifier'
 *     responses:
 *       200:
 *         description: Información completa del Pokémon
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PokemonFull'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
app.get("/pokemon/:identifier", async (req, res) => {
  try {
    const pokemon = await resolvePokemonIdentifier(req.params.identifier);
    if (!pokemon) {
      return res.status(404).json({ error: "not_found" });
    }

    const pool = getPool();
    const id = pokemon.id;

    // 3 queries paralelas
    const [pokemonResult, spritesResult, movesResult] = await Promise.all([
      pool.execute(
        `SELECT id, name, height_m, weight_kg, species_url 
         FROM pokemon WHERE id = ?`,
        [id]
      ),
      pool.execute(
        `SELECT front_default, front_shiny, back_default, 
                official_artwork_front, dream_world_front
         FROM pokemon_sprites WHERE pokemon_id = ?`,
        [id]
      ),
      pool.execute(
        `SELECT m.name 
         FROM moves m
         JOIN pokemon_moves pm ON m.id = pm.move_id
         WHERE pm.pokemon_id = ?
         ORDER BY m.name`,
        [id]
      )
    ]);

    const p = pokemonResult[0][0];
    const s = spritesResult[0][0] || {};
    const moves = movesResult[0].map(row => row.name);

    // Response plano combinado
    res.json({
      id: p.id,
      name: p.name,
      height_m: p.height_m,
      weight_kg: p.weight_kg,
      species_url: p.species_url,
      front_default: s.front_default,
      front_shiny: s.front_shiny,
      back_default: s.back_default,
      official_artwork_front: s.official_artwork_front,
      dream_world_front: s.dream_world_front,
      moves
    });
  } catch (err) {
    console.error("[POKEMON FULL] Error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ============================================
// ENDPOINT: Stats del Pokémon (solo datos básicos)
// ============================================
/**
 * @swagger
 * /pokemon/{identifier}/stats:
 *   get:
 *     summary: Obtener solo los datos básicos (stats) de un Pokémon
 *     tags: [Pokémon]
 *     parameters:
 *       - $ref: '#/components/parameters/PokemonIdentifier'
 *     responses:
 *       200:
 *         description: Datos básicos del Pokémon
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PokemonStats'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
app.get("/pokemon/:identifier/stats", async (req, res) => {
  try {
    const pokemon = await resolvePokemonIdentifier(req.params.identifier);
    if (!pokemon) {
      return res.status(404).json({ error: "not_found" });
    }

    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, name, height_m, weight_kg, species_url 
       FROM pokemon WHERE id = ?`,
      [pokemon.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("[POKEMON STATS] Error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ============================================
// ENDPOINT: Sprites del Pokémon
// ============================================
/**
 * @swagger
 * /pokemon/{identifier}/sprites:
 *   get:
 *     summary: Obtener sprites/imágenes de un Pokémon
 *     tags: [Pokémon]
 *     parameters:
 *       - $ref: '#/components/parameters/PokemonIdentifier'
 *     responses:
 *       200:
 *         description: URLs de sprites del Pokémon
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sprites'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
app.get("/pokemon/:identifier/sprites", async (req, res) => {
  try {
    const pokemon = await resolvePokemonIdentifier(req.params.identifier);
    if (!pokemon) {
      return res.status(404).json({ error: "not_found" });
    }

    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT pokemon_id, front_default, front_shiny, back_default, 
              official_artwork_front, dream_world_front
       FROM pokemon_sprites 
       WHERE pokemon_id = ?`,
      [pokemon.id]
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
 * /pokemon/{identifier}/moves:
 *   get:
 *     summary: Obtener lista de movimientos de un Pokémon
 *     tags: [Pokémon]
 *     parameters:
 *       - $ref: '#/components/parameters/PokemonIdentifier'
 *     responses:
 *       200:
 *         description: Lista de movimientos del Pokémon
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MovesResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
app.get("/pokemon/:identifier/moves", async (req, res) => {
  try {
    const pokemon = await resolvePokemonIdentifier(req.params.identifier);
    if (!pokemon) {
      return res.status(404).json({ error: "not_found" });
    }

    const pool = getPool();
    const [moveRows] = await pool.execute(
      `SELECT m.name 
       FROM moves m
       JOIN pokemon_moves pm ON m.id = pm.move_id
       WHERE pm.pokemon_id = ?
       ORDER BY m.name`,
      [pokemon.id]
    );

    const moves = moveRows.map(row => row.name);

    res.json({
      pokemon_id: pokemon.id,
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
