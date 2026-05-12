import type { HttpContext } from '@adonisjs/core/http'
import PropostaComercial from '#models/proposta_comercial'
import Cliente from '#models/cliente'
import Categoria from '#models/categoria'
import {
  criarPropostaComercialValidator,
  atualizarPropostaComercialValidator,
} from '#validators/proposta_comercial'
import { DateTime } from 'luxon'

export default class PropostasComerciaisController {
  /**
   * Listar todas as propostas comerciais do usuário
   */
  async index({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const status = request.input('status')
      const clienteId = request.input('cliente_id')
      const categoriaId = request.input('categoria_id')
      const userId = request.input('user_id') // Responsável = usuário que criou
      const dataInicio = request.input('data_inicio')
      const dataFim = request.input('data_fim')

      // Cria a query sem preload inicial
      const propostaQuery = PropostaComercial.query()
        .where('user_id', user.id)
        .select(
          'id',
          'nome',
          'status_proposta',
          'created_at',
          'categoria_id',
          'cliente_id',
          'user_id'
        )
        .orderBy('created_at', 'desc')

      // Filtros básicos
      if (status) {
        propostaQuery.where('status_proposta', status)
      }

      if (clienteId) {
        propostaQuery.where('cliente_id', clienteId)
      }

      if (categoriaId) {
        propostaQuery.where('categoria_id', categoriaId)
      }

      // Filtro por usuário responsável (usuário que criou)
      if (userId) {
        propostaQuery.where('user_id', userId)
      }

      // Filtro por período de data
      if (dataInicio) {
        const dataInicioObj = DateTime.fromISO(dataInicio).startOf('day')
        if (dataInicioObj.isValid) {
          propostaQuery.where('created_at', '>=', dataInicioObj.toISO())
        }
      }

      if (dataFim) {
        const dataFimObj = DateTime.fromISO(dataFim).endOf('day')
        if (dataFimObj.isValid) {
          propostaQuery.where('created_at', '<=', dataFimObj.toISO())
        }
      }

      // Busca por nome
      const search = request.input('search')
      if (search) {
        propostaQuery.where('nome', 'ilike', `%${search}%`)
      }

      // Executa a paginação primeiro
      const propostasPaginated = await propostaQuery.paginate(page, limit)
      const propostas = propostasPaginated.all()

      // Carrega relacionamentos manualmente para cada proposta
      for (const proposta of propostas) {
        // Sempre carrega cliente (não pode ser null)
        await proposta.load('cliente', (query) => {
          query.select('id', 'nome', 'telefone', 'email')
        })

        // Carrega categoria apenas se existir categoriaId
        if (proposta.categoriaId) {
          await proposta.load('categoria', (query) => {
            query.select('id', 'nome')
          })
        }

        // Carrega o usuário responsável
        await proposta.load('user', (query) => {
          query.select('id', 'nome', 'email')
        })
      }

      // Formata a resposta
      const propostasFormatadas = propostas.map((proposta) => ({
        id: proposta.id,
        nome: proposta.nome,
        statusProposta: proposta.statusProposta,
        createdAt: proposta.createdAt,
        categoria:
          proposta.categoriaId && proposta.categoria
            ? {
                id: proposta.categoria.id,
                nome: proposta.categoria.nome,
              }
            : null,
        cliente: proposta.cliente
          ? {
              id: proposta.cliente.id,
              nome: proposta.cliente.nome,
              telefone: proposta.cliente.telefone,
              email: proposta.cliente.email,
            }
          : null,
        responsavel: proposta.user
          ? {
              id: proposta.user.id,
              nome: proposta.user.nome,
              email: proposta.user.email,
            }
          : null,
      }))

      return response.ok({
        message: 'Propostas comerciais listadas com sucesso',
        data: {
          meta: propostasPaginated.getMeta(),
          data: propostasFormatadas,
        },
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro ao listar propostas comerciais',
        error: error.message,
      })
    }
  }

  /**
   * Criar nova proposta comercial
   */
  async store({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const data = await request.validateUsing(criarPropostaComercialValidator)

      // Verificar se cliente pertence ao usuário
      const cliente = await Cliente.query()
        .where('id', data.clienteId)
        .andWhere('user_id', user.id)
        .first()

      if (!cliente) {
        return response.notFound({
          message: 'Cliente não encontrado ou não pertence a você',
        })
      }

      // Verificar se categoria pertence ao usuário (se fornecida)
      if (data.categoriaId) {
        const categoria = await Categoria.query()
          .where('id', data.categoriaId)
          .andWhere('user_id', user.id)
          .first()

        if (!categoria) {
          return response.notFound({
            message: 'Categoria não encontrada ou não pertence a você',
          })
        }
      }

      const proposta = await PropostaComercial.create({
        ...data,
        userId: user.id,
      })

      await proposta.load('categoria')
      await proposta.load('cliente')

      return response.created({
        message: 'Proposta comercial criada com sucesso',
        data: proposta,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro ao criar proposta comercial',
        error: error.message,
      })
    }
  }

