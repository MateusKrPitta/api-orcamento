// database/migrations/xxxx_add_ativo_to_produtos.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'produtos'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('ativo').notNullable().defaultTo(true).after('nome')
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ativo')
    })
  }
}
