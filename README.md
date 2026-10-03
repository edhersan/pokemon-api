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

No subas `.env` al repositorio: contiene credenciales sensibles.