  /**
   * Mostrar uma proposta comercial específica
   */
  async show({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      const proposta = await PropostaComercial.query()
        .where('id', id)
        .andWhere('user_id', user.id)
        .preload('categoria')
        .preload('cliente')
        .preload('user', (query) => {
          query.select('id', 'nome', 'email')
        })
        .first()

      if (!proposta) {
        return response.notFound({
          message: 'Proposta comercial não encontrada',
        })
      }

      return response.ok({
        message: 'Proposta comercial encontrada',
        data: proposta,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro ao buscar proposta comercial',
        error: error.message,
      })
    }
  }

  /**
   * Atualizar proposta comercial
   */
  async update({ auth, params, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      const proposta = await PropostaComercial.query()
        .where('id', id)
        .andWhere('user_id', user.id)
        .first()

      if (!proposta) {
        return response.notFound({
          message: 'Proposta comercial não encontrada',
        })
      }

      const data = await request.validateUsing(atualizarPropostaComercialValidator)

      // Verificar se novo cliente pertence ao usuário
      if (data.clienteId) {
        const cliente = await Cliente.query()
          .where('id', data.clienteId)
          .andWhere('user_id', user.id)
          .first()

        if (!cliente) {
          return response.notFound({
            message: 'Cliente não encontrado ou não pertence a você',
          })
        }
      }

      // Verificar se nova categoria pertence ao usuário
      if (data.categoriaId) {
        const categoria = await Categoria.query()
          .where('id', data.categoriaId)
          .andWhere('user_id', user.id)
          .first()

        if (!categoria) {
          return response.notFound({
            message: 'Categoria não encontrada ou não pertence a você',
          })
        }
      }

      // FALTAVA ESTA LINHA! Aplicar as mudanças
      proposta.merge(data)
      await proposta.save() // Agora salva as mudanças

      // Recarregar relacionamentos
      await proposta.load('categoria')
      await proposta.load('cliente')

      return response.ok({
        message: 'Proposta comercial atualizada com sucesso',
        data: proposta,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro ao atualizar proposta comercial',
        error: error.message,
      })
    }
  }

  /**
   * Excluir proposta comercial
   */
  async destroy({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      const proposta = await PropostaComercial.query()
        .where('id', id)
        .andWhere('user_id', user.id)
        .first()

      if (!proposta) {
        return response.notFound({
          message: 'Proposta comercial não encontrada',
        })
      }

      await proposta.delete()

      return response.ok({
        message: 'Proposta comercial excluída com sucesso',
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro ao excluir proposta comercial',
        error: error.message,
      })
    }
  }

  /**
   * Adicionar página à proposta comercial
   */
  async adicionarPagina({ auth, params, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      const proposta = await PropostaComercial.query()
        .where('id', id)
        .andWhere('user_id', user.id)
        .first()

      if (!proposta) {
        return response.notFound({
          message: 'Proposta comercial não encontrada',
        })
      }

      const { titulo, conteudo } = request.only(['titulo', 'conteudo'])

      if (!titulo || !conteudo) {
        return response.badRequest({
          message: 'Título e conteúdo são obrigatórios',
        })
      }

      // Inicializar array de páginas se for null
      const paginas = proposta.paginas || []

      // Adicionar nova página
      paginas.push({
        titulo,
        conteudo,
      })

      proposta.paginas = paginas
      await proposta.save()

      return response.ok({
        message: 'Página adicionada com sucesso',
        data: proposta,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro ao adicionar página',
        error: error.message,
      })
    }
  }

