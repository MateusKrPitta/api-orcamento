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
        fullName: 'Mateus',
        email: 'mateus@email.com',
        password: '123456',
      },
      {
        fullName: 'Luan',
        email: 'luan@email.com',
        password: '123456',
      },
      {
        fullName: 'Renato',
        email: 'renato@email.com',
        password: '123456',
      },
    ])
  }
}
