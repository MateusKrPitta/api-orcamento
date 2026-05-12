// database/seeders/user_seeder.ts
import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Write your database queries inside the run method

    // Deletar usuários existentes (opcional)
    await User.truncate(true)

    // Criar usuários de teste
    await User.createMany([
      {
        nome: 'Mateus',
        email: 'mateus@email.com',
        password: '123456',
      },
      {
        nome: 'Luan',
        email: 'luan@email.com',
        password: '123456',
      },
      {
        nome: 'Renato',
        email: 'renato@email.com',
        password: '123456',
      },
    ])
  }
}
