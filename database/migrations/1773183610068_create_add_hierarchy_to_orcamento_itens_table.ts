// database/migrations/XXXX_add_hierarchy_to_orcamento_itens.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orcamento_itens'

  async up() {
    const hasTipoItem = await this.schema.hasColumn(this.tableName, 'tipo_item')
    const hasItemPrincipalId = await this.schema.hasColumn(this.tableName, 'item_principal_id')
    const hasOrdemExibicao = await this.schema.hasColumn(this.tableName, 'ordem_exibicao')
    const hasGrupoId = await this.schema.hasColumn(this.tableName, 'grupo_id')

    this.schema.alterTable(this.tableName, (table) => {
      if (!hasTipoItem) {
        table.string('tipo_item', 20).nullable().defaultTo('avulso')
      }

      if (!hasItemPrincipalId) {
        table
          .integer('item_principal_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable(this.tableName)
          .onDelete('CASCADE')
      }

      if (!hasOrdemExibicao) {
        table.integer('ordem_exibicao').nullable().defaultTo(0)
      }

      if (!hasGrupoId) {
        table.string('grupo_id', 50).nullable()
      }
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
