import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: env.get('DATABASE_URL')
        ? {
            connectionString: env.get('DATABASE_URL'),
            ssl: env.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
          }
        : {
            host: env.get('PGHOST') || env.get('DB_HOST'),
            port: Number(env.get('PGPORT') || env.get('DB_PORT')),
            user: env.get('PGUSER') || env.get('DB_USER'),
            password: env.get('PGPASSWORD') || env.get('DB_PASSWORD'),
            database: env.get('PGDATABASE') || env.get('DB_DATABASE'),
            ssl: env.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
          },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig