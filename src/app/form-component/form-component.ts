import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { FormRequestService } from '../services/form-request-service';
import { DropboxService } from '../services/dropbox.service';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PdfTemplateComponent } from '../components/pdf-template/pdf-template.component';

@Component({
  selector: 'app-form-component',
  imports: [ReactiveFormsModule, RouterModule, CommonModule, PdfTemplateComponent],
  templateUrl: './form-component.html',
  styleUrl: './form-component.scss',
})
export class FormComponent implements AfterViewInit {
  isFormError = false;
  showValidationError = false;
  private fb = inject(FormBuilder);
  private formService = inject(FormRequestService);
  private dropboxService = inject(DropboxService);

  /** Shown only in print / PDF snapshot header */
  readonly printGeneratedAt = new Date();

  consultationForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';
  showAreaModal = false;
  editingAreaIndex: number | null = null;
  areaForm: FormGroup;
  dropboxLink = '';
  isUploadingToDropbox = false;
  showSuccessToaster = false;
  successToasterMessage = '';

  // Signature Pad
  @ViewChild('signatureCanvas') signatureCanvasRef!: ElementRef<HTMLCanvasElement>;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  isDrawing = false;
  hasSignature = false;
  signatureDataUrl = '';
  signatureDate: Date | null = null;

  // Modal properties
  predefinedColors = [
    'Absolute Black Granite',
    'White Carrara Marble',
    'Calacatta Gold Marble',
    'Ubatuba Gray Granite',
    'Santa Cecilia Beige Granite',
    'Giallo Veneziano Brown Granite',
    'Blue Bahia Granite',
    'Verde Butterfly Green Granite',
    'Rosa Beta Red Granite',
    'White Quartz',
    'Gray Quartz',
    'Beige Quartz',
    'Black Quartz',
  ];

