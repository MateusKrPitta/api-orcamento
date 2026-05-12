// app/controllers/auth_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    try {
      const { nome, email, password } = request.only(['nome', 'email', 'password'])

      // Validações
      if (!nome || !email || !password) {
        return response.badRequest({
          success: false,
          message: 'Todos os campos são obrigatórios',
        })
      }

      if (nome.length < 2) {
        return response.badRequest({
          success: false,
          message: 'O nome deve ter pelo menos 2 caracteres',
        })
      }

      if (password.length < 6) {
        return response.badRequest({
          success: false,
          message: 'A senha deve ter pelo menos 6 caracteres',
        })
      }

      // Verificar se email já existe
      const emailExists = await User.findBy('email', email)
      if (emailExists) {
        return response.conflict({
          success: false,
          message: 'Email já cadastrado',
        })
      }

      // Criar usuário
      const user = await User.create({ nome, email, password })

      // Criar token
      const token = await User.accessTokens.create(user)

      return response.created({
        success: true,
        message: 'Usuário cadastrado com sucesso',
        data: {
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            created_at: user.createdAt,
          },
          token: token.value!.release(),
        },
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao cadastrar usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  async login({ request, response }: HttpContext) {
    try {
      const { email, password } = request.only(['email', 'password'])

      if (!email || !password) {
        return response.badRequest({
          success: false,
          message: 'Email e senha são obrigatórios',
        })
      }

      // Verificar credenciais
      const user = await User.verifyCredentials(email, password)

      // Criar token
      const token = await User.accessTokens.create(user)

      return response.ok({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
          },
          token: token.value!.release(),
        },
      })
    } catch {
      return response.unauthorized({
        success: false,
        message: 'Credenciais inválidas',
      })
    }
  }

  async me({ auth, response }: HttpContext) {
    try {
      const user = await auth.authenticate() // Usa o guard padrão

      return response.ok({
        success: true,
        message: 'Dados do usuário',
        data: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        },
      })
    } catch {
      return response.unauthorized({
        success: false,
        message: 'Usuário não autenticado',
      })
    }
  }

  async logout({ auth, response }: HttpContext) {
    try {
      const user = await auth.authenticate()

      // Revogar token atual
      const token = user.currentAccessToken
      if (token) {
        await User.accessTokens.delete(user, token.identifier)
      }

      return response.ok({
        success: true,
        message: 'Logout realizado com sucesso',
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao fazer logout',
      })
    }
  }
}
