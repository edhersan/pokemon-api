require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createPool, testConnection, getPool } = require("../lib/db");

const app = express();

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
// ENDPOINT: Health Check
// ============================================
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
