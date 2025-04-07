import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Cache  } from '@nestjs/cache-manager';
import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FxService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {}
  

  async getRate(from: string, to: string): Promise<number> {
    const key = `fx:${from}_${to}`;
    const cached = await this.cacheService.get<number>(key);

    if (cached) return cached;

    const rate = await this.fetchFromAPI(from, to);
    await this.cacheService.set(key, rate, 3600);

    return rate;
  }

  private async fetchFromAPI(from: string, to: string): Promise<number> {
    // Replace with your actual FX API logic
    const url = `https://v6.exchangerate-api.com/v6/${process.env.FX_API_KEY}/pair/${from}/${to}`;
    
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data as { conversion_rate: number }; // Type assertion

    return data?.conversion_rate;
  }
}
