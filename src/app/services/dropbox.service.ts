import { Injectable, inject } from '@angular/core';
import { firstValueFrom, from, Observable } from 'rxjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DropboxTokenService } from './token.service';

interface Html2PdfOptions {
  margin?: number;
  filename?: string;
  image?: { type: string; quality: number };
  html2canvas?: { scale: number; useCORS: boolean };
  jsPDF?: { unit: string; format: string; orientation: string };
}

interface Html2Pdf {
  set(options: Html2PdfOptions): Html2Pdf;
  from(element: HTMLElement): Html2Pdf;
  outputPdf(type: string): Promise<Blob>;
}

declare const html2pdf: any;

@Injectable({
  providedIn: 'root',
})
export class DropboxService {
  private readonly tokenService = inject(DropboxTokenService);

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

  private readonly desktopRenderWidthPx = 1123;
  private readonly pdfMarginMm = 10;
  private readonly canvasScale = 2;

  async generatePDF(
    elementId: string,
    filename: string,
    formData?: Record<string, unknown>,
  ): Promise<Blob> {
    const sourceElement = document.getElementById(elementId);
    if (!sourceElement) {
      throw new Error(`PDF template not found: ${elementId}`);
    }

    const hiddenHost = this.createHiddenHost();
    const clonedElement = sourceElement.cloneNode(true) as HTMLElement;
    clonedElement.id = `${elementId}-pdf-clone`;

    if (formData) {
      this.populateTemplate(clonedElement, formData);
    }

    this.syncFormValues(sourceElement, clonedElement);
    hiddenHost.appendChild(clonedElement);
    document.body.appendChild(hiddenHost);

    try {
      await this.prepareClone(sourceElement, clonedElement);

      const canvas = await html2canvas(clonedElement, {
        scale: this.canvasScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: this.getRenderWidth(sourceElement),
        width: clonedElement.scrollWidth,
        height: clonedElement.scrollHeight,
      });

      return this.buildPdfFromCanvas(canvas, filename);
    } finally {
      hiddenHost.remove();
    }
  }

  private createHiddenHost(): HTMLDivElement {
    const hiddenHost = document.createElement('div');
    hiddenHost.style.position = 'fixed';
    hiddenHost.style.left = '-100000px';
    hiddenHost.style.top = '0';
    hiddenHost.style.width = `${this.desktopRenderWidthPx}px`;
    hiddenHost.style.pointerEvents = 'none';
    hiddenHost.style.zIndex = '-1';
    hiddenHost.style.background = '#ffffff';
    hiddenHost.style.overflow = 'hidden';
    hiddenHost.setAttribute('aria-hidden', 'true');
    return hiddenHost;
  }

  private async prepareClone(
    sourceElement: HTMLElement,
    clonedElement: HTMLElement,
  ): Promise<void> {
    const renderWidth = this.getRenderWidth(sourceElement);

    clonedElement.style.width = `${renderWidth}px`;
    clonedElement.style.minWidth = `${renderWidth}px`;
    clonedElement.style.maxWidth = `${renderWidth}px`;
    clonedElement.style.margin = '0';
    clonedElement.style.transform = 'none';

    this.copyComputedStyles(sourceElement, clonedElement);
    await this.waitForAssets(clonedElement);
    await this.waitForLayout();
  }

  private getRenderWidth(element: HTMLElement): number {
    return Math.max(
      this.desktopRenderWidthPx,
      Math.ceil(
        element.scrollWidth || element.getBoundingClientRect().width || this.desktopRenderWidthPx,
      ),
    );
  }

