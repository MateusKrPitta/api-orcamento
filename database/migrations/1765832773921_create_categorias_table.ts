// database/migrations/xxxx_create_categorias_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'categorias'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('nome', 255).notNullable()
      table.boolean('ativo').notNullable().defaultTo(true)
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Índices
      table.index(['user_id', 'nome'])
      table.index(['user_id', 'ativo'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
