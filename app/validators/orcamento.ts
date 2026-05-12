import vine from '@vinejs/vine'

// Schema do orçamento - VERSÃO ATUALIZADA
const createOrcamentoSchema = vine.object({
  // ID do cliente (AGORA É OBRIGATÓRIO)
  cliente_id: vine.number(),

  // Status do orçamento
  status: vine
    .enum(['pendente_ligacao', 'cancelado', 'venda_concluida', 'em_andamento'])
    .optional(),

  // Outros campos
  categoria_id: vine.number().optional().nullable(),
  responsavel_nome: vine.string().trim().optional().nullable(),
  responsavel_telefone: vine.string().trim().optional().nullable(),
  responsavel_email: vine.string().email().trim().optional().nullable(),
  validade: vine.string().optional().nullable(),
  desconto: vine.number().optional().nullable(), // REMOVIDO .default(0)
  imposto: vine.number().optional().nullable(), // REMOVIDO .default(0)
  frete: vine.number().optional().nullable(), // REMOVIDO .default(0)
  observacoes: vine.string().trim().optional().nullable(),
  forma_pagamento_tipo: vine
    .enum(['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia'])
    .optional()
    .nullable(),
  prazo_entrega: vine.string().optional().nullable(),
  forma_pagamento_observacoes: vine.string().trim().optional().nullable(),

  // NOVA ESTRUTURA DE ITENS
  itens_principais: vine
    .array(
      vine.object({
        id: vine.number().optional(), // ID temporário
        produto_id: vine.number().optional().nullable(),
        produto_nome: vine.string().trim(),
        quantidade: vine.number().min(1),
        preco_unitario: vine.number().min(0),
        subtotal: vine.number().min(0),
        observacoes: vine.string().trim().optional().nullable(),
        subitens: vine
          .array(
            vine.object({
              produto_id: vine.number().optional().nullable(),
              produto_nome: vine.string().trim(),
              quantidade: vine.number().min(1),
              preco_unitario: vine.number().min(0),
              subtotal: vine.number().min(0),
              observacoes: vine.string().trim().optional().nullable(),
            })
          )
          .optional(),
      })
    )
    .optional(),

  itens_avulsos: vine
    .array(
      vine.object({
        produto_id: vine.number().optional().nullable(),
        produto_nome: vine.string().trim(),
        quantidade: vine.number().min(1),
        preco_unitario: vine.number().min(0),
        subtotal: vine.number().min(0),
        observacoes: vine.string().trim().optional().nullable(),
      })
    )
    .optional(),
})

export const createOrcamentoValidator = vine.compile(createOrcamentoSchema)

// Schema para atualização
const updateOrcamentoSchema = vine.object({
  cliente_id: vine.number().optional(),
  status: vine
    .enum(['pendente_ligacao', 'cancelado', 'venda_concluida', 'em_andamento'])
    .optional(),
  categoria_id: vine.number().optional().nullable(),
  responsavel_nome: vine.string().trim().optional().nullable(),
  responsavel_telefone: vine.string().trim().optional().nullable(),
  responsavel_email: vine.string().email().trim().optional().nullable(),
  validade: vine.string().optional().nullable(),
  desconto: vine.number().optional().nullable(),
  imposto: vine.number().optional().nullable(),
  frete: vine.number().optional().nullable(),
  observacoes: vine.string().trim().optional().nullable(),
  forma_pagamento_tipo: vine
    .enum(['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia'])
    .optional()
    .nullable(),
  prazo_entrega: vine.string().optional().nullable(),
  forma_pagamento_observacoes: vine.string().trim().optional().nullable(),

  // MESMA ESTRUTURA PARA UPDATE
  itens_principais: vine
    .array(
      vine.object({
        id: vine.number().optional(),
        produto_id: vine.number().optional().nullable(),
        produto_nome: vine.string().trim(),
        quantidade: vine.number().min(1),
        preco_unitario: vine.number().min(0),
        subtotal: vine.number().min(0),
        observacoes: vine.string().trim().optional().nullable(),
        subitens: vine
          .array(
            vine.object({
              produto_id: vine.number().optional().nullable(),
              produto_nome: vine.string().trim(),
              quantidade: vine.number().min(1),
              preco_unitario: vine.number().min(0),
              subtotal: vine.number().min(0),
              observacoes: vine.string().trim().optional().nullable(),
            })
          )
          .optional(),
      })
    )
    .optional(),

  itens_avulsos: vine
    .array(
      vine.object({
        produto_id: vine.number().optional().nullable(),
        produto_nome: vine.string().trim(),
        quantidade: vine.number().min(1),
        preco_unitario: vine.number().min(0),
        subtotal: vine.number().min(0),
        observacoes: vine.string().trim().optional().nullable(),
      })
    )
    .optional(),
})

export const updateOrcamentoValidator = vine.compile(updateOrcamentoSchema)
