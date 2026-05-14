import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orcamentos'

  async up() {
    // Drop the enum check constraint that is blocking new values
    // Even after altering the column to string, PostgreSQL might keep the check constraint.
    await this.db.rawQuery(`ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS orcamentos_forma_pagamento_tipo_check`)
  }

  async down() {
    // No easy way to restore the exact same constraint without knowing the original values,
    // but typically we don't want it back if we are moving to string.
  }
}
