# Pokemon API

API sencilla construida con Node.js y Express, conectada a TiDB Cloud.

## Instalación

```bash
npm install
```

Copia `.env.example` como `.env` y completa `DB_PASSWORD` con tu contraseña real.

## Endpoints

`GET /` devuelve el estado de la API:

```json
{
  "success": true,
  "message": "API funcionando"
}
```

`GET /pokemon` devuelve una lista de Pokémon con solamente su ID y nombre:

```json
[
  {
    "id": 1,
    "name": "bulbasaur"
  },
  {
    "id": 25,
    "name": "pikachu"
  }
]
```

`POST /pokemon` agrega un Pokémon. El nombre es obligatorio; los demás campos son opcionales:

```json
{
  "name": "pikachu",
  "height_m": 0.4,
  "weight_kg": 6,
  "species_url": "https://pokeapi.co/api/v2/pokemon-species/25/"
}
```

`DELETE /pokemon/:name` elimina un Pokémon por nombre, sin distinguir mayúsculas/minúsculas:

```bash
curl -X DELETE https://pokemon-api-sigma-jet.vercel.app/pokemon/pikachu
```

No subas `.env` al repositorio: contiene credenciales sensibles.
