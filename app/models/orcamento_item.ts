import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Orcamento from './orcamento.js'
import Produto from './produto.js'

export default class OrcamentoItem extends BaseModel {
  public static table = 'orcamento_itens'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare orcamentoId: number

  @column()
  declare produtoId: number | null

  @column()
  declare produtoNome: string | null

  @column()
  declare quantidade: number

  @column()
  declare precoUnitario: number

  @column()
  declare subtotal: number

  @column()
  declare observacoes: string | null

  // ⚠️⚠️⚠️ ATENÇÃO: PRECISA TER ESTES CAMPOS COM columnName! ⚠️⚠️⚠️
  @column({
    columnName: 'tipo_item',
    prepare: (value: string) => value,
    consume: (value: string) => value,
  })
  declare tipoItem: string | null

  @column({
    columnName: 'item_principal_id',
    prepare: (value: number) => value,
    consume: (value: number) => value,
  })
  declare itemPrincipalId: number | null

  @column({
    columnName: 'grupo_id',
    prepare: (value: string) => value,
    consume: (value: string) => value,
  })
  declare grupoId: string | null

  @column({
    columnName: 'ordem_exibicao',
    prepare: (value: number) => value,
    consume: (value: number) => value,
  })
  declare ordemExibicao: number

  @belongsTo(() => Orcamento)
  declare orcamento: BelongsTo<typeof Orcamento>

  @belongsTo(() => Produto)
  declare produto: BelongsTo<typeof Produto>

  @belongsTo(() => OrcamentoItem, {
    foreignKey: 'itemPrincipalId',
  })
  declare itemPrincipal: BelongsTo<typeof OrcamentoItem>

  @hasMany(() => OrcamentoItem, {
    foreignKey: 'itemPrincipalId',
  })
  declare subitens: HasMany<typeof OrcamentoItem>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
