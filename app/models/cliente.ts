// app/models/cliente.ts
import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Orcamento from './orcamento.js'

export default class Cliente extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nome: string

  @column()
  declare telefone: string

  @column()
  declare email: string | null

  @column()
  declare endereco: string | null

  @column()
  declare observacoes: string | null

  @column()
  declare userId: number

  @hasMany(() => Orcamento)
  declare orcamentos: HasMany<typeof Orcamento>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
