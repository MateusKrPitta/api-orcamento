// app/controllers/categorias_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Categoria from '#models/categoria'

export default class CategoriasController {
  async index({ auth, response, request }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      const search = request.input('search', '')
      const ativo = request.input('ativo')

      // Query base
      const query = Categoria.query().where('user_id', user.id)

      // Filtro por busca
      if (search) {
        query.where('nome', 'ILIKE', `%${search}%`)
      }

      // Filtro por status ativo (se fornecido)
      if (ativo !== undefined && ativo !== '') {
        const isAtivo = ativo === 'true' || ativo === '1'
        query.where('ativo', isAtivo)
      }

      // Buscar todas as categorias ordenadas
      const categorias = await query.orderBy('nome', 'asc').exec()

      return response.ok({
        success: true,
        message: 'Categorias listadas com sucesso',
        data: categorias,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao listar categorias',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  async store({ request, auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const nome = request.input('nome')
      const ativo = request.input('ativo', true)

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

      // Verificar se já existe categoria com mesmo nome para este usuário
      const categoriaExistente = await Categoria.query()
        .where('user_id', user.id)
        .where('nome', nomeTrim)
        .first()

      if (categoriaExistente) {
        return response.conflict({
          success: false,
          message: 'Já existe uma categoria com este nome',
        })
      }

      const categoria = await Categoria.create({
        nome: nomeTrim,
        ativo: ativo,
        userId: user.id,
      })

      return response.created({
        success: true,
        message: 'Categoria criada com sucesso',
        data: categoria,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao criar categoria',
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
          message: 'ID da categoria inválido',
        })
      }

      const categoria = await Categoria.query().where('id', id).where('user_id', user.id).first()

      if (!categoria) {
        return response.notFound({
          success: false,
          message: 'Categoria não encontrada',
        })
      }

      return response.ok({
        success: true,
        message: 'Categoria encontrada',
        data: categoria,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao buscar categoria',
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
          message: 'ID da categoria inválido',
        })
      }

      const categoria = await Categoria.query().where('id', id).where('user_id', user.id).first()

      if (!categoria) {
        return response.notFound({
          success: false,
          message: 'Categoria não encontrada',
        })
      }

      const nome = request.input('nome')
      const ativo = request.input('ativo')

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

        // Verificar se já existe outra categoria com mesmo nome
        const categoriaComMesmoNome = await Categoria.query()
          .where('user_id', user.id)
          .where('nome', nomeTrim)
          .whereNot('id', id)
          .first()

        if (categoriaComMesmoNome) {
          return response.conflict({
            success: false,
            message: 'Já existe outra categoria com este nome',
          })
        }

        categoria.nome = nomeTrim
      }

      // Atualizar status se fornecido
      if (ativo !== undefined) {
        categoria.ativo = ativo
      }

      await categoria.save()

      return response.ok({
        success: true,
        message: 'Categoria atualizada com sucesso',
        data: categoria,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao atualizar categoria',
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
          message: 'ID da categoria inválido',
        })
      }

      const categoria = await Categoria.query().where('id', id).where('user_id', user.id).first()

      if (!categoria) {
        return response.notFound({
          success: false,
          message: 'Categoria não encontrada',
        })
      }

      await categoria.delete()

      return response.ok({
        success: true,
        message: 'Categoria excluída com sucesso',
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao excluir categoria',
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
          message: 'ID da categoria inválido',
        })
      }

      const categoria = await Categoria.query().where('id', id).where('user_id', user.id).first()

      if (!categoria) {
        return response.notFound({
          success: false,
          message: 'Categoria não encontrada',
        })
      }

      // Inverter status
      categoria.ativo = !categoria.ativo
      await categoria.save()

      const statusMsg = categoria.ativo ? 'ativada' : 'inativada'

      return response.ok({
        success: true,
        message: `Categoria ${statusMsg} com sucesso`,
        data: categoria,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao alterar status da categoria',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  // Rota específica para ativar categoria
  async ativar({ params, auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Validar ID
      const id = Number(params.id)
      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID da categoria inválido',
        })
      }

      const categoria = await Categoria.query().where('id', id).where('user_id', user.id).first()

      if (!categoria) {
        return response.notFound({
          success: false,
          message: 'Categoria não encontrada',
        })
      }

      // Verificar se já está ativa
      if (categoria.ativo) {
        return response.badRequest({
          success: false,
          message: 'Categoria já está ativa',
        })
      }

      categoria.ativo = true
      await categoria.save()

      return response.ok({
        success: true,
        message: 'Categoria ativada com sucesso',
        data: categoria,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao ativar categoria',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  // Rota específica para inativar categoria
  async inativar({ params, auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      // Validar ID
      const id = Number(params.id)
      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID da categoria inválido',
        })
      }

      const categoria = await Categoria.query().where('id', id).where('user_id', user.id).first()

      if (!categoria) {
        return response.notFound({
          success: false,
          message: 'Categoria não encontrada',
        })
      }

      // Verificar se já está inativa
      if (!categoria.ativo) {
        return response.badRequest({
          success: false,
          message: 'Categoria já está inativa',
        })
      }

      categoria.ativo = false
      await categoria.save()

      return response.ok({
        success: true,
        message: 'Categoria inativada com sucesso',
        data: categoria,
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao inativar categoria',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }
}
