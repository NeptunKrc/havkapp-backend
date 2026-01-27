import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';

@Injectable()
export class RoleRepository {
    constructor(
        @InjectRepository(Role)
        private readonly repo: Repository<Role>,
    ) { }

    async create(role: Partial<Role>): Promise<Role> {
        const newRole = this.repo.create(role);
        return this.repo.save(newRole);
    }

    async save(role: Role): Promise<Role> {
        return this.repo.save(role);
    }

    async findByClubIdAndName(clubId: string, name: string): Promise<Role | null> {
        return this.repo.findOne({ where: { clubId, name } });
    }

    async findOneWithPermissions(id: string): Promise<Role | null> {
        return this.repo.findOne({
            where: { id },
            relations: ['permissions'],
        });
    }

    async findAllByClub(clubId: string): Promise<Role[]> {
        return this.repo.find({
            where: { clubId },
            relations: ['permissions'],
        });
    }

    async delete(id: string): Promise<number | undefined> {
        const result = await this.repo.delete(id);
        return result.affected ?? undefined;
    }
}
