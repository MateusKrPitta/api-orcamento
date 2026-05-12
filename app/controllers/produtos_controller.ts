// app/controllers/produtos_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Produto from '#models/produto'

export default class ProdutosController {
  async index({ auth, response, request }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Parâmetros de paginação
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const search = request.input('search', '')
      const ativo = request.input('ativo') // Novo parâmetro para filtrar por status

      const query = Produto.query().where('user_id', user.id)

      if (search) {
        query.where('nome', 'ILIKE', `%${search}%`)
      }

      // Filtro por status ativo (se fornecido)
      if (ativo !== undefined && ativo !== '') {
        const isAtivo = ativo === 'true' || ativo === '1'
        query.where('ativo', isAtivo)
      }

      // Paginação
      const produtos = await query.orderBy('nome', 'asc').paginate(page, limit)

      return response.ok({
        success: true,
        message: 'Produtos listados com sucesso',
        data: produtos.all(),
        meta: {
          total: produtos.total,
          per_page: produtos.perPage,
          current_page: produtos.currentPage,
          last_page: produtos.lastPage,
          first_page: 1,
          first_page_url: `/produtos?page=1`,
          last_page_url: `/produtos?page=${produtos.lastPage}`,
          next_page_url:
            produtos.currentPage < produtos.lastPage
              ? `/produtos?page=${produtos.currentPage + 1}`
              : null,
          prev_page_url:
            produtos.currentPage > 1 ? `/produtos?page=${produtos.currentPage - 1}` : null,
          path: request.url().split('?')[0],
          from: (produtos.currentPage - 1) * produtos.perPage + 1,
          to: Math.min(produtos.currentPage * produtos.perPage, produtos.total),
        },
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao listar produtos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  async store({ request, auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const nome = request.input('nome')
      const ativo = request.input('ativo', true) // Novo campo, padrão true

      // Validação
      if (!nome) {
        return response.badRequest({
          success: false,
          message: 'O campo "nome" é obrigatório',
        })
      }

      const nomeTrim = nome.toString().trim()

      if (nomeTrim.length < 2) {
        return response.badRequest({
          success: false,
          message: 'O nome deve ter pelo menos 2 caracteres',
        })
      }

      if (nomeTrim.length > 255) {
        return response.badRequest({
          success: false,
          message: 'O nome deve ter no máximo 255 caracteres',
        })
      }

      // Verificar se já existe produto com mesmo nome para este usuário
      const produtoExistente = await Produto.query()
        .where('user_id', user.id)
        .where('nome', nomeTrim)
        .first()

      if (produtoExistente) {
        return response.conflict({
          success: false,
          message: 'Já existe um produto com este nome',
        })
      }

      const produto = await Produto.create({
        nome: nomeTrim,
        ativo: ativo,
        userId: user.id,
      })

      return response.created({
        success: true,
        message: 'Produto criado com sucesso',
        data: produto,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao criar produto',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  async show({ params, auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Validar ID
      const id = Number(params.id)
      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do produto inválido',
        })
      }

      const produto = await Produto.query().where('id', id).where('user_id', user.id).first()

      if (!produto) {
        return response.notFound({
          success: false,
          message: 'Produto não encontrado',
        })
      }

      return response.ok({
        success: true,
        message: 'Produto encontrado',
        data: produto,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao buscar produto',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  async update({ params, request, auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Validar ID
      const id = Number(params.id)
      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do produto inválido',
        })
      }

      const produto = await Produto.query().where('id', id).where('user_id', user.id).first()

      if (!produto) {
        return response.notFound({
          success: false,
          message: 'Produto não encontrado',
        })
      }

      const nome = request.input('nome')
      const ativo = request.input('ativo') // Novo campo

      // Se não enviou nenhum campo para atualizar
      if (nome === undefined && ativo === undefined) {
        return response.badRequest({
          success: false,
          message: 'É necessário informar pelo menos um campo para atualização (nome ou ativo)',
        })
      }

      let nomeTrim = nome
      if (nome !== undefined) {
        nomeTrim = nome.toString().trim()

        if (nomeTrim.length < 2) {
          return response.badRequest({
            success: false,
            message: 'O nome deve ter pelo menos 2 caracteres',
          })
        }

        if (nomeTrim.length > 255) {
          return response.badRequest({
            success: false,
            message: 'O nome deve ter no máximo 255 caracteres',
          })
        }

        // Verificar se já existe outro produto com mesmo nome
        const produtoComMesmoNome = await Produto.query()
          .where('user_id', user.id)
          .where('nome', nomeTrim)
          .whereNot('id', id)
          .first()

        if (produtoComMesmoNome) {
          return response.conflict({
            success: false,
            message: 'Já existe outro produto com este nome',
          })
        }

        produto.nome = nomeTrim
      }

      // Atualizar status se fornecido
      if (ativo !== undefined) {
        produto.ativo = ativo
      }

      await produto.save()

      return response.ok({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: produto,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao atualizar produto',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  async destroy({ params, auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Validar ID
      const id = Number(params.id)
      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do produto inválido',
        })
      }

      const produto = await Produto.query().where('id', id).where('user_id', user.id).first()

      if (!produto) {
        return response.notFound({
          success: false,
          message: 'Produto não encontrado',
        })
      }

      await produto.delete()

      return response.ok({
        success: true,
        message: 'Produto excluído com sucesso',
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao excluir produto',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  // Rota específica para alternar status (toggle)
  async toggleAtivo({ params, auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Validar ID
      const id = Number(params.id)
      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do produto inválido',
        })
      }

      const produto = await Produto.query().where('id', id).where('user_id', user.id).first()

      if (!produto) {
        return response.notFound({
          success: false,
          message: 'Produto não encontrado',
        })
      }

      // Inverter status
      produto.ativo = !produto.ativo
      await produto.save()

      const statusMsg = produto.ativo ? 'ativado' : 'inativado'

      return response.ok({
        success: true,
        message: `Produto ${statusMsg} com sucesso`,
        data: produto,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao alterar status do produto',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  // Rota específica para ativar produto
  async ativar({ params, auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Validar ID
      const id = Number(params.id)
      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do produto inválido',
        })
      }

      const produto = await Produto.query().where('id', id).where('user_id', user.id).first()

      if (!produto) {
        return response.notFound({
          success: false,
          message: 'Produto não encontrado',
        })
      }

      // Verificar se já está ativo
      if (produto.ativo) {
        return response.badRequest({
          success: false,
          message: 'Produto já está ativo',
        })
      }

      produto.ativo = true
      await produto.save()

      return response.ok({
        success: true,
        message: 'Produto ativado com sucesso',
        data: produto,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao ativar produto',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  // Rota específica para inativar produto
  async inativar({ params, auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Validar ID
      const id = Number(params.id)
      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do produto inválido',
        })
      }

      const produto = await Produto.query().where('id', id).where('user_id', user.id).first()

      if (!produto) {
        return response.notFound({
          success: false,
          message: 'Produto não encontrado',
        })
      }

      // Verificar se já está inativo
      if (!produto.ativo) {
        return response.badRequest({
          success: false,
          message: 'Produto já está inativo',
        })
      }

      produto.ativo = false
      await produto.save()

      return response.ok({
        success: true,
        message: 'Produto inativado com sucesso',
        data: produto,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao inativar produto',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }
}