  /**
   * Atualizar página específica da proposta
   */
  async atualizarPagina({ auth, params, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id, paginaIndex } = params

      const proposta = await PropostaComercial.query()
        .where('id', id)
        .andWhere('user_id', user.id)
        .first()

      if (!proposta) {
        return response.notFound({
          message: 'Proposta comercial não encontrada',
        })
      }

      const index = Number.parseInt(paginaIndex)
      const paginas = proposta.paginas || []

      if (index < 0 || index >= paginas.length) {
        return response.badRequest({
          message: 'Índice da página inválido',
        })
      }

      const { titulo, conteudo } = request.only(['titulo', 'conteudo'])

      // Atualizar página
      if (titulo) paginas[index].titulo = titulo
      if (conteudo) paginas[index].conteudo = conteudo

      proposta.paginas = paginas
      await proposta.save()

      return response.ok({
        message: 'Página atualizada com sucesso',
        data: proposta,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro ao atualizar página',
        error: error.message,
      })
    }
  }

  /**
   * Remover página da proposta
   */
  async removerPagina({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id, paginaIndex } = params

      const proposta = await PropostaComercial.query()
        .where('id', id)
        .andWhere('user_id', user.id)
        .first()

      if (!proposta) {
        return response.notFound({
          message: 'Proposta comercial não encontrada',
        })
      }

      const index = Number.parseInt(paginaIndex)
      const paginas = proposta.paginas || []

      if (index < 0 || index >= paginas.length) {
        return response.badRequest({
          message: 'Índice da página inválido',
        })
      }

      // Remover página
      paginas.splice(index, 1)
      proposta.paginas = paginas.length > 0 ? paginas : null
      await proposta.save()

      return response.ok({
        message: 'Página removida com sucesso',
        data: proposta,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro ao remover página',
        error: error.message,
      })
    }
  }

  /**
   * Alterar status da proposta
   */
  async alterarStatus({ auth, params, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      const proposta = await PropostaComercial.query()
        .where('id', id)
        .andWhere('user_id', user.id)
        .first()

      if (!proposta) {
        return response.notFound({
          message: 'Proposta comercial não encontrada',
        })
      }

      const { status } = request.only(['status'])

      if (!['pendente', 'cancelado', 'aprovado'].includes(status)) {
        return response.badRequest({
          message: 'Status inválido. Use: pendente, cancelado ou aprovado',
        })
      }

      proposta.statusProposta = status
      await proposta.save()

      return response.ok({
        message: 'Status da proposta atualizado com sucesso',
        data: proposta,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro ao alterar status',
        error: error.message,
      })
    }
  }

  /**
   * Duplicar proposta comercial
   */
  async duplicar({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      const propostaOriginal = await PropostaComercial.query()
        .where('id', id)
        .andWhere('user_id', user.id)
        .first()

      if (!propostaOriginal) {
        return response.notFound({
          message: 'Proposta comercial não encontrada',
        })
      }

      const novaProposta = await PropostaComercial.create({
        nome: `${propostaOriginal.nome} (Cópia)`,
        statusProposta: 'pendente',
        categoriaId: propostaOriginal.categoriaId,
        clienteId: propostaOriginal.clienteId,
        userId: user.id,
        paginas: propostaOriginal.paginas ? [...propostaOriginal.paginas] : null,
        observacoes: propostaOriginal.observacoes,
      })

      await novaProposta.load('categoria')
      await novaProposta.load('cliente')

      return response.created({
        message: 'Proposta comercial duplicada com sucesso',
        data: novaProposta,
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro ao duplicar proposta comercial',
        error: error.message,
      })
    }
  }

  /**
   * Pesquisa avançada de propostas comerciais
   */
  async pesquisar({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const {
        page = 1,
        limit = 10,
        status,
        clienteId,
        categoriaId,
        userId,
        dataInicio,
        dataFim,
        search,
      } = request.all()

      const propostaQuery = PropostaComercial.query()
        .where('user_id', user.id)
        .select(
          'id',
          'nome',
          'status_proposta',
          'created_at',
          'categoria_id',
          'cliente_id',
          'user_id'
        )
        .orderBy('created_at', 'desc')

      // Aplicar filtros
      if (status) propostaQuery.where('status_proposta', status)
      if (clienteId) propostaQuery.where('cliente_id', clienteId)
      if (categoriaId) propostaQuery.where('categoria_id', categoriaId)
      if (userId) propostaQuery.where('user_id', userId)

      // Filtro por período
      if (dataInicio) {
        const inicio = DateTime.fromISO(dataInicio).startOf('day')
        if (inicio.isValid) propostaQuery.where('created_at', '>=', inicio.toISO())
      }

      if (dataFim) {
        const fim = DateTime.fromISO(dataFim).endOf('day')
        if (fim.isValid) propostaQuery.where('created_at', '<=', fim.toISO())
      }

      // Busca textual
      if (search) {
        propostaQuery.where((query) => {
          query.where('nome', 'ilike', `%${search}%`).orWhereHas('cliente', (clienteQuery) => {
            clienteQuery.where('nome', 'ilike', `%${search}%`)
          })
        })
      }

      // Paginação
      const propostasPaginated = await propostaQuery
        .preload('categoria', (query) => query.select('id', 'nome'))
        .preload('cliente', (query) => query.select('id', 'nome', 'telefone', 'email'))
        .preload('user', (query) => query.select('id', 'nome', 'email'))
        .paginate(page, limit)

      return response.ok({
        message: 'Pesquisa realizada com sucesso',
        data: {
          meta: propostasPaginated.getMeta(),
          data: propostasPaginated.all(),
        },
      })
    } catch (error) {
      return response.internalServerError({
        message: 'Erro na pesquisa',
        error: error.message,
      })
    }
  }
}
