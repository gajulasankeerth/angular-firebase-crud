import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, throwError, switchMap, filter, take } from 'rxjs';
import { DropboxTokenService } from './token.service';

@Injectable()
export class DropboxInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private tokenService: DropboxTokenService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Apply only for Dropbox APIs
    if (!req.url.includes('dropboxapi.com')) {
      return next.handle(req);
    }

    const token = this.tokenService.getAccessToken();

    const authReq = token ? this.addToken(req, token) : req;

    return next.handle(authReq).pipe(
      catchError((error) => {
        if (error.status === 401) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      }),
    );
  }

  private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshSubject.next(null);

      return this.tokenService.refreshAccessToken().pipe(
        switchMap((newToken: string) => {
          this.isRefreshing = false;
          this.tokenService.setAccessToken(newToken);
          this.refreshSubject.next(newToken);

          return next.handle(this.addToken(req, newToken));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          return throwError(() => err);
        }),
      );
    }

    return this.refreshSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => next.handle(this.addToken(req, token!))),
    );
  }
}
