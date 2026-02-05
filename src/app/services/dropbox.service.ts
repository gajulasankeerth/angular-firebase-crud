import { Injectable } from '@angular/core';
import { Dropbox } from 'dropbox';
import { from, Observable } from 'rxjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Type declarations for html2pdf
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
  private dropbox: Dropbox;
  private accessToken: string =
    'sl.u.AGRDWUATIbAnVjCp5jW8oLcs2C87ANdBts-WTybAysToAjc3AVrt-9lZfl6SO9QiObHPfSB9aFuYNNGNKZ9VCjezcV411xw0I1nX8-CgapgQZdKA1gG0Sg16Rt0sWJ844ZyuEVazTNoJhc8O_Z1UBFOcyUamK357jIePvqxxC3Qy-HA2INCIMfPQUCvxKku1PpvXiW5iafIqCEcrwaDDVbbAEjTaAc_21DwSYeeQ5VTstl77BI6aHOUexwH2Zquvaw1oWF-dO-YnWZyUsIv4qHIJpPhdDkAYhELQ0SnyjpKkTDrnaD8xO0kX_O8vw6MWPsYwKRWo2f7EawUQdUgLkr3ItIwodgpe_XQIhL0lqVxMvmGZDIRmoxaOmTeZk3ni0lYfepFFDhyVzUzkvqUAytcL9S4EJkXhFFd5wu45Cezf3c61vOeLQ1bQj2LlO5COvmu2L-1e0AGegDNvCDa7hD8NsfYhBRQKBx9cS6AnCgGaou-iBFBdL9IpqeyDKF5A1B9prmmdXRVpteIhUeRw9BrzeHG88ocSoEhwl8DFKBq9YPTMPAsfcvqy3o97PmLkTlztYoT9mFDesBIw3qVrXwXARmXjcocIGopTJQF8XDspRbbPAhJpjDgQ23RHo7he0jsyj1MeBRea58rGjKsgj-saal5BCNuQFLIDAyYynPfx2phklfxy8BJMroPlluextCle5fn-ydtsPJEgTG7gVcdziru9No9wS8IesKEb7OYbm1E1qBEAMNErQXzPf0yPdPwwhRKTC3mO33e3K3ULk9tvmnIe3Rno326Vt5pVGVcoWWaJE_usPnvjiVh2_m4u0QP9BBXQjNAwaiMNW3Fj3pf0txL44P3HVaJy9V3tlvUIJSNZH-h3ARx9J4w_onRocDvgATngqn7OYudFzf_PM7tX73_FsrxpK14R5h55iENTtlwH8O5F93zhg5jackL2EVwNrwRdD9Ws1PjIk4602LnOaCLmPWh7kt_0rFHz6MCZnQ5u9mzn4idNLDPMnzTXJhujVc0T8Z0jXCQ3Pgktgoz2F2v7GcaevCEjx2gS2_Pf9617ZWLHVKErcQLJENIeVjRh7Rm2gthqypm7874JpQQO1BJxv8FSVg6xlWWLa_p1ivPz7GqatLmkLnVst9Q2iyEgU1bbLm9-ed0-W2VvMz9hmwAaVifiLE3Jt53cG-LNbzYGRu5vxHRK_SUBFnpsvv2Y-gT8SWXeQ8_BAxCJ2Z02rmRBDIzYimWpB1-uqfAhCEbfvme06at4cqM7kthC56i42emO5N1Fabo_dWL9tjxt';

  constructor() {
    this.dropbox = new Dropbox({ accessToken: this.accessToken });
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    this.dropbox = new Dropbox({ accessToken: this.accessToken });
  }

  async generatePDF(elementId: string, filename: string): Promise<Blob> {
    const element = document.getElementById(elementId);
    if (!element) throw new Error('Element not found');

    // 🔥 Select the important table
    const table = element.querySelector('#special-table') as HTMLElement;

    let originalWidth = '';
    let originalOverflow = '';

    if (table) {
      originalWidth = table.style.width;
      originalOverflow = table.style.overflow;

      // Make sure table expands fully (no scroll inside table)
      table.style.width = '100%';
      table.style.overflow = 'visible';
    }

    // Expand scroll container temporarily
    const originalHeight = element.style.height;
    const originalOverflowY = element.style.overflowY;

    element.style.height = 'auto';
    element.style.overflowY = 'visible';

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Capture full content height
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Additional pages
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // 🔥 Restore original layout
    element.style.height = originalHeight;
    element.style.overflowY = originalOverflowY;

    if (table) {
      table.style.width = originalWidth;
      table.style.overflow = originalOverflow;
    }

    return pdf.output('blob');
  }

  uploadToDropbox(
    pdfBlob: Blob,
    filename: string,
    folderPath: string = '/submissions',
  ): Observable<any> {
    const path = `${folderPath}/${filename}`;

    return from(
      this.dropbox.filesUpload({
        path: path,
        contents: pdfBlob,
        mode: { '.tag': 'overwrite' } as any,
        autorename: true,
      }),
    );
  }

  async generateAndUploadPDF(elementId: string, customerName: string): Promise<string> {
    try {
      // Generate timestamp and filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `LussoGranite_Form_${sanitizedName}_${timestamp}.pdf`;

      // Generate PDF from the print-container (which has all form content)
      const pdfBlob = await this.generatePDF('print-container', filename);

      // Upload to Dropbox
      const uploadResult = await this.uploadToDropbox(pdfBlob, filename).toPromise();

      console.log('File uploaded successfully:', uploadResult.result.path_display);

      // Return the Dropbox file URL (direct link to file)
      // Format: https://www.dropbox.com/home/path/to/file
      const dropboxUrl = `https://www.dropbox.com/home${uploadResult.result.path_display}`;

      return dropboxUrl;
    } catch (error: any) {
      console.error('Error generating and uploading PDF:', error);
      throw error;
    }
  }

  createShareLink(filePath: string): Observable<any> {
    return from(
      this.dropbox.sharingCreateSharedLink({
        path: filePath,
      }),
    );
  }

  listFiles(folderPath: string = '/submissions'): Observable<any> {
    return from(this.dropbox.filesListFolder({ path: folderPath }));
  }
}
