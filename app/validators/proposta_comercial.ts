import vine from '@vinejs/vine'

// Validator para criar proposta
export const criarPropostaComercialValidator = vine.compile(
  vine.object({
    nome: vine.string().trim().minLength(3).maxLength(255),
    statusProposta: vine.enum(['pendente', 'cancelado', 'aprovado']).optional(),
    categoriaId: vine.number().positive().nullable().optional(),
    clienteId: vine.number().positive(),

    paginas: vine
      .array(
        vine.object({
          titulo: vine.string().trim().minLength(1).maxLength(255),
          conteudo: vine.string().trim().minLength(1),
        })
      )
      .optional(),

    observacoes: vine.string().trim().optional(),
  })
)

// Validator para atualizar proposta
export const atualizarPropostaComercialValidator = vine.compile(
  vine.object({
    nome: vine.string().trim().minLength(3).maxLength(255).optional(),
    statusProposta: vine.enum(['pendente', 'cancelado', 'aprovado']).optional(),
    categoriaId: vine.number().positive().nullable().optional(),
    clienteId: vine.number().positive().optional(),

    paginas: vine
      .array(
        vine.object({
          titulo: vine.string().trim().minLength(1).maxLength(255),
          conteudo: vine.string().trim().minLength(1),
        })
      )
      .optional(),

    observacoes: vine.string().trim().optional(),
  })
)
