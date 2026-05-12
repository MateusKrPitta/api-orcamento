import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orcamentos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      // Número sequencial (único por usuário)
      table.integer('numero').notNullable()

      // Data de emissão (data atual quando criado)
      table.timestamp('data_emissao').notNullable().defaultTo(this.now())

      // Validade (opcional)
      table.timestamp('validade').nullable()

      // Status
      table
        .enum('status', ['pendente_ligacao', 'cancelado', 'venda_concluida', 'em_andamento'])
        .notNullable()
        .defaultTo('pendente_ligacao')

      // Categoria
      table
        .integer('categoria_id')
        .unsigned()
        .references('id')
        .inTable('categorias')
        .onDelete('SET NULL')

      // Dados do cliente
      table.string('cliente_nome', 255).notNullable()
      table.string('cliente_telefone', 20).notNullable()
      table.string('cliente_endereco', 500).nullable()
      table.string('cliente_email', 255).nullable()

      // Dados do responsável (opcional)
      table.string('responsavel_nome', 255).nullable()
      table.string('responsavel_telefone', 20).nullable()
      table.string('responsavel_email', 255).nullable()

      // Totais
      table.decimal('subtotal', 12, 2).notNullable().defaultTo(0)
      table.decimal('desconto', 12, 2).notNullable().defaultTo(0)
      table.decimal('imposto', 12, 2).notNullable().defaultTo(0)
      table.decimal('frete', 12, 2).notNullable().defaultTo(0)
      table.decimal('total_geral', 12, 2).notNullable().defaultTo(0)

      // Observações
      table.text('observacoes').nullable()

      // Forma de pagamento
      table
        .enum('forma_pagamento_tipo', [
          'dinheiro',
          'cartao_credito',
          'cartao_debito',
          'pix',
          'transferencia',
        ])
        .nullable()

      table.timestamp('prazo_entrega').nullable()
      table.text('forma_pagamento_observacoes').nullable()

      // Relacionamentos
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .notNullable()

      // Timestamps
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Índices
      table.index(['user_id', 'numero'])
      table.index(['user_id', 'status'])
      table.index(['user_id', 'data_emissao'])
      table.index(['cliente_nome'])
      table.index(['cliente_telefone'])
      table.unique(['user_id', 'numero']) // Número único por usuário
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