  private copyComputedStyles(sourceNode: Element, clonedNode: Element): void {
    if (!this.hasInlineStyleTarget(sourceNode) || !this.hasInlineStyleTarget(clonedNode)) {
      return;
    }

    const computedStyle = window.getComputedStyle(sourceNode);
    for (const propertyName of Array.from(computedStyle)) {
      clonedNode.style.setProperty(
        propertyName,
        computedStyle.getPropertyValue(propertyName),
        computedStyle.getPropertyPriority(propertyName),
      );
    }

    if (sourceNode instanceof HTMLInputElement) {
      clonedNode.setAttribute('value', sourceNode.value);
    }

    if (sourceNode instanceof HTMLTextAreaElement) {
      clonedNode.textContent = sourceNode.value;
    }

    if (sourceNode instanceof HTMLSelectElement && clonedNode instanceof HTMLSelectElement) {
      clonedNode.value = sourceNode.value;
    }

    if (sourceNode instanceof HTMLCanvasElement && clonedNode instanceof HTMLCanvasElement) {
      const context = clonedNode.getContext('2d');
      context?.drawImage(sourceNode, 0, 0);
    }

    const sourceChildren = Array.from(sourceNode.children);
    const clonedChildren = Array.from(clonedNode.children);

    for (let index = 0; index < sourceChildren.length; index += 1) {
      const sourceChild = sourceChildren[index];
      const clonedChild = clonedChildren[index];

      if (!sourceChild || !clonedChild) {
        continue;
      }

      this.copyComputedStyles(sourceChild, clonedChild);
    }
  }

  private hasInlineStyleTarget(node: Element): node is Element & ElementCSSInlineStyle {
    return 'style' in node;
  }

  private syncFormValues(sourceElement: HTMLElement, clonedElement: HTMLElement): void {
    const sourceInputs = sourceElement.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >('input, textarea, select');
    const clonedInputs = clonedElement.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >('input, textarea, select');

    sourceInputs.forEach((sourceInput, index) => {
      const clonedInput = clonedInputs[index];
      if (!clonedInput) {
        return;
      }

      if (sourceInput instanceof HTMLInputElement && clonedInput instanceof HTMLInputElement) {
        clonedInput.value = sourceInput.value;
        clonedInput.checked = sourceInput.checked;
      }

      if (
        sourceInput instanceof HTMLTextAreaElement &&
        clonedInput instanceof HTMLTextAreaElement
      ) {
        clonedInput.value = sourceInput.value;
      }

      if (sourceInput instanceof HTMLSelectElement && clonedInput instanceof HTMLSelectElement) {
        clonedInput.value = sourceInput.value;
      }
    });
  }

  private async waitForAssets(element: HTMLElement): Promise<void> {
    const fontsReady =
      'fonts' in document ? (document.fonts.ready as Promise<FontFaceSet>) : Promise.resolve();
    const images = Array.from(element.querySelectorAll<HTMLImageElement>('img'));

    await Promise.all([
      fontsReady,
      ...images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          }),
      ),
    ]);
  }

  private async waitForLayout(): Promise<void> {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  private buildPdfFromCanvas(canvas: HTMLCanvasElement, filename: string): Blob {
    const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    pdf.setProperties({
      title: filename,
    });

    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const usableWidthMm = pageWidthMm - this.pdfMarginMm * 2;
    const usableHeightMm = pageHeightMm - this.pdfMarginMm * 2;
    const widthScale = usableWidthMm / canvas.width;
    const heightScale = usableHeightMm / canvas.height;
    const fitScale = Math.min(widthScale, heightScale);
    const renderedWidthMm = canvas.width * fitScale;
    const renderedHeightMm = canvas.height * fitScale;
    const offsetX = this.pdfMarginMm + (usableWidthMm - renderedWidthMm) / 2;
    const offsetY = this.pdfMarginMm + (usableHeightMm - renderedHeightMm) / 2;

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      offsetX,
      offsetY,
      renderedWidthMm,
      renderedHeightMm,
      undefined,
      'FAST',
    );

    return pdf.output('blob');
  }

  private populateTemplate(template: HTMLElement, formData: Record<string, unknown>): void {
    const fieldElements = template.querySelectorAll<HTMLElement>('[data-field]');
    fieldElements.forEach((element) => {
      const fieldName = element.dataset['field'];
      if (!fieldName) {
        return;
      }

      const value = formData[fieldName];
      element.textContent = value == null || value === '' ? '-' : String(value);
    });

    const dateElement = template.querySelector<HTMLElement>('#pdf-date');
    if (dateElement) {
      dateElement.textContent = new Date().toLocaleDateString();
    }

    const memoElement = template.querySelector<HTMLElement>('#pdf-client-memo');
    if (memoElement) {
      const memo = typeof formData['memo'] === 'string' ? formData['memo'].trim() : '';
      memoElement.textContent = memo || 'No notes provided.';
    }
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
    elementId: string,
    customerName: string,
    formData?: any,
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${sanitizedName}_Quote_${timestamp}.pdf`;

      const pdfBlob = await this.generatePDF(elementId, filename, formData);

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
