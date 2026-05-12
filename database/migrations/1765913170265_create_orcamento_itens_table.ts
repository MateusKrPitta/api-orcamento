import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orcamento_itens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      // Relacionamento com orçamento
      table
        .integer('orcamento_id')
        .unsigned()
        .references('id')
        .inTable('orcamentos')
        .onDelete('CASCADE')
        .notNullable()

      // Relacionamento com produto
      table
        .integer('produto_id')
        .unsigned()
        .references('id')
        .inTable('produtos')
        .onDelete('SET NULL')

      // Se não houver produto cadastrado, pode inserir manualmente
      table.string('produto_nome', 255).nullable()

      // Dados do item
      table.decimal('quantidade', 10, 2).notNullable()
      table.decimal('preco_unitario', 12, 2).notNullable()
      table.decimal('subtotal', 12, 2).notNullable()

      // Observações do item
      table.text('observacoes').nullable()

      // Timestamps
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Índices
      table.index(['orcamento_id'])
      table.index(['produto_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
