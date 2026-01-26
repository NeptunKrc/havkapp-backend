import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  // Explicitly select passwordHash since it's excluded by default for security
  async findForLogin(studentNo: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.studentNo = :studentNo', { studentNo })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
    });
  }
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.repo.update(userId, { passwordHash });
  }

  async clearForcePasswordChange(userId: string): Promise<void> {
    await this.repo.update(userId, { forcePasswordChange: false });
  }
}