  constructor() {
    this.consultationForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      middleInitial: [''],
      phone: ['', [Validators.required]],
      secondaryPhone: [''],
      email: ['', [Validators.required, Validators.email]],
      streetAddress: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      zipCode: ['', [Validators.required]],
      lotNumber: [''],
      subdivision: [''],
      contractorBuilder: [''],
      // ✅ REQUIRED: at least 1 project type
      projectTypes: this.fb.array([], FormComponent.atLeastOneItem),
      areas: this.fb.array([], FormComponent.atLeastOneAreaFilled),
      clientMemo: [''],
      termsAccepted: [false],
      signature: [''],
    });
    // Don't add empty area by default - user will add via modal
    this.areaForm = this.createArea();
  }

  ngAfterViewInit(): void {
    // Delay canvas initialization to ensure view layout is fully rendered
    setTimeout(() => {
      this.initSignatureCanvas();
    }, 150);
  }

  initSignatureCanvas(): void {
    if (!this.signatureCanvasRef) return;
    const canvas = this.signatureCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    this.canvasCtx = canvas.getContext('2d');
    if (this.canvasCtx) {
      this.canvasCtx.scale(dpr, dpr);
      this.canvasCtx.strokeStyle = '#1c1917';
      this.canvasCtx.lineWidth = 2.5;
      this.canvasCtx.lineCap = 'round';
      this.canvasCtx.lineJoin = 'round';
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.hasSignature && this.signatureDataUrl) {
      const savedData = this.signatureDataUrl;
      const img = new Image();
      img.onload = () => {
        this.initSignatureCanvas();
        if (this.canvasCtx && this.signatureCanvasRef) {
          const rect = this.signatureCanvasRef.nativeElement.getBoundingClientRect();
          this.canvasCtx.drawImage(img, 0, 0, rect.width, rect.height);
          this.hasSignature = true;
          this.signatureDataUrl = savedData;
        }
      };
      img.src = savedData;
    } else {
      this.initSignatureCanvas();
    }
  }

  startDrawing(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    if (!this.canvasCtx || !this.signatureCanvasRef) return;
    this.isDrawing = true;
    const coords = this.getCanvasCoordinates(event);
    this.canvasCtx.beginPath();
    this.canvasCtx.moveTo(coords.x, coords.y);
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing || !this.canvasCtx) return;
    event.preventDefault();
    const coords = this.getCanvasCoordinates(event);
    this.canvasCtx.lineTo(coords.x, coords.y);
    this.canvasCtx.stroke();
  }

  stopDrawing(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.signatureCanvasRef) {
      this.hasSignature = true;
      this.signatureDate = new Date();
      this.signatureDataUrl = this.signatureCanvasRef.nativeElement.toDataURL('image/png');
      this.consultationForm.patchValue({ signature: this.signatureDataUrl });
    }
  }

  clearSignature(): void {
    if (!this.signatureCanvasRef || !this.canvasCtx) return;
    const canvas = this.signatureCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.canvasCtx.clearRect(0, 0, rect.width, rect.height);
    this.hasSignature = false;
    this.signatureDataUrl = '';
    this.signatureDate = null;
    this.consultationForm.patchValue({ signature: '' });
  }

  private getCanvasCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.signatureCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  getPdfFormData(): any {
    const sigDate = this.signatureDate || new Date();
    const formattedDate = sigDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return {
      ...this.consultationForm.getRawValue(),
      projectTypes: this.projectTypes.value,
      areas: this.areas.value,
      signature: this.signatureDataUrl,
      signatureDate: formattedDate,
    };
  }

  onProjectTypeChange(type: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const projectTypesArray = this.projectTypes;

    if (checked) {
      // prevent duplicates
      if (!projectTypesArray.value.includes(type)) {
        projectTypesArray.push(this.fb.control(type));
      }
    } else {
      const index = projectTypesArray.controls.findIndex((ctrl) => ctrl.value === type);
      if (index !== -1) {
        projectTypesArray.removeAt(index);
      }
    }
  }

  isProjectTypeSelected(type: string): boolean {
    const projectTypes = this.consultationForm.get('projectTypes')?.value || [];
    return projectTypes.includes(type);
  }

  onSubmit() {
    if (this.consultationForm.valid) {
      this.isSubmitting = true;
      this.submitError = '';
      this.isUploadingToDropbox = true;

      // ✅ ALWAYS send plain JSON to Firebase
      const formData = {
        ...this.consultationForm.value,
        projectTypes: this.projectTypes.value,
        areas: this.areas.value, // 🔥 FIX IS HERE
        signature: this.signatureDataUrl,
        signatureDate: (this.signatureDate || new Date()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      };

      // Generate and upload PDF to Dropbox
      const customerName = `${formData.firstName} ${formData.lastName}`;
      this.dropboxService
        .generateAndUploadPDF('pdf-print-template', customerName)
        .then((dropboxUrl) => {
          this.dropboxLink = dropboxUrl;

          // Show success toaster
          this.displaySuccessToaster('File saved successfully to Dropbox!');

          // Add Dropbox link to form data
          formData.dropboxLink = dropboxUrl;

          // Submit to Firebase
          return true;
        })
        .then(() => {
          this.submitSuccess = true;
          this.isSubmitting = false;
          this.isUploadingToDropbox = false;

          // reset form, signature, and clear areas
          this.consultationForm.reset();
          this.areas.clear();
          this.clearSignature();

          setTimeout(() => {
            this.submitSuccess = false;
            this.dropboxLink = '';
          }, 5000);
        })
        .catch((error) => {
          this.submitError = 'Failed to submit form. Please try again.';
          this.isSubmitting = false;
          this.isUploadingToDropbox = false;
          console.error('Form submission error:', error);
        });
    } else {
      // Show validation error message
      this.showValidationError = true;
      this.consultationForm.markAllAsTouched();

      // Smooth scroll to first invalid field
      setTimeout(() => {
        const firstInvalid = document.querySelector(
          '.has-error, input.ng-invalid, select.ng-invalid, textarea.ng-invalid, .form-field-error'
        );
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (firstInvalid as HTMLElement).focus?.();
        }
      }, 80);

      // Auto-hide validation error after 6 seconds
      setTimeout(() => {
        this.showValidationError = false;
      }, 6000);
    }
  }

  dismissValidationError() {
    this.showValidationError = false;
  }

  get areas(): FormArray {
    return this.consultationForm.get('areas') as FormArray;
  }

  trackByIndex(index: number) {
    return index;
  }

  displaySuccessToaster(message: string) {
    this.successToasterMessage = message;
    this.showSuccessToaster = true;

    // Hide toaster after 3 seconds
    setTimeout(() => {
      this.showSuccessToaster = false;
    }, 3000);
  }

  private createArea(): FormGroup {
    return this.fb.group({
      areaType: ['', Validators.required],
      areaName: [''],
      colorMaterial: [''],
      customColorMaterial: [''],
      edgeStyle: [''],
      sinkType: [''],
      backsplashHeight: [''],
      faucetType: [''],
      stoveType: [''],
    });
  }

  printForm(): void {
    window.print();
  }

  openAreaModal(index?: number) {
    if (index !== undefined) {
      // Editing existing area
      this.editingAreaIndex = index;
      const area = this.areas.at(index);
      const areaValue = area.value;
      if (areaValue.colorMaterial && !this.predefinedColors.includes(areaValue.colorMaterial)) {
        // Custom color, set to Other and populate custom field
        this.areaForm.patchValue({
          ...areaValue,
          colorMaterial: 'Other',
          customColorMaterial: areaValue.colorMaterial,
        });
      } else {
        this.areaForm.patchValue(areaValue);
      }
    } else {
      // Adding new area
      this.editingAreaIndex = null;
      this.areaForm = this.createArea();
    }
    this.showAreaModal = true;
  }

  closeAreaModal() {
    this.showAreaModal = false;
    this.editingAreaIndex = null;
    this.areaForm = this.createArea();
  }

  saveArea() {
    if (this.areaForm.invalid) {
      this.areaForm.markAllAsTouched(); // show errors
      return;
    }
    const formValue = this.areaForm.value;
    if (formValue.colorMaterial === 'Other') {
      formValue.colorMaterial = formValue.customColorMaterial || 'Other';
    }
    if (this.editingAreaIndex !== null) {
      // Update existing area
      this.areas.at(this.editingAreaIndex).patchValue(formValue);
    } else {
      // Add new area - use FormGroup instead of spread operator to maintain form structure
      this.areas.push(this.fb.group(formValue));
    }
    this.closeAreaModal();
  }

  removeArea(index: number) {
    this.areas.removeAt(index);
  }

  getAreaValue(index: number, field: string): string {
    const area = this.areas.at(index);
    if (!area) return '-';
    if (field === 'colorMaterial') {
      const color = area.get('colorMaterial')?.value;
      if (color === 'Other') {
        const custom = area.get('customColorMaterial')?.value;
        return custom ? custom : 'Other';
      }
      return color || '-';
    }
    return area.get(field)?.value || '-';
  }

  hasAnyAreaData(): boolean {
    return (
      this.areas.length > 0 &&
      this.areas.value.some((area: any) =>
        Object.values(area).some((v) => v !== null && v !== undefined && v !== ''),
      )
    );
  }

  getFieldError(fieldName: string): string {
    const field = this.consultationForm.get(fieldName);
    if (field?.hasError('required') && field?.touched) {
      return 'Please fill in this field.';
    }
    if (field?.hasError('email') && field?.touched) {
      return 'Please enter a valid email address.';
    }
    return '';
  }
  getFieldErrorForPopup(fieldName: string): string {
    const field = this.areaForm.get(fieldName);
    if (field?.hasError('required') && field?.touched) {
      return 'Please fill in this field.';
    }
    return '';
  }
  get projectTypes(): FormArray {
    return this.consultationForm.get('projectTypes') as FormArray;
  }

  toggleProjectType(type: string, checked: boolean) {
    if (checked) {
      this.projectTypes.push(this.fb.control(type));
    } else {
      const index = this.projectTypes.controls.findIndex((c) => c.value === type);
      if (index !== -1) {
        this.projectTypes.removeAt(index);
      }
    }
  }
  static atLeastOneItem(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    return Array.isArray(value) && value.length > 0 ? null : { required: true };
  }
  static atLeastOneAreaFilled(control: AbstractControl): ValidationErrors | null {
    const areas = control.value as any[];

    if (!Array.isArray(areas) || areas.length === 0) {
      return { required: true };
    }

    const hasAnyValue = areas.some((area) =>
      Object.values(area).some((v) => v !== null && v !== undefined && v !== ''),
    );

    return hasAnyValue ? null : { required: true };
  }
}
