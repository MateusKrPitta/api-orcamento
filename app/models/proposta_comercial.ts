import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Categoria from './categoria.js'
import Cliente from './cliente.js'
import User from './user.js'

export type PaginaProposta = {
  titulo: string
  conteudo: string // HTML
}

export default class PropostaComercial extends BaseModel {
  public static table = 'propostas_comerciais'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nome: string

  @column()
  declare statusProposta: 'pendente' | 'cancelado' | 'aprovado'

  @column()
  declare categoriaId: number | null

  @column()
  declare clienteId: number

  @column()
  declare userId: number

  // Páginas em JSON - CORREÇÃO AQUI
  // Remova o prepare e consume e deixe o AdonisJS lidar automaticamente
  @column({
    prepare: (value: PaginaProposta[] | null) => {
      console.log('PREPARE:', value) // Para debug
      return value ? JSON.stringify(value) : null
    },
    consume: (value: string | PaginaProposta[] | null) => {
      console.log('CONSUME:', value) // Para debug
      if (!value) return null
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
  })
  declare paginas: PaginaProposta[] | null

  @column()
  declare observacoes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relacionamentos
  @belongsTo(() => Categoria)
  declare categoria: BelongsTo<typeof Categoria>

  @belongsTo(() => Cliente)
  declare cliente: BelongsTo<typeof Cliente>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
