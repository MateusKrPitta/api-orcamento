import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orcamentos'

  async up() {
    const hasDataPagamento = await this.schema.hasColumn(this.tableName, 'data_pagamento')
    const hasNumeroConta = await this.schema.hasColumn(this.tableName, 'numero_conta')

    this.schema.alterTable(this.tableName, (table) => {
      if (!hasDataPagamento) {
        table.timestamp('data_pagamento').nullable()
      }
      if (!hasNumeroConta) {
        table.string('numero_conta').nullable()
      }
    })
    
    this.schema.alterTable(this.tableName, (table) => {
      table.string('forma_pagamento_tipo').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('data_pagamento')
      table.dropColumn('numero_conta')
    })
  }
}
