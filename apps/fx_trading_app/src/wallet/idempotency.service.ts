import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IdempotencyRecord } from "./entities/idempotency.entities";
import { Repository } from "typeorm";

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly repo: Repository<IdempotencyRecord>,
  ) {}

  async checkOrSave<T>(key: string, computeFn: () => Promise<T>): Promise<T> {
    const record = await this.repo.findOneBy({ key });

    if (record) {
      return record.response;
    }

    const response = await computeFn();

    const saved = this.repo.create({ key, response });
    await this.repo.save(saved);

    return response;
  }
}
