module.exports = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pokédex API',
      version: '1.0.0',
      description: 'API para consultar datos de Pokémon (info, sprites, movimientos)',
      contact: {
        name: 'Pokédex API'
      }
    },
    servers: [
      {
        url: 'https://pokemon-api-sigma-jet.vercel.app',
        description: 'Servidor de producción (Vercel)'
      },
      {
        url: 'http://localhost:3000',
        description: 'Servidor local'
      }
    ],
    components: {
      schemas: {
        PokemonStats: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int32',
              example: 25
            },
            name: {
              type: 'string',
              example: 'pikachu'
            },
            height_m: {
              type: 'string',
              format: 'decimal',
              example: '0.40'
            },
            weight_kg: {
              type: 'string',
              format: 'decimal',
              example: '6.00'
            },
            species_url: {
              type: 'string',
              format: 'uri',
              example: 'https://pokeapi.co/api/v2/pokemon-species/25/'
            }
          }
        },
        PokemonFull: {
          type: 'object',
          description: 'Información completa del Pokémon (plano: stats + sprites + moves)',
          properties: {
            id: {
              type: 'integer',
              format: 'int32',
              example: 25
            },
            name: {
              type: 'string',
              example: 'pikachu'
            },
            height_m: {
              type: 'string',
              format: 'decimal',
              example: '0.40'
            },
            weight_kg: {
              type: 'string',
              format: 'decimal',
              example: '6.00'
            },
            species_url: {
              type: 'string',
              format: 'uri',
              example: 'https://pokeapi.co/api/v2/pokemon-species/25/'
            },
            front_default: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
            },
            front_shiny: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/25.png'
            },
            back_default: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png'
            },
            official_artwork_front: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png'
            },
            dream_world_front: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/25.svg'
            },
            moves: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['swift', 'thunder-shock', 'thunderbolt']
            }
          }
        },
        Sprites: {
          type: 'object',
          properties: {
            pokemon_id: {
              type: 'integer',
              format: 'int32',
              example: 25
            },
            front_default: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
            },
            front_shiny: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/25.png'
            },
            back_default: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png'
            },
            official_artwork_front: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png'
            },
            dream_world_front: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/25.svg'
            }
          }
        },
        MovesResponse: {
          type: 'object',
          properties: {
            pokemon_id: {
              type: 'integer',
              format: 'int32',
              example: 25
            },
            moves: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['swift', 'thunder-shock', 'thunderbolt']
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'error'],
              example: 'ok'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2026-10-02T23:51:00.858Z'
            },
            database: {
              type: 'string',
              enum: ['connected', 'disconnected'],
              example: 'connected'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'not_found'
            }
          }
        }
      },
      responses: {
        NotFound: {
          description: 'Pokémon no encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: { error: 'not_found' }
            }
          }
        },
        InvalidId: {
          description: 'Identificador inválido (debe ser ID numérico o nombre válido)',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: { error: 'invalid_id' }
            }
          }
        },
        InternalError: {
          description: 'Error interno del servidor',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: { error: 'internal_error' }
            }
          }
        }
      },
      parameters: {
        PokemonIdentifier: {
          name: 'identifier',
          in: 'path',
          required: true,
          description: 'ID (número) o nombre del Pokémon (ej: 25 o pikachu). Case-insensitive para nombres.',
          schema: {
            type: 'string',
            pattern: '^(\\d+|[a-zA-Z0-9\\-]+)$'
          },
          examples: {
            byId: {
              summary: 'Por ID',
              value: '25'
            },
            byName: {
              summary: 'Por nombre',
              value: 'pikachu'
            },
            byNameHyphen: {
              summary: 'Nombre con guión',
              value: 'mr-mime'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Pokémon',
        description: 'Endpoints para consultar información de Pokémon'
      },
      {
        name: 'Sistema',
        description: 'Endpoints de sistema y salud'
      }
    ]
  },
  apis: ['./api/index.js']
};
