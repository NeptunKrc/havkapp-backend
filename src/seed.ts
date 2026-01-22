import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Club } from './clubs/entities/club.entity';
import { User, MembershipStatus } from './auth/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Seeder');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    logger.log('Starting seed...');

    const clubRepo = queryRunner.manager.getRepository(Club);
    const userRepo = queryRunner.manager.getRepository(User);

    // 1. Create Club
    let club = await clubRepo.findOne({ where: { name: 'Test Club' } });
    if (!club) {
      logger.log('Creating Test Club...');
      club = clubRepo.create({
        name: 'Test Club',
      });
      await clubRepo.save(club);
    } else {
      logger.log('Test Club already exists.');
    }

    // 2. Create User
    const studentNo = '12345';
    let user = await userRepo.findOne({ where: { studentNo } });

    if (!user) {
      logger.log('Creating Test User...');
      const passwordHash = await bcrypt.hash('password123', 10);
      user = userRepo.create({
        studentNo,
        passwordHash,
        clubId: club.id,
        membershipStatus: MembershipStatus.ACTIVE,
      });
      await userRepo.save(user);
      logger.log(`User created: studentNo=${studentNo}, password=password123`);
    } else {
      logger.log('Test User already exists.');
    }

    await queryRunner.commitTransaction();
    logger.log('Seeding complete!');
  } catch (err) {
    logger.error('Seeding failed', err);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
    await app.close();
  }
}

bootstrap();
