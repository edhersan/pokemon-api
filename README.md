# Pokemon API

API sencilla construida con Node.js y Express, conectada a TiDB Cloud.

## Instalación

```bash
npm install
```

Copia `.env.example` como `.env` y completa `DB_PASSWORD` con tu contraseña real.

## Endpoint

`GET /` devuelve el estado de la API:

```json
{
  "success": true,
  "message": "API funcionando"
}
```

No subas `.env` al repositorio: contiene credenciales sensibles.
