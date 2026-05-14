import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Cliente from './cliente.js'
import Categoria from './categoria.js'
import OrcamentoItem from './orcamento_item.js'

export default class Orcamento extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare clienteId: number

  @column()
  declare numero: number

  @column.dateTime()
  declare dataEmissao: DateTime

  @column()
  declare status: string

  @column()
  declare categoriaId: number | null

  // Campos do cliente (duplicados para compatibilidade)
  @column()
  declare clienteNome: string

  @column()
  declare clienteTelefone: string

  @column()
  declare clienteEmail: string | null

  @column()
  declare clienteEndereco: string | null

  @column()
  declare responsavelNome: string | null

  @column()
  declare responsavelTelefone: string | null

  @column()
  declare responsavelEmail: string | null

  @column.dateTime()
  declare validade: DateTime | null

  @column()
  declare subtotal: number

  @column()
  declare desconto: number

  @column()
  declare imposto: number

  @column()
  declare frete: number

  @column()
  declare totalGeral: number

  @column()
  declare observacoes: string | null

  @column()
  declare formaPagamentoTipo: string | null

  @column.dateTime()
  declare prazoEntrega: DateTime | null

  @column()
  declare formaPagamentoObservacoes: string | null

  @column.dateTime()
  declare dataPagamento: DateTime | null

  @column()
  declare numeroConta: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relações
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Cliente)
  declare cliente: BelongsTo<typeof Cliente>

  @belongsTo(() => Categoria)
  declare categoria: BelongsTo<typeof Categoria>

  @hasMany(() => OrcamentoItem)
  declare itens: HasMany<typeof OrcamentoItem>
}
