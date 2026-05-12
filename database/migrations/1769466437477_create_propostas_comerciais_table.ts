import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'propostas_comerciais'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('nome', 255).notNullable()

      // Status da proposta
      table
        .enum('status_proposta', ['pendente', 'cancelado', 'aprovado'])
        .notNullable()
        .defaultTo('pendente')

      // Relacionamentos
      table
        .integer('categoria_id')
        .unsigned()
        .references('id')
        .inTable('categorias')
        .onDelete('SET NULL')

      table
        .integer('cliente_id')
        .unsigned()
        .references('id')
        .inTable('clientes')
        .onDelete('CASCADE')
        .notNullable()

      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .notNullable()

      // PÁGINAS EM JSON
      table.json('paginas').nullable()

      // Apenas observações, sem data_validade
      table.text('observacoes').nullable()

      // Datas
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Índices
      table.index(['user_id', 'status_proposta'])
      table.index(['cliente_id', 'status_proposta'])
      table.index(['categoria_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
