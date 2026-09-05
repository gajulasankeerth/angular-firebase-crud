import { Injectable, inject } from '@angular/core';
import { firstValueFrom, from, Observable } from 'rxjs';
import { DropboxTokenService } from './token.service';
import { PdfGeneratorService, PdfFormData } from './pdf-generator.service';

@Injectable({
  providedIn: 'root',
})
export class DropboxService {
  private readonly tokenService = inject(DropboxTokenService);
  private readonly pdfGenerator = inject(PdfGeneratorService);

  private isAuthFailure(status: number, body: unknown): boolean {
    if (status === 401) return true;
    const err = body as { error?: { '.tag'?: string }; error_summary?: string };
    const summary = err?.error_summary || '';
    return summary.includes('expired_access_token') || summary.includes('invalid_access_token');
  }

  private async ensureAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
      const existing = this.tokenService.getAccessToken();
      if (existing) return existing;
    }
    await firstValueFrom(this.tokenService.refreshAccessToken());
    const token = this.tokenService.getAccessToken();
    if (!token) throw new Error('No Dropbox access token after refresh');
    return token;
  }

  private async dropboxUpload(
    path: string,
    contents: Blob,
  ): Promise<{ result: { path_display: string } }> {
    const token = this.tokenService.getAccessToken();
    if (!token) throw new Error('No access token');

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path,
          mode: 'overwrite',
          autorename: true,
          mute: false,
          strict_conflict: false,
        }),
      },
      body: contents,
    });

    const data = await response.json();
    if (!response.ok) {
      throw { status: response.status, error: data };
    }
    return { result: data as { path_display: string } };
  }

  private async withTokenRetry<T>(fn: () => Promise<T>): Promise<T> {
    await this.ensureAccessToken(false);
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.status;
      const errBody = e?.error;
      if (this.isAuthFailure(status, errBody)) {
        await this.ensureAccessToken(true);
        return fn();
      }
      throw e;
    }
  }

  setAccessToken(token: string) {
    this.tokenService.setAccessToken(token);
  }

  async generatePDF(
    elementIdOrData: string | PdfFormData,
    filename: string,
    formData?: any,
  ): Promise<Blob> {
    const data: PdfFormData =
      typeof elementIdOrData === 'object' && elementIdOrData !== null
        ? (elementIdOrData as PdfFormData)
        : (formData as PdfFormData);

    return this.pdfGenerator.generatePdf(data, filename);
  }

  uploadToDropbox(
    pdfBlob: Blob,
    filename: string,
    folderPath: string = '/online-form-submissions',
  ): Observable<any> {
    const path = `${folderPath}/${filename}`;
    return from(this.withTokenRetry(() => this.dropboxUpload(path, pdfBlob)));
  }

  async generateAndUploadPDF(
    elementIdOrData: string | PdfFormData,
    customerName: string,
    formData?: any,
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${sanitizedName}_Quote_${timestamp}.pdf`;

      const data: PdfFormData =
        typeof elementIdOrData === 'object' && elementIdOrData !== null
          ? (elementIdOrData as PdfFormData)
          : (formData as PdfFormData);

      const pdfBlob = await this.pdfGenerator.generatePdf(data, filename);

      const uploadResult: any = await this.withTokenRetry(() =>
        this.dropboxUpload(`/online-form-submissions/${filename}`, pdfBlob),
      );

      console.log('File uploaded successfully:', uploadResult.result.path_display);

      return `https://www.dropbox.com/home${uploadResult.result.path_display}`;
    } catch (error: any) {
      console.error('Error generating and uploading PDF:', error);
      throw error;
    }
  }

  createShareLink(filePath: string): Observable<any> {
    return from(
      this.withTokenRetry(async () => {
        const token = this.tokenService.getAccessToken()!;
        const response = await fetch(
          'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: filePath }),
          },
        );
        const data = await response.json();
        if (!response.ok) throw { status: response.status, error: data };
        return data;
      }),
    );
  }

  listFiles(folderPath: string = '/online-form-submissions'): Observable<any> {
    return from(
      this.withTokenRetry(async () => {
        const token = this.tokenService.getAccessToken()!;
        const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: folderPath }),
        });
        const data = await response.json();
        if (!response.ok) throw { status: response.status, error: data };
        return data;
      }),
    );
  }
}
