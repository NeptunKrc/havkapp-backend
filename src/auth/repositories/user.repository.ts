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

  // login select false özel güvenlik durumu yoğun !!!
  findForLogin(studentNo: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash') 
      .where('user.studentNo = :studentNo', { studentNo })
      .getOne();
  }
  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }
}
