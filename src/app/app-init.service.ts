import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DropboxTokenService } from './services/token.service';

@Injectable({
  providedIn: 'root',
})
export class AppInitService {
  constructor(private tokenService: DropboxTokenService) {}

  async init(): Promise<void> {
    try {
      const token = await firstValueFrom(this.tokenService.refreshAccessToken());
      this.tokenService.setAccessToken(token);
    } catch {
      try {
        const token = await firstValueFrom(this.tokenService.refreshAccessToken());
        this.tokenService.setAccessToken(token);
      } catch {
        console.warn('Token init failed, interceptor will handle later');
      }
    }
  }
}
