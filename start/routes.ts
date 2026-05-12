import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Importar controllers dinamicamente
const AuthController = () => import('#controllers/auth_controller')
const ProdutosController = () => import('#controllers/produtos_controller')
const CategoriasController = () => import('#controllers/categorias_controller')
const UsersController = () => import('#controllers/users_controller')
const OrcamentosController = () => import('#controllers/orcamentos_controller')
const ClientesController = () => import('#controllers/clientes_controller')
const PropostasComerciaisController = () => import('#controllers/proposta_comercials_controller')

// ========== ROTA RAIZ ==========
router.get('/', async () => {
  return {
    api: 'Sistema Orçamento API',
    status: 'online',
    timestamp: new Date().toISOString(),
  }
})

// ========== ROTAS PÚBLICAS ==========
router.post('/login', [AuthController, 'login'])
router.post('/register', [AuthController, 'register'])

// ========== ROTAS PROTEGIDAS ==========
router
  .group(() => {
    // Autenticação
    router.post('/logout', [AuthController, 'logout'])
    router.get('/me', [AuthController, 'me'])

    // Grupo de produtos
    router
      .group(() => {
        router.get('/', [ProdutosController, 'index'])
        router.post('/', [ProdutosController, 'store'])
        router.get('/:id', [ProdutosController, 'show'])
        router.put('/:id', [ProdutosController, 'update'])
        router.delete('/:id', [ProdutosController, 'destroy'])
        router.patch('/:id/toggle-ativo', [ProdutosController, 'toggleAtivo'])
        router.patch('/:id/ativar', [ProdutosController, 'ativar'])
        router.patch('/:id/inativar', [ProdutosController, 'inativar'])
      })
      .prefix('produtos')

    // Grupo de usuários
    router
      .group(() => {
        router.get('/', [UsersController, 'index'])
        router.post('/', [UsersController, 'store'])
        router.get('/:id', [UsersController, 'show'])
        router.put('/:id', [UsersController, 'update'])
        router.delete('/:id', [UsersController, 'destroy'])
        router.patch('/:id/toggle-ativo', [UsersController, 'toggleAtivo'])
        router.patch('/:id/ativar', [UsersController, 'ativar'])
        router.patch('/:id/inativar', [UsersController, 'inativar'])
      })
      .prefix('users')

    // Grupo de categorias
    router
      .group(() => {
        router.get('/', [CategoriasController, 'index'])
        router.post('/', [CategoriasController, 'store'])
        router.get('/:id', [CategoriasController, 'show'])
        router.put('/:id', [CategoriasController, 'update'])
        router.delete('/:id', [CategoriasController, 'destroy'])
        router.patch('/:id/toggle-ativo', [CategoriasController, 'toggleAtivo'])
        router.patch('/:id/ativar', [CategoriasController, 'ativar'])
        router.patch('/:id/inativar', [CategoriasController, 'inativar'])
      })
      .prefix('categorias')

    // Grupo de orçamentos
    router
      .group(() => {
        router.get('/', [OrcamentosController, 'index'])
        router.get('/cliente', [OrcamentosController, 'buscarPorCliente'])
        router.get('/proximo-numero', [OrcamentosController, 'proximoNumero'])
        router.get('/relatorio', [OrcamentosController, 'relatorio'])
        router.post('/', [OrcamentosController, 'store'])
        router.get('/:id', [OrcamentosController, 'show'])
        router.put('/:id', [OrcamentosController, 'update'])
        router.delete('/:id', [OrcamentosController, 'destroy'])
        router.patch('/:id/alterar-status', [OrcamentosController, 'alterarStatus'])
      })
      .prefix('orcamentos')

    // Grupo de clientes
    router
      .group(() => {
        router.get('/', [ClientesController, 'index'])
        router.get('/:id', [ClientesController, 'show'])
        router.post('/', [ClientesController, 'store'])
        router.put('/:id', [ClientesController, 'update'])
        router.delete('/:id', [ClientesController, 'destroy'])
      })
      .prefix('clientes')

    // Grupo de propostas comerciais
    router
      .group(() => {
        router.get('/', [PropostasComerciaisController, 'index'])
        router.post('/', [PropostasComerciaisController, 'store'])
        router.get('/:id', [PropostasComerciaisController, 'show'])
        router.put('/:id', [PropostasComerciaisController, 'update'])
        router.delete('/:id', [PropostasComerciaisController, 'destroy'])

        // Ações específicas
        router.post('/:id/status', [PropostasComerciaisController, 'alterarStatus'])
        router.post('/:id/duplicar', [PropostasComerciaisController, 'duplicar'])

        // Gerenciamento de páginas
        router.post('/:id/paginas', [PropostasComerciaisController, 'adicionarPagina'])
        router.put('/:id/paginas/:paginaIndex', [PropostasComerciaisController, 'atualizarPagina'])
        router.delete('/:id/paginas/:paginaIndex', [PropostasComerciaisController, 'removerPagina'])
        router.get('/pesquisar', [PropostasComerciaisController, 'pesquisar'])
      })
      .prefix('propostas-comerciais')

    // Estatísticas gerais
    router.get('/estatisticas', [OrcamentosController, 'estatisticas'])
  })
  .use(middleware.auth())

// ========== ROTA 404 (Apenas para GET) ==========
router.get('*', async ({ response }) => {
  return response.status(404).json({
    error: 'Rota não encontrada',
  })
})
