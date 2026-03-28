import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AreaItem {
  areaType: string;
  colorMaterial: string;
  customColorMaterial?: string;
  edgeStyle: string;
  sinkType: string;
  backsplashHeight: string;
  faucetType: string;
  stoveType: string;
}

export interface PdfFormData {
  firstName: string;
  lastName: string;
  middleInitial?: string;
  phone: string;
  secondaryPhone?: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  lotNumber?: string;
  subdivision?: string;
  contractorBuilder?: string;
  projectTypes: string[];
  areas: AreaItem[];
  clientMemo?: string;
}

@Component({
  selector: 'app-pdf-template',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-template.component.html',
  styleUrls: ['./pdf-template.component.scss'],
})
export class PdfTemplateComponent implements OnChanges {
  @Input() formData: PdfFormData | null = null;

  today: string = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  projectTypeOptions = [
    {
      key: 'newCabinets',
      label: 'New Cabinets',
      sub: 'Brand new cabinet installation',
    },
    {
      key: 'preExistingCabinets',
      label: 'Pre-Existing Cabinets',
      sub: 'Working with current cabinets',
    },
    {
      key: 'remodel',
      label: 'Remodel',
      sub: 'Updating existing kitchen',
    },
    {
      key: 'removeExistingCounters',
      label: 'Remove Existing Counters',
      sub: 'Demo of old countertops needed',
    },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    // React to formData input changes if needed
  }

  isProjectTypeSelected(key: string): boolean {
    return this.formData?.projectTypes?.includes(key) ?? false;
  }

  getMaterial(area: AreaItem): string {
    return area.colorMaterial === 'Other'
      ? area.customColorMaterial || 'Other'
      : area.colorMaterial || '';
  }

  getBadgeClass(areaType: string): string {
    return areaType?.toLowerCase() === 'kitchen' ? 'badge-kitchen' : 'badge-bathroom';
  }

  get hasAreas(): boolean {
    return (this.formData?.areas?.length ?? 0) > 0;
  }

  get memo(): string {
    return this.formData?.clientMemo?.trim() || 'No notes provided.';
  }
}
