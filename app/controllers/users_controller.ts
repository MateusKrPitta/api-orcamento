// app/controllers/users_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class UsersController {
  /**
   * Listar todos os usuários (apenas para admin)
   */
  async index({ auth, response, request }: HttpContext) {
    try {
      await auth.authenticate()

      // Se quiser restringir apenas para admin, descomente:
      // if (!currentUser.isAdmin) {
      //   return response.forbidden({
      //     success: false,
      //     message: 'Apenas administradores podem listar usuários',
      //   })
      // }

      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const search = request.input('search', '')
      const ativo = request.input('ativo')

      const query = User.query()

      // Filtro por busca
      if (search) {
        query.where('nome', 'ILIKE', `%${search}%`).orWhere('email', 'ILIKE', `%${search}%`)
      }

      // Filtro por status ativo
      if (ativo !== undefined && ativo !== '') {
        const isAtivo = ativo === 'true' || ativo === '1'
        query.where('ativo', isAtivo)
      }

      const users = await query.orderBy('nome', 'asc').paginate(page, limit)

      return response.ok({
        success: true,
        message: 'Usuários listados com sucesso',
        data: users.all().map((user) => ({
          id: user.id,
          nome: user.nome,
          email: user.email,
          ativo: user.ativo,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        })),
        meta: users.getMeta(),
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao listar usuários',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Criar novo usuário (para admin)
   */
  async store({ request, auth, response }: HttpContext) {
    try {
      await auth.authenticate()
      // Tentar diferentes formas de pegar os dados
      const payload = request.only(['nome', 'email', 'password', 'ativo'])
      const allBody = request.all()

      // Verificar cada campo individualmente
      const nomeInput = request.input('nome')
      const emailInput = request.input('email')
      const passwordInput = request.input('password')
      const ativoInput = request.input('ativo')

      const errors: string[] = []

      if (!nomeInput || nomeInput.toString().trim().length === 0) {
        errors.push('O nome é obrigatório')
      }

      if (!emailInput || emailInput.toString().trim().length === 0) {
        errors.push('O email é obrigatório')
      }

      if (!passwordInput || passwordInput.toString().trim().length === 0) {
        errors.push('A senha é obrigatória')
      }

      if (errors.length > 0) {
        return response.badRequest({
          success: false,
          message: 'Erro de validação',
          errors: errors,
          debug: {
            // Informações para debug
            payload_keys: Object.keys(payload),
            payload_values: {
              nome: payload.nome,
              email: payload.email,
              password: payload.password ? '***' : null,
              ativo: payload.ativo,
            },
            all_body_keys: Object.keys(allBody),
            individual_inputs: {
              nome: nomeInput,
              email: emailInput,
              password: passwordInput ? '***' : null,
            },
          },
        })
      }

      // Se chegou aqui, os campos existem
      const nome = nomeInput.toString().trim()
      const email = emailInput.toString().trim()
      const password = passwordInput.toString().trim()
      const ativo = ativoInput !== undefined ? ativoInput : true

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

      // Verificar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return response.badRequest({
          success: false,
          message: 'Email inválido',
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

      const user = await User.create({
        nome,
        email,
        password,
        ativo,
      })

      return response.created({
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          ativo: user.ativo,
          created_at: user.createdAt,
        },
      })
    } catch (error) {
      console.error('Erro no store:', error)
      return response.internalServerError({
        success: false,
        message: 'Erro ao criar usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Buscar usuário específico
   */
  async show({ params, auth, response }: HttpContext) {
    try {
      await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do usuário inválido',
        })
      }

      const user = await User.find(id)

      if (!user) {
        return response.notFound({
          success: false,
          message: 'Usuário não encontrado',
        })
      }

      // Verificar permissão (só pode ver o próprio perfil ou ser admin)
      // if (currentUser.id !== user.id && !currentUser.isAdmin) {
      //   return response.forbidden({
      //     success: false,
      //     message: 'Acesso negado',
      //   })
      // }

      return response.ok({
        success: true,
        message: 'Usuário encontrado',
        data: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          ativo: user.ativo,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        },
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao buscar usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Atualizar usuário
   */
  async update({ params, request, auth, response }: HttpContext) {
    try {
      await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do usuário inválido',
        })
      }

      const user = await User.find(id)

      if (!user) {
        return response.notFound({
          success: false,
          message: 'Usuário não encontrado',
        })
      }

      // Verificar permissão (só pode atualizar o próprio perfil ou ser admin)
      // if (currentUser.id !== user.id && !currentUser.isAdmin) {
      //   return response.forbidden({
      //     success: false,
      //     message: 'Acesso negado',
      //   })
      // }

      const { nome, email, ativo } = request.only(['nome', 'email', 'ativo'])

      // Se não enviou nenhum campo
      if (!nome && !email && ativo === undefined) {
        return response.badRequest({
          success: false,
          message: 'É necessário informar pelo menos um campo para atualização',
        })
      }

      if (nome !== undefined) {
        const nomeTrim = nome.toString().trim()
        if (nomeTrim.length < 2) {
          return response.badRequest({
            success: false,
            message: 'O nome deve ter pelo menos 2 caracteres',
          })
        }
        user.nome = nomeTrim
      }

      if (email !== undefined) {
        const emailTrim = email.toString().trim()
        // Verificar se email já existe (exceto para o próprio usuário)
        const emailExists = await User.query().where('email', emailTrim).whereNot('id', id).first()

        if (emailExists) {
          return response.conflict({
            success: false,
            message: 'Email já está em uso por outro usuário',
          })
        }
        user.email = emailTrim
      }

      if (ativo !== undefined) {
        // Só admin pode alterar status de outros (se quiser implementar)
        // if (currentUser.id !== user.id && !currentUser.isAdmin) {
        //   return response.forbidden({
        //     success: false,
        //     message: 'Apenas administradores podem alterar status de outros usuários',
        //   })
        // }
        user.ativo = ativo
      }

      await user.save()

      return response.ok({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          ativo: user.ativo,
        },
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao atualizar usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Excluir usuário
   */
  async destroy({ params, auth, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do usuário inválido',
        })
      }

      // Não permitir excluir a si mesmo
      if (currentUser.id === id) {
        return response.badRequest({
          success: false,
          message: 'Não é possível excluir sua própria conta',
        })
      }

      const user = await User.find(id)

      if (!user) {
        return response.notFound({
          success: false,
          message: 'Usuário não encontrado',
        })
      }

      // Verificar se é admin (se quiser implementar)
      // if (!currentUser.isAdmin) {
      //   return response.forbidden({
      //     success: false,
      //     message: 'Apenas administradores podem excluir usuários',
      //   })
      // }

      await user.delete()

      return response.ok({
        success: true,
        message: 'Usuário excluído com sucesso',
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao excluir usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Alternar status ativo/inativo
   */
  async toggleAtivo({ params, auth, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do usuário inválido',
        })
      }

      const user = await User.find(id)

      if (!user) {
        return response.notFound({
          success: false,
          message: 'Usuário não encontrado',
        })
      }

      // Não permitir alterar o próprio status
      if (currentUser.id === id) {
        return response.badRequest({
          success: false,
          message: 'Não é possível alterar seu próprio status',
        })
      }

      // Verificar se é admin (se quiser implementar)
      // if (!currentUser.isAdmin) {
      //   return response.forbidden({
      //     success: false,
      //     message: 'Apenas administradores podem alterar status',
      //   })
      // }

      user.ativo = !user.ativo
      await user.save()

      const statusMsg = user.ativo ? 'ativado' : 'inativado'

      return response.ok({
        success: true,
        message: `Usuário ${statusMsg} com sucesso`,
        data: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          ativo: user.ativo,
        },
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao alterar status do usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Ativar usuário específico
   */
  async ativar({ params, auth, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do usuário inválido',
        })
      }

      const user = await User.find(id)

      if (!user) {
        return response.notFound({
          success: false,
          message: 'Usuário não encontrado',
        })
      }

      // Não permitir ativar a si mesmo se já estiver ativo
      if (currentUser.id === id && user.ativo) {
        return response.badRequest({
          success: false,
          message: 'Você já está ativo',
        })
      }

      // Verificar se é admin para ativar outros (se quiser implementar)
      // if (currentUser.id !== id && !currentUser.isAdmin) {
      //   return response.forbidden({
      //     success: false,
      //     message: 'Apenas administradores podem ativar outros usuários',
      //   })
      // }

      if (user.ativo) {
        return response.badRequest({
          success: false,
          message: 'Usuário já está ativo',
        })
      }

      user.ativo = true
      await user.save()

      return response.ok({
        success: true,
        message: 'Usuário ativado com sucesso',
        data: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          ativo: user.ativo,
        },
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao ativar usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }

  /**
   * Inativar usuário específico
   */
  async inativar({ params, auth, response }: HttpContext) {
    try {
      const currentUser = await auth.authenticate()
      const id = Number(params.id)

      if (Number.isNaN(id) || id <= 0) {
        return response.badRequest({
          success: false,
          message: 'ID do usuário inválido',
        })
      }

      const user = await User.find(id)

      if (!user) {
        return response.notFound({
          success: false,
          message: 'Usuário não encontrado',
        })
      }

      // Não permitir inativar a si mesmo
      if (currentUser.id === id) {
        return response.badRequest({
          success: false,
          message: 'Não é possível inativar sua própria conta',
        })
      }

      // Verificar se é admin (se quiser implementar)
      // if (!currentUser.isAdmin) {
      //   return response.forbidden({
      //     success: false,
      //     message: 'Apenas administradores podem inativar usuários',
      //   })
      // }

      if (!user.ativo) {
        return response.badRequest({
          success: false,
          message: 'Usuário já está inativo',
        })
      }

      user.ativo = false
      await user.save()

      return response.ok({
        success: true,
        message: 'Usuário inativado com sucesso',
        data: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          ativo: user.ativo,
        },
      })
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Erro ao inativar usuário',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      })
    }
  }
}
