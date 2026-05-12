// database/migrations/XXXX_add_hierarchy_to_orcamento_itens.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orcamento_itens'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Adicionar coluna para tipo do item
      table.string('tipo_item', 20).nullable().defaultTo('avulso')

      // Adicionar coluna para referenciar o item principal
      table
        .integer('item_principal_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable(this.tableName)
        .onDelete('CASCADE')

      // Adicionar coluna para ordem de exibição
      table.integer('ordem_exibicao').nullable().defaultTo(0)

      // Adicionar coluna para grupo
      table.string('grupo_id', 50).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('tipo_item')
      table.dropColumn('item_principal_id')
      table.dropColumn('ordem_exibicao')
      table.dropColumn('grupo_id')
    })
  }
}
