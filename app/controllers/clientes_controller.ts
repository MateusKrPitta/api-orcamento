import type { HttpContext } from '@adonisjs/core/http'
import Cliente from '#models/cliente'

export default class ClientesController {
  async index({ auth, response, request }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const search = request.input('search', '')

      const query = Cliente.query().where('user_id', currentUser.id).orderBy('nome', 'asc')

      if (search) {
        query.where((builder) => {
          builder
            .where('nome', 'ILIKE', `%${search}%`)
            .orWhere('telefone', 'ILIKE', `%${search}%`)
            .orWhere('email', 'ILIKE', `%${search}%`)
        })
      }

      const clientes = await query.exec()

      return response.ok({
        success: true,
        message: 'Clientes listados com sucesso',
        data: clientes,
      })
    } catch (error) {
      console.error('Erro ao listar clientes:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao listar clientes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  async show({ params, auth, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do cliente inválido',
        })
      }

      const cliente = await Cliente.query()
        .where('id', id)
        .andWhere('user_id', currentUser.id)
        .preload('orcamentos', (orcamentoQuery) => {
          orcamentoQuery.select(['id', 'numero', 'data_emissao', 'status', 'total_geral'])
          orcamentoQuery.orderBy('data_emissao', 'desc')
        })
        .first()

      if (!cliente) {
        return response.notFound({
          success: false,
          message: 'Cliente não encontrado',
        })
      }

      return response.ok({
        success: true,
        message: 'Cliente encontrado',
        data: cliente,
      })
    } catch (error) {
      console.error('Erro ao buscar cliente:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao buscar cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  async store({ auth, request, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()

      // Pegar dados diretamente do request
      const payload = request.all()

      // Validação básica
      if (!payload.nome || !payload.telefone) {
        return response.badRequest({
          success: false,
          message: 'Nome e telefone são obrigatórios',
        })
      }

      // Validar formato do email se fornecido
      if (payload.email && !payload.email.includes('@')) {
        return response.badRequest({
          success: false,
          message: 'Email inválido',
        })
      }

      const cliente = await Cliente.create({
        userId: currentUser.id,
        nome: payload.nome,
        telefone: payload.telefone,
        email: payload.email || null,
        endereco: payload.endereco || null,
        observacoes: payload.observacoes || null,
      })

      return response.created({
        success: true,
        message: 'Cliente criado com sucesso',
        data: cliente,
      })
    } catch (error) {
      console.error('Erro ao criar cliente:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao criar cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  async update({ params, auth, request, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do cliente inválido',
        })
      }

      const cliente = await Cliente.query()
        .where('id', id)
        .andWhere('user_id', currentUser.id)
        .first()

      if (!cliente) {
        return response.notFound({
          success: false,
          message: 'Cliente não encontrado',
        })
      }

      // Pegar dados diretamente do request
      const payload = request.all()

      // Validação básica
      if (payload.nome !== undefined && !payload.nome.trim()) {
        return response.badRequest({
          success: false,
          message: 'Nome não pode ser vazio',
        })
      }

      if (payload.telefone !== undefined && !payload.telefone.trim()) {
        return response.badRequest({
          success: false,
          message: 'Telefone não pode ser vazio',
        })
      }

      // Validar formato do email se fornecido
      if (payload.email !== undefined && payload.email && !payload.email.includes('@')) {
        return response.badRequest({
          success: false,
          message: 'Email inválido',
        })
      }

      // Atualizar apenas os campos fornecidos
      if (payload.nome !== undefined) cliente.nome = payload.nome
      if (payload.telefone !== undefined) cliente.telefone = payload.telefone
      if (payload.email !== undefined) cliente.email = payload.email || null
      if (payload.endereco !== undefined) cliente.endereco = payload.endereco || null
      if (payload.observacoes !== undefined) cliente.observacoes = payload.observacoes || null

      await cliente.save()

      return response.ok({
        success: true,
        message: 'Cliente atualizado com sucesso',
        data: cliente,
      })
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao atualizar cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  async destroy({ params, auth, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do cliente inválido',
        })
      }

      const cliente = await Cliente.query()
        .where('id', id)
        .andWhere('user_id', currentUser.id)
        .first()

      if (!cliente) {
        return response.notFound({
          success: false,
          message: 'Cliente não encontrado',
        })
      }

      await cliente.delete()

      return response.ok({
        success: true,
        message: 'Cliente excluído com sucesso',
      })
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao excluir cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }
}
