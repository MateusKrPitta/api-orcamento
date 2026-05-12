import type { HttpContext } from '@adonisjs/core/http'
import Orcamento from '#models/orcamento'
import OrcamentoItem from '#models/orcamento_item'
import Cliente from '#models/cliente'
import { createOrcamentoValidator, updateOrcamentoValidator } from '#validators/orcamento'
import { DateTime } from 'luxon'


export default class OrcamentosController {
  /**
   * Listar orçamentos com filtros (resumido - Cliente, Valor Total, Status, Categoria)
   */
  async index({ auth, response, request }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()

      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const search = request.input('search', '')
      const status = request.input('status')
      const categoriaId = request.input('categoria_id')
      const clienteId = request.input('cliente_id')
      const dataInicio = request.input('data_inicio')
      const dataFim = request.input('data_fim')

      const query = Orcamento.query()
        .select([
          'orcamentos.id',
          'orcamentos.numero',
          'orcamentos.cliente_id',
          'orcamentos.total_geral',
          'orcamentos.status',
          'orcamentos.categoria_id',
          'orcamentos.data_emissao',
          'orcamentos.cliente_nome',
        ])
        .where('user_id', currentUser.id)

      if (search) {
        query.where((builder) => {
          builder
            .where('orcamentos.cliente_nome', 'ILIKE', `%${search}%`)
            .orWhere('orcamentos.cliente_telefone', 'ILIKE', `%${search}%`)
            .orWhere('orcamentos.cliente_email', 'ILIKE', `%${search}%`)
            .orWhere((subBuilder) => {
              subBuilder.whereExists((existsBuilder) => {
                existsBuilder
                  .from('clientes')
                  .whereColumn('clientes.id', 'orcamentos.cliente_id')
                  .andWhere((clienteBuilder) => {
                    clienteBuilder
                      .where('clientes.nome', 'ILIKE', `%${search}%`)
                      .orWhere('clientes.telefone', 'ILIKE', `%${search}%`)
                      .orWhere('clientes.email', 'ILIKE', `%${search}%`)
                  })
              })
            })
        })
      }

      if (status) {
        query.where('orcamentos.status', status)
      }

      if (categoriaId) {
        query.where('orcamentos.categoria_id', categoriaId)
      }

      if (clienteId) {
        query.where('orcamentos.cliente_id', clienteId)
      }

      if (dataInicio) {
        const dataInicioObj = DateTime.fromISO(dataInicio)
        if (dataInicioObj.isValid) {
          query.where('orcamentos.data_emissao', '>=', dataInicioObj.toSQL()!)
        }
      }

      if (dataFim) {
        const dataFimObj = DateTime.fromISO(dataFim)
        if (dataFimObj.isValid) {
          query.where('orcamentos.data_emissao', '<=', dataFimObj.toSQL()!)
        }
      }

      const orcamentos = await query
        .preload('categoria', (categoriaQuery) => {
          categoriaQuery.select(['id', 'nome'])
        })
        .preload('cliente', (clienteQuery) => {
          clienteQuery.select(['id', 'nome', 'telefone', 'email'])
        })
        .orderBy('data_emissao', 'desc')
        .paginate(page, limit)

      const orcamentosFormatados = orcamentos.all().map((orcamento) => ({
        id: orcamento.id,
        numero: orcamento.numero,
        cliente: {
          id: orcamento.cliente?.id,
          nome: orcamento.cliente?.nome || orcamento.clienteNome,
          telefone: orcamento.cliente?.telefone,
          email: orcamento.cliente?.email,
        },
        valor_total: orcamento.totalGeral,
        status: orcamento.status,
        data_emissao: orcamento.dataEmissao,
        categoria: orcamento.categoria?.nome || 'Sem categoria',
      }))

      return response.ok({
        success: true,
        message: 'Orçamentos listados com sucesso',
        data: orcamentosFormatados,
        meta: orcamentos.getMeta(),
      })
    } catch (error) {
      console.error('Erro ao listar orçamentos:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao listar orçamentos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Buscar orçamento COMPLETO por ID (todas as informações)
   */
  async show({ params, auth, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do orçamento inválido',
        })
      }

      const orcamento = await Orcamento.query()
        .where('id', id)
        .andWhere('user_id', currentUser.id)
        .preload('categoria')
        .preload('cliente')
        .preload('itens', (query) => {
          query.preload('produto')
        })
        .first()

      if (!orcamento) {
        return response.notFound({
          success: false,
          message: 'Orçamento não encontrado',
        })
      }

      return response.ok({
        success: true,
        message: 'Orçamento encontrado',
        data: this.formatOrcamentoCompleto(orcamento),
      })
    } catch (error) {
      console.error('Erro ao buscar orçamento:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao buscar orçamento',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Buscar orçamentos por cliente
   */
  async buscarPorCliente({ auth, response, request }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()

      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const clienteNome = request.input('cliente_nome', '')
      const numeroOrcamento = request.input('numero_orcamento', '')
      const clienteId = request.input('cliente_id')

      if (
        (!clienteNome || clienteNome.trim() === '') &&
        (!numeroOrcamento || numeroOrcamento.trim() === '') &&
        !clienteId
      ) {
        return response.badRequest({
          success: false,
          message: 'Nome do cliente, ID do cliente ou número do orçamento é obrigatório',
        })
      }

      const query = Orcamento.query()
        .select([
          'orcamentos.id',
          'orcamentos.numero',
          'orcamentos.cliente_id',
          'orcamentos.total_geral',
          'orcamentos.status',
          'orcamentos.categoria_id',
          'orcamentos.data_emissao',
          'orcamentos.cliente_nome',
          'orcamentos.cliente_telefone',
          'orcamentos.cliente_email',
        ])
        .where('user_id', currentUser.id)

      if (clienteId) {
        query.where('cliente_id', clienteId)
      } else if (
        clienteNome &&
        clienteNome.trim() !== '' &&
        numeroOrcamento &&
        numeroOrcamento.trim() !== ''
      ) {
        const numero = Number.parseInt(numeroOrcamento)
        if (!Number.isNaN(numero)) {
          query.where((builder) => {
            builder
              .where('orcamentos.cliente_nome', 'ILIKE', `%${clienteNome.trim()}%`)
              .andWhere('numero', numero)
          })
        } else {
          return response.badRequest({
            success: false,
            message: 'Número do orçamento deve ser um valor numérico',
          })
        }
      } else if (clienteNome && clienteNome.trim() !== '') {
        query.where('orcamentos.cliente_nome', 'ILIKE', `%${clienteNome.trim()}%`)
      } else if (numeroOrcamento && numeroOrcamento.trim() !== '') {
        const numero = Number.parseInt(numeroOrcamento)
        if (!Number.isNaN(numero)) {
          query.where('numero', numero)
        } else {
          return response.badRequest({
            success: false,
            message: 'Número do orçamento deve ser um valor numérico',
          })
        }
      }

      const orcamentos = await query
        .preload('categoria', (categoriaQuery) => {
          categoriaQuery.select(['id', 'nome'])
        })
        .preload('cliente', (clienteQuery) => {
          clienteQuery.select(['id', 'nome', 'telefone', 'email'])
        })
        .orderBy('data_emissao', 'desc')
        .paginate(page, limit)

      const orcamentosFormatados = orcamentos.all().map((orcamento) => ({
        id: orcamento.id,
        numero: orcamento.numero,
        cliente: {
          id: orcamento.cliente?.id,
          nome: orcamento.cliente?.nome || orcamento.clienteNome,
          telefone: orcamento.cliente?.telefone || orcamento.clienteTelefone,
          email: orcamento.cliente?.email || orcamento.clienteEmail,
        },
        valor_total: orcamento.totalGeral,
        status: orcamento.status,
        categoria: orcamento.categoria?.nome || 'Sem categoria',
        data_emissao: orcamento.dataEmissao,
      }))

      return response.ok({
        success: true,
        message: 'Orçamentos encontrados',
        data: orcamentosFormatados,
        meta: orcamentos.getMeta(),
      })
    } catch (error) {
      console.error('Erro ao buscar orçamentos por cliente:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao buscar orçamentos por cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Criar novo orçamento com a nova estrutura hierárquica
   */
  async store({ auth, request, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const payload = await request.validateUsing(createOrcamentoValidator)

      // Buscar cliente
      const cliente = await Cliente.query()
        .where('id', payload.cliente_id)
        .andWhere('user_id', currentUser.id)
        .first()

      if (!cliente) {
        return response.badRequest({
          success: false,
          message: 'Cliente não encontrado',
        })
      }

      // Gerar próximo número
      const ultimoOrcamento = await Orcamento.query()
        .where('user_id', currentUser.id)
        .orderBy('numero', 'desc')
        .first()

      const proximoNumero = ultimoOrcamento ? ultimoOrcamento.numero + 1 : 1

      // Calcular subtotal total
      let subtotalTotal = 0

      // LOG DO PAYLOAD RECEBIDO
      console.log('='.repeat(50))
      console.log('📦 PAYLOAD RECEBIDO:')
      console.log('='.repeat(50))
      console.log(JSON.stringify(payload, null, 2))

      // Calcular itens principais e seus subitens
      if (payload.itens_principais && payload.itens_principais.length > 0) {
        for (const principal of payload.itens_principais) {
          subtotalTotal += principal.subtotal
          if (principal.subitens && principal.subitens.length > 0) {
            for (const sub of principal.subitens) {
              subtotalTotal += sub.subtotal
            }
          }
        }
      }

      // Calcular itens avulsos
      if (payload.itens_avulsos && payload.itens_avulsos.length > 0) {
        for (const avulso of payload.itens_avulsos) {
          subtotalTotal += avulso.subtotal
        }
      }

      const desconto = payload.desconto ?? 0
      const imposto = payload.imposto ?? 0
      const frete = payload.frete ?? 0
      const totalGeral = subtotalTotal - desconto + imposto + frete

      // Criar orçamento
      const orcamento = await Orcamento.create({
        userId: currentUser.id,
        clienteId: cliente.id,
        numero: proximoNumero,
        dataEmissao: DateTime.now(),
        status: payload.status || 'pendente_ligacao',
        categoriaId: payload.categoria_id || null,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone,
        clienteEndereco: cliente.endereco,
        clienteEmail: cliente.email,
        responsavelNome: payload.responsavel_nome || null,
        responsavelTelefone: payload.responsavel_telefone || null,
        responsavelEmail: payload.responsavel_email || null,
        validade: payload.validade ? DateTime.fromISO(payload.validade) : null,
        subtotal: subtotalTotal,
        desconto,
        imposto,
        frete,
        totalGeral,
        observacoes: payload.observacoes || null,
        formaPagamentoTipo: payload.forma_pagamento_tipo || null,
        prazoEntrega: payload.prazo_entrega ? DateTime.fromISO(payload.prazo_entrega) : null,
        formaPagamentoObservacoes: payload.forma_pagamento_observacoes || null,
      })

      console.log('\n' + '='.repeat(50))
      console.log('💾 CRIANDO ITENS DO ORÇAMENTO:')
      console.log('='.repeat(50))

      // 1. CRIAR ITENS PRINCIPAIS PRIMEIRO
      if (payload.itens_principais && payload.itens_principais.length > 0) {
        console.log('\n📌 ITENS PRINCIPAIS:')

        for (let i = 0; i < payload.itens_principais.length; i++) {
          const principal = payload.itens_principais[i]

          console.log(`\n   Criando principal ${i + 1}: ${principal.produto_nome}`)

          const novoItemPrincipal = await OrcamentoItem.create({
            orcamentoId: orcamento.id,
            produtoId: principal.produto_id || null,
            produtoNome: principal.produto_nome,
            quantidade: principal.quantidade,
            precoUnitario: principal.preco_unitario,
            subtotal: principal.subtotal,
            observacoes: principal.observacoes || null,
            tipoItem: 'principal',
            ordemExibicao: i + 1,
          })

          console.log(`   ✅ Principal salvo com ID: ${novoItemPrincipal.id}`)

          // 2. CRIAR SUBITENS DESTE PRINCIPAL (se houver)
          if (principal.subitens && principal.subitens.length > 0) {
            console.log(`   📎 Subitens do principal ${principal.produto_nome}:`)

            for (let j = 0; j < principal.subitens.length; j++) {
              const sub = principal.subitens[j]

              const novoSubitem = await OrcamentoItem.create({
                orcamentoId: orcamento.id,
                produtoId: sub.produto_id || null,
                produtoNome: sub.produto_nome,
                quantidade: sub.quantidade,
                precoUnitario: sub.preco_unitario,
                subtotal: sub.subtotal,
                observacoes: sub.observacoes || null,
                tipoItem: 'subitem',
                itemPrincipalId: novoItemPrincipal.id, // Referência ao ID real do principal
                ordemExibicao: j + 1,
              })

              console.log(`     ✅ Subitem ${j + 1}: ${sub.produto_nome} (ID: ${novoSubitem.id})`)
            }
          }
        }
      }

      // 3. CRIAR ITENS AVULSOS
      if (payload.itens_avulsos && payload.itens_avulsos.length > 0) {
        console.log('\n📦 ITENS AVULSOS:')

        for (let i = 0; i < payload.itens_avulsos.length; i++) {
          const avulso = payload.itens_avulsos[i]

          console.log(`\n   Criando avulso ${i + 1}: ${avulso.produto_nome}`)

          const novoItem = await OrcamentoItem.create({
            orcamentoId: orcamento.id,
            produtoId: avulso.produto_id || null,
            produtoNome: avulso.produto_nome,
            quantidade: avulso.quantidade,
            precoUnitario: avulso.preco_unitario,
            subtotal: avulso.subtotal,
            observacoes: avulso.observacoes || null,
            tipoItem: 'avulso',
            ordemExibicao: i + 1,
          })

          console.log(`   ✅ Avulso salvo com ID: ${novoItem.id}`)
        }
      }

      console.log('\n' + '='.repeat(50))
      console.log('✅ ORÇAMENTO CRIADO COM SUCESSO!')
      console.log('='.repeat(50))

      // Carregar relações para retornar
      await orcamento.load('categoria')
      await orcamento.load('cliente')
      await orcamento.load('itens', (query) => {
        query.preload('produto')
      })

      return response.created({
        success: true,
        message: 'Orçamento criado com sucesso',
        data: this.formatOrcamentoCompleto(orcamento),
      })
    } catch (error) {
      console.error('Erro ao criar orçamento:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao criar orçamento',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Atualizar orçamento
   */
  /**
   * Atualizar orçamento
   */
  async update({ params, auth, request, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do orçamento inválido',
        })
      }

      const orcamento = await Orcamento.query()
        .where('id', id)
        .andWhere('user_id', currentUser.id)
        .preload('categoria')
        .preload('cliente')
        .preload('itens', (itensQuery) => {
          itensQuery.preload('produto')
        })
        .first()

      if (!orcamento) {
        return response.notFound({
          success: false,
          message: 'Orçamento não encontrado',
        })
      }

      const payload = await request.validateUsing(updateOrcamentoValidator)

      // Atualizar cliente se necessário
      if (payload.cliente_id && payload.cliente_id !== orcamento.clienteId) {
        const novoCliente = await Cliente.query()
          .where('id', payload.cliente_id)
          .andWhere('user_id', currentUser.id)
          .first()

        if (!novoCliente) {
          return response.badRequest({
            success: false,
            message: 'Novo cliente não encontrado',
          })
        }

        orcamento.clienteId = novoCliente.id
        orcamento.clienteNome = novoCliente.nome
        orcamento.clienteTelefone = novoCliente.telefone
        orcamento.clienteEndereco = novoCliente.endereco
        orcamento.clienteEmail = novoCliente.email
      }

      // Atualizar campos básicos
      if (payload.status) orcamento.status = payload.status
      if (payload.categoria_id !== undefined) orcamento.categoriaId = payload.categoria_id

      if (payload.responsavel_nome !== undefined)
        orcamento.responsavelNome = payload.responsavel_nome
      if (payload.responsavel_telefone !== undefined)
        orcamento.responsavelTelefone = payload.responsavel_telefone
      if (payload.responsavel_email !== undefined)
        orcamento.responsavelEmail = payload.responsavel_email

      if (payload.validade !== undefined) {
        if (payload.validade) {
          const validadeDate = DateTime.fromISO(payload.validade)
          if (validadeDate.isValid) {
            orcamento.validade = validadeDate
          }
        } else {
          orcamento.validade = null
        }
      }

      if (payload.observacoes !== undefined) orcamento.observacoes = payload.observacoes
      if (payload.forma_pagamento_tipo !== undefined)
        orcamento.formaPagamentoTipo = payload.forma_pagamento_tipo

      if (payload.prazo_entrega !== undefined) {
        if (payload.prazo_entrega) {
          const prazoEntregaDate = DateTime.fromISO(payload.prazo_entrega)
          if (prazoEntregaDate.isValid) {
            orcamento.prazoEntrega = prazoEntregaDate
          }
        } else {
          orcamento.prazoEntrega = null
        }
      }

      if (payload.forma_pagamento_observacoes !== undefined)
        orcamento.formaPagamentoObservacoes = payload.forma_pagamento_observacoes

      // DEPOIS (corrigido)
      if (payload.desconto !== undefined) {
        orcamento.desconto = payload.desconto ?? 0
      }
      if (payload.imposto !== undefined) {
        orcamento.imposto = payload.imposto ?? 0
      }
      if (payload.frete !== undefined) {
        orcamento.frete = payload.frete ?? 0
      }

      // ATUALIZAR ITENS se foram enviados
      let novoSubtotal = 0

      if (payload.itens_principais || payload.itens_avulsos) {
        console.log('='.repeat(50))
        console.log('📦 UPDATE - RECEBENDO NOVA ESTRUTURA DE ITENS:')
        console.log('='.repeat(50))

        // Calcular novo subtotal
        if (payload.itens_principais) {
          for (const principal of payload.itens_principais) {
            novoSubtotal += principal.subtotal
            if (principal.subitens) {
              for (const sub of principal.subitens) {
                novoSubtotal += sub.subtotal
              }
            }
          }
        }

        if (payload.itens_avulsos) {
          for (const avulso of payload.itens_avulsos) {
            novoSubtotal += avulso.subtotal
          }
        }

        orcamento.subtotal = novoSubtotal
        orcamento.totalGeral =
          novoSubtotal - orcamento.desconto + orcamento.imposto + orcamento.frete

        // Deletar itens antigos
        await OrcamentoItem.query().where('orcamento_id', orcamento.id).delete()

        // Criar itens principais e subitens
        if (payload.itens_principais && payload.itens_principais.length > 0) {
          console.log('\n📌 UPDATE - ITENS PRINCIPAIS:')

          for (let i = 0; i < payload.itens_principais.length; i++) {
            const principal = payload.itens_principais[i]

            console.log(`\n   Criando principal ${i + 1}: ${principal.produto_nome}`)

            const novoItemPrincipal = await OrcamentoItem.create({
              orcamentoId: orcamento.id,
              produtoId: principal.produto_id || null,
              produtoNome: principal.produto_nome,
              quantidade: principal.quantidade,
              precoUnitario: principal.preco_unitario,
              subtotal: principal.subtotal,
              observacoes: principal.observacoes || null,
              tipoItem: 'principal',
              ordemExibicao: i + 1,
            })

            console.log(`   ✅ Principal salvo com ID: ${novoItemPrincipal.id}`)

            // Criar subitens
            if (principal.subitens && principal.subitens.length > 0) {
              console.log(`   📎 Subitens do principal ${principal.produto_nome}:`)

              for (let j = 0; j < principal.subitens.length; j++) {
                const sub = principal.subitens[j]

                const novoSubitem = await OrcamentoItem.create({
                  orcamentoId: orcamento.id,
                  produtoId: sub.produto_id || null,
                  produtoNome: sub.produto_nome,
                  quantidade: sub.quantidade,
                  precoUnitario: sub.preco_unitario,
                  subtotal: sub.subtotal,
                  observacoes: sub.observacoes || null,
                  tipoItem: 'subitem',
                  itemPrincipalId: novoItemPrincipal.id,
                  ordemExibicao: j + 1,
                })

                console.log(`     ✅ Subitem ${j + 1}: ${sub.produto_nome} (ID: ${novoSubitem.id})`)
              }
            }
          }
        }

        // Criar itens avulsos
        if (payload.itens_avulsos && payload.itens_avulsos.length > 0) {
          console.log('\n📦 UPDATE - ITENS AVULSOS:')

          for (let i = 0; i < payload.itens_avulsos.length; i++) {
            const avulso = payload.itens_avulsos[i]

            console.log(`\n   Criando avulso ${i + 1}: ${avulso.produto_nome}`)

            const novoItem = await OrcamentoItem.create({
              orcamentoId: orcamento.id,
              produtoId: avulso.produto_id || null,
              produtoNome: avulso.produto_nome,
              quantidade: avulso.quantidade,
              precoUnitario: avulso.preco_unitario,
              subtotal: avulso.subtotal,
              observacoes: avulso.observacoes || null,
              tipoItem: 'avulso',
              ordemExibicao: i + 1,
            })

            console.log(`   ✅ Avulso salvo com ID: ${novoItem.id}`)
          }
        }
      } else {
        // Se não veio itens, recalcular total com valores atuais
        if (
          payload.desconto !== undefined ||
          payload.imposto !== undefined ||
          payload.frete !== undefined
        ) {
          orcamento.totalGeral =
            orcamento.subtotal - orcamento.desconto + orcamento.imposto + orcamento.frete
        }
      }

      await orcamento.save()

      // Carregar relações para retornar
      await orcamento.load('categoria')
      await orcamento.load('cliente')
      await orcamento.load('itens', (query) => {
        query.preload('produto')
      })

      return response.ok({
        success: true,
        message: 'Orçamento atualizado com sucesso',
        data: this.formatOrcamentoCompleto(orcamento),
      })
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao atualizar orçamento',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Excluir orçamento
   */
  async destroy({ params, auth, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do orçamento inválido',
        })
      }

      const orcamento = await Orcamento.query()
        .where('id', id)
        .andWhere('user_id', currentUser.id)
        .first()

      if (!orcamento) {
        return response.notFound({
          success: false,
          message: 'Orçamento não encontrado',
        })
      }

      await orcamento.delete()

      return response.ok({
        success: true,
        message: 'Orçamento excluído com sucesso',
      })
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao excluir orçamento',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Gerar próximo número de orçamento
   */
  async proximoNumero({ auth, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()

      const ultimoOrcamento = await Orcamento.query()
        .where('user_id', currentUser.id)
        .orderBy('numero', 'desc')
        .first()

      const proximoNumero = ultimoOrcamento ? ultimoOrcamento.numero + 1 : 1

      return response.ok({
        success: true,
        message: 'Próximo número gerado',
        data: {
          proximo_numero: proximoNumero,
        },
      })
    } catch (error) {
      console.error('Erro ao gerar próximo número:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao gerar próximo número',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Alterar status do orçamento
   */
  async alterarStatus({ params, auth, request, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do orçamento inválido',
        })
      }

      const { status } = request.only(['status'])

      if (
        !status ||
        !['pendente_ligacao', 'cancelado', 'venda_concluida', 'em_andamento'].includes(status)
      ) {
        return response.badRequest({
          success: false,
          message: 'Status inválido',
        })
      }

      const orcamento = await Orcamento.query()
        .where('id', id)
        .andWhere('user_id', currentUser.id)
        .first()

      if (!orcamento) {
        return response.notFound({
          success: false,
          message: 'Orçamento não encontrado',
        })
      }

      orcamento.status = status
      await orcamento.save()

      return response.ok({
        success: true,
        message: `Status do orçamento alterado para ${status}`,
        data: {
          id: orcamento.id,
          numero: orcamento.numero,
          status: orcamento.status,
        },
      })
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao alterar status do orçamento',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Estatísticas de orçamentos
   */
  async estatisticas({ auth, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()

      const resultados = await Orcamento.query()
        .where('user_id', currentUser.id)
        .select('status')
        .count('* as quantidade')
        .sum('total_geral as valor_total')
        .groupBy('status')

      const estatisticas = {
        total_ativos: 0,
        valor_total: 0,
        por_status: {
          pendente_ligacao: 0,
          em_andamento: 0,
          venda_concluida: 0,
          cancelado: 0,
        },
        total_geral: 0,
      }

      resultados.forEach((item: any) => {
        const status = item.status
        const quantidade = Number(item.$extras.quantidade)
        const valorStatus = Number(item.$extras.valor_total) || 0

        switch (status) {
          case 'pendente_ligacao':
            estatisticas.por_status.pendente_ligacao = quantidade
            estatisticas.total_ativos += quantidade
            estatisticas.valor_total += valorStatus
            break
          case 'em_andamento':
            estatisticas.por_status.em_andamento = quantidade
            estatisticas.total_ativos += quantidade
            estatisticas.valor_total += valorStatus
            break
          case 'venda_concluida':
            estatisticas.por_status.venda_concluida = quantidade
            estatisticas.total_ativos += quantidade
            estatisticas.valor_total += valorStatus
            break
          case 'cancelado':
            estatisticas.por_status.cancelado = quantidade
            break
        }

        estatisticas.total_geral += quantidade
      })

      return response.ok({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: estatisticas,
      })
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao obter estatísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Relatório completo de orçamentos com filtros e estatísticas
   */
  async relatorio({ auth, response, request }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()

      const page = request.input('page', 1)
      const limit = request.input('limit', 10)

      const search = request.input('search', '')
      const status = request.input('status')
      const categoriaId = request.input('categoria_id')
      const clienteId = request.input('cliente_id')
      const dataInicio = request.input('data_inicio')
      const dataFim = request.input('data_fim')
      const clienteNome = request.input('cliente_nome')
      const responsavelNome = request.input('responsavel_nome')

      const listagemQuery = Orcamento.query()
        .select([
          'id',
          'numero',
          'cliente_id',
          'cliente_nome',
          'responsavel_nome',
          'total_geral',
          'status',
          'categoria_id',
          'data_emissao',
        ])
        .where('user_id', currentUser.id)

      if (search) {
        listagemQuery.where((builder) => {
          builder
            .where('cliente_nome', 'ILIKE', `%${search}%`)
            .orWhere('cliente_telefone', 'ILIKE', `%${search}%`)
            .orWhere('cliente_email', 'ILIKE', `%${search}%`)
            .orWhere('responsavel_nome', 'ILIKE', `%${search}%`)
            .orWhere('responsavel_telefone', 'ILIKE', `%${search}%`)
            .orWhere('responsavel_email', 'ILIKE', `%${search}%`)
            .orWhereHas('cliente', (clienteQuery) => {
              clienteQuery
                .where('nome', 'ILIKE', `%${search}%`)
                .orWhere('telefone', 'ILIKE', `%${search}%`)
                .orWhere('email', 'ILIKE', `%${search}%`)
            })
        })
      }

      if (clienteId) {
        listagemQuery.where('cliente_id', clienteId)
      }

      if (clienteNome) {
        listagemQuery.where('cliente_nome', 'ILIKE', `%${clienteNome}%`)
      }

      if (responsavelNome) {
        listagemQuery.where('responsavel_nome', 'ILIKE', `%${responsavelNome}%`)
      }

      if (status) {
        listagemQuery.where('status', status)
      }

      if (categoriaId) {
        listagemQuery.where('categoria_id', categoriaId)
      }

      if (dataInicio) {
        const dataInicioObj = DateTime.fromISO(dataInicio)
        if (dataInicioObj.isValid) {
          listagemQuery.where('data_emissao', '>=', dataInicioObj.toSQL()!)
        }
      }

      if (dataFim) {
        const dataFimObj = DateTime.fromISO(dataFim)
        if (dataFimObj.isValid) {
          listagemQuery.where('data_emissao', '<=', dataFimObj.toSQL()!)
        }
      }

      const orcamentos = await listagemQuery
        .preload('categoria', (categoriaSubQuery) => {
          categoriaSubQuery.select(['id', 'nome'])
        })
        .preload('cliente', (clienteSubQuery) => {
          clienteSubQuery.select(['id', 'nome', 'telefone', 'email'])
        })
        .orderBy('data_emissao', 'desc')
        .paginate(page, limit)

      const estatisticasQuery = Orcamento.query().where('user_id', currentUser.id)

      if (search) {
        estatisticasQuery.where((builder) => {
          builder
            .where('cliente_nome', 'ILIKE', `%${search}%`)
            .orWhere('cliente_telefone', 'ILIKE', `%${search}%`)
            .orWhere('cliente_email', 'ILIKE', `%${search}%`)
            .orWhere('responsavel_nome', 'ILIKE', `%${search}%`)
            .orWhere('responsavel_telefone', 'ILIKE', `%${search}%`)
            .orWhere('responsavel_email', 'ILIKE', `%${search}%`)
            .orWhereHas('cliente', (clienteSubQuery) => {
              clienteSubQuery
                .where('nome', 'ILIKE', `%${search}%`)
                .orWhere('telefone', 'ILIKE', `%${search}%`)
                .orWhere('email', 'ILIKE', `%${search}%`)
            })
        })
      }

      if (clienteId) {
        estatisticasQuery.where('cliente_id', clienteId)
      }

      if (clienteNome) {
        estatisticasQuery.where('cliente_nome', 'ILIKE', `%${clienteNome}%`)
      }

      if (responsavelNome) {
        estatisticasQuery.where('responsavel_nome', 'ILIKE', `%${responsavelNome}%`)
      }

      if (status) {
        estatisticasQuery.where('status', status)
      }

      if (categoriaId) {
        estatisticasQuery.where('categoria_id', categoriaId)
      }

      if (dataInicio) {
        const dataInicioObj = DateTime.fromISO(dataInicio)
        if (dataInicioObj.isValid) {
          estatisticasQuery.where('data_emissao', '>=', dataInicioObj.toSQL()!)
        }
      }

      if (dataFim) {
        const dataFimObj = DateTime.fromISO(dataFim)
        if (dataFimObj.isValid) {
          estatisticasQuery.where('data_emissao', '<=', dataFimObj.toSQL()!)
        }
      }

      const resultadosEstatisticas = await estatisticasQuery
        .select('status')
        .count('* as quantidade')
        .sum('total_geral as valor_total')
        .groupBy('status')

      const estatisticas = {
        total_ativos: 0,
        valor_total: 0,
        por_status: {
          pendente_ligacao: 0,
          em_andamento: 0,
          venda_concluida: 0,
          cancelado: 0,
        },
        total_geral: 0,
      }

      resultadosEstatisticas.forEach((item: any) => {
        const itemStatus = item.status
        const quantidade = Number(item.$extras.quantidade)
        const valorStatus = Number(item.$extras.valor_total) || 0

        switch (itemStatus) {
          case 'pendente_ligacao':
            estatisticas.por_status.pendente_ligacao = quantidade
            estatisticas.total_ativos += quantidade
            estatisticas.valor_total += valorStatus
            break
          case 'em_andamento':
            estatisticas.por_status.em_andamento = quantidade
            estatisticas.total_ativos += quantidade
            estatisticas.valor_total += valorStatus
            break
          case 'venda_concluida':
            estatisticas.por_status.venda_concluida = quantidade
            estatisticas.total_ativos += quantidade
            estatisticas.valor_total += valorStatus
            break
          case 'cancelado':
            estatisticas.por_status.cancelado = quantidade
            break
        }

        estatisticas.total_geral += quantidade
      })

      const orcamentosFormatados = orcamentos.all().map((orcamento) => ({
        id: orcamento.id,
        numero: orcamento.numero,
        data_emissao: orcamento.dataEmissao,
        cliente: {
          id: orcamento.cliente?.id,
          nome: orcamento.cliente?.nome || orcamento.clienteNome,
          telefone: orcamento.cliente?.telefone,
          email: orcamento.cliente?.email,
        },
        responsavel: orcamento.responsavelNome,
        valor_total: orcamento.totalGeral,
        status: orcamento.status,
        categoria: orcamento.categoria?.nome || 'Sem categoria',
      }))

      return response.ok({
        success: true,
        message: 'Relatório gerado com sucesso',
        data: {
          orcamentos: orcamentosFormatados,
          meta: orcamentos.getMeta(),
          estatisticas: estatisticas,
          filtros_aplicados: {
            search,
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            responsavel_nome: responsavelNome,
            status,
            categoria_id: categoriaId,
            data_inicio: dataInicio,
            data_fim: dataFim,
          },
        },
      })
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao gerar relatório',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Método auxiliar para formatar orçamento COMPLETO
   */
  /**
   * Método auxiliar para formatar orçamento COMPLETO
   */
  /**
   * Método auxiliar para formatar orçamento COMPLETO
   */
  private formatOrcamentoCompleto(orcamento: Orcamento) {
    // Separar itens por tipo
    const itensPrincipais = orcamento.itens.filter((item) => item.tipoItem === 'principal')
    const itensAvulsos = orcamento.itens.filter((item) => item.tipoItem === 'avulso')

    // Formatar itens principais com seus subitens
    const itensPrincipaisFormatados = itensPrincipais.map((principal) => {
      const subitens = orcamento.itens
        .filter((item) => item.itemPrincipalId === principal.id)
        .map((sub) => ({
          id: sub.id,
          produto: sub.produto ? { id: sub.produto.id, nome: sub.produto.nome } : null,
          produto_nome: sub.produtoNome,
          quantidade: Number(sub.quantidade),
          preco_unitario: Number(sub.precoUnitario),
          subtotal: Number(sub.subtotal),
          observacoes: sub.observacoes,
          tipo_item: sub.tipoItem,
        }))

      return {
        id: principal.id,
        produto: principal.produto
          ? { id: principal.produto.id, nome: principal.produto.nome }
          : null,
        produto_nome: principal.produtoNome,
        quantidade: Number(principal.quantidade),
        preco_unitario: Number(principal.precoUnitario),
        subtotal: Number(principal.subtotal),
        observacoes: principal.observacoes,
        tipo_item: principal.tipoItem,
        subitens: subitens.length > 0 ? subitens : undefined,
      }
    })

    // Formatar itens avulsos
    const itensAvulsosFormatados = itensAvulsos.map((item) => ({
      id: item.id,
      produto: item.produto ? { id: item.produto.id, nome: item.produto.nome } : null,
      produto_nome: item.produtoNome,
      quantidade: Number(item.quantidade),
      preco_unitario: Number(item.precoUnitario),
      subtotal: Number(item.subtotal),
      observacoes: item.observacoes,
      tipo_item: item.tipoItem,
    }))

    return {
      id: orcamento.id,
      numero: orcamento.numero,
      data_emissao: orcamento.dataEmissao,
      validade: orcamento.validade,
      status: orcamento.status,
      categoria: orcamento.categoria
        ? {
            id: orcamento.categoria.id,
            nome: orcamento.categoria.nome,
          }
        : null,
      cliente: orcamento.cliente
        ? {
            id: orcamento.cliente.id,
            nome: orcamento.cliente.nome,
            telefone: orcamento.cliente.telefone,
            endereco: orcamento.cliente.endereco,
            email: orcamento.cliente.email,
            observacoes: orcamento.cliente.observacoes,
          }
        : {
            nome: orcamento.clienteNome,
            telefone: orcamento.clienteTelefone,
            endereco: orcamento.clienteEndereco,
            email: orcamento.clienteEmail,
          },
      responsavel: orcamento.responsavelNome
        ? {
            nome: orcamento.responsavelNome,
            telefone: orcamento.responsavelTelefone,
            email: orcamento.responsavelEmail,
          }
        : null,
      itens_principais: itensPrincipaisFormatados,
      itens_avulsos: itensAvulsosFormatados,
      totais: {
        subtotal: Number(orcamento.subtotal),
        desconto: Number(orcamento.desconto),
        imposto: Number(orcamento.imposto),
        frete: Number(orcamento.frete),
        total_geral: Number(orcamento.totalGeral),
      },
      observacoes: orcamento.observacoes,
      forma_pagamento: orcamento.formaPagamentoTipo
        ? {
            tipo: orcamento.formaPagamentoTipo,
            prazo_entrega: orcamento.prazoEntrega,
            observacoes: orcamento.formaPagamentoObservacoes,
          }
        : null,
      created_at: orcamento.createdAt,
      updated_at: orcamento.updatedAt,
    }
  }
}
