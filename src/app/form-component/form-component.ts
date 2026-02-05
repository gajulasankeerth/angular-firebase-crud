import { Component, inject } from '@angular/core';
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
import { Contact } from '../interfaces/IContact';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-form-component',
  imports: [ReactiveFormsModule, RouterModule, CommonModule],
  templateUrl: './form-component.html',
  styleUrl: './form-component.scss',
})
export class FormComponent {
  private fb = inject(FormBuilder);
  private formService = inject(FormRequestService);
  private dropboxService = inject(DropboxService);

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
    });
    // Don't add empty area by default - user will add via modal
    this.areaForm = this.createArea();
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
    if (!this.consultationForm.valid) {
      this.isSubmitting = true;
      this.submitError = '';
      this.isUploadingToDropbox = true;

      // ✅ ALWAYS send plain JSON to Firebase
      const formData = {
        ...this.consultationForm.value,
        projectTypes: this.projectTypes.value,
        areas: this.areas.value, // 🔥 FIX IS HERE
      };
      console.log('Submitting form data:', formData);

      // Generate and upload PDF to Dropbox
      const customerName = `${formData.firstName} ${formData.lastName}`;
      this.dropboxService
        .generateAndUploadPDF('print-container', customerName)
        .then((dropboxUrl) => {
          this.dropboxLink = dropboxUrl;
          console.log('PDF uploaded to Dropbox:', dropboxUrl);

          // Show success toaster
          this.displaySuccessToaster('File saved successfully to Dropbox!');

          // Add Dropbox link to form data
          formData.dropboxLink = dropboxUrl;

          // Submit to Firebase
          return this.formService.create(formData);
        })
        .then(() => {
          this.submitSuccess = true;
          this.isSubmitting = false;
          this.isUploadingToDropbox = false;

          // reset form and clear areas
          this.consultationForm.reset();
          this.areas.clear();

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
      this.consultationForm.markAllAsTouched();
    }
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

  printForm() {
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
