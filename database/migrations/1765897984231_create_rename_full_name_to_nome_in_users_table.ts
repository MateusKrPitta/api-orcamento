// database/migrations/xxxx_rename_full_name_to_nome_in_users.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Renomear full_name para nome
      table.renameColumn('full_name', 'nome')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Reverter: renomear nome para full_name
      table.renameColumn('nome', 'full_name')
    })
  }
}
