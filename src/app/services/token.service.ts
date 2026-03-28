import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DropboxTokenService {
  private accessToken: string | null = null;
  private refreshToken = 'uMVFWIyoGbIAAAAAAAAAAR68Iu3zmrCYAKBnpg8Oodby8kSnwtS-EX62TS8Swf6b';
  private clientId = 'zshzkdj6kvu8n5z';
  private clientSecret = 'bn1k00781pb5gd0';

  constructor(private http: HttpClient) {}

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  refreshAccessToken(): Observable<string> {
    const refreshToken = this.refreshToken.trim();
    const body = new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('refresh_token', refreshToken)
      .set('client_id', this.clientId)
      .set('client_secret', this.clientSecret);

    return this.http
      .post<any>('https://api.dropboxapi.com/oauth2/token', body.toString(), {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
      .pipe(
        map((res) => {
          this.setAccessToken(res.access_token);
          return res.access_token;
        }),
      );
  }
}
