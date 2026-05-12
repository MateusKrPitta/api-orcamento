import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orcamentos'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('cliente_id')
        .unsigned()
        .references('id')
        .inTable('clientes')
        .onDelete('SET NULL')
        .nullable()
        .after('categoria_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('cliente_id')
    })
  }
}
