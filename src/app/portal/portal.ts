import {
  Component,
  inject,
  OnInit,
  ViewEncapsulation,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FormRequestService } from '../services/form-request-service';
import { Contact } from '../interfaces/IContact';
import { Observable, map, Subscription } from 'rxjs';

@Component({
  selector: 'app-portal',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './portal.html',
  styleUrl: './portal.scss',
  encapsulation: ViewEncapsulation.None,
})
export class Portal implements OnInit, OnDestroy {
  private formService = inject(FormRequestService);
  private subscription?: Subscription;

  submissions$: Observable<Contact[]>;
  allSubmissions: Contact[] = [];
  filteredSubmissions: Contact[] = [];
  selectedSubmission: Contact | null = null;
  showModal: boolean = false;
  searchQuery: string = '';
  filterStatus: string = 'all';

  constructor() {
    this.submissions$ = this.formService.getAll().pipe(
      map((submissions: any[]) => {
        return submissions.map((sub) => ({
          ...sub,
          createdAt: sub.createdAt?.toDate ? sub.createdAt.toDate() : sub.createdAt,
          status: sub.status || 'PENDING_REVIEW',
        }));
      })
    );
  }

  ngOnInit() {
    this.subscription = this.submissions$.subscribe((submissions) => {
      this.allSubmissions = submissions;
      this.applyFilters();
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  onSearch(query: string) {
    this.searchQuery = query;
    this.applyFilters();
  }

  onFilterChange(status: string) {
    this.filterStatus = status;
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.allSubmissions];

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.firstName?.toLowerCase().includes(query) ||
          sub.lastName?.toLowerCase().includes(query) ||
          sub.email?.toLowerCase().includes(query) ||
          sub.phone?.includes(query) ||
          sub.streetAddress?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter((sub) => sub.status === this.filterStatus);
    }

    this.filteredSubmissions = filtered;

    // Close modal if selected submission is not in filtered list
    if (this.selectedSubmission && !filtered.find((s) => s.id === this.selectedSubmission?.id)) {
      this.closeModal();
    }
  }

  openModal(submission: Contact) {
    console.log('Opening modal for submission:', submission);
    this.selectedSubmission = submission;
    this.showModal = true;
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  closeModal() {
    this.showModal = false;
    this.selectedSubmission = null;
    document.body.style.overflow = ''; // Restore scrolling
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'NEW':
      case 'PENDING_REVIEW':
        return 'Pending Review';
      case 'IN_PROGRESS':
        return 'Under Review';
      case 'APPROVED':
        return 'Approved';
      case 'DONE':
        return 'Completed';
      default:
        return 'Pending Review';
    }
  }

  getStatusColor(status?: string): string {
    switch (status) {
      case 'NEW':
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-purple-100 text-purple-800';
      case 'DONE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  }

  updateStatus(status: 'PENDING_REVIEW' | 'IN_PROGRESS' | 'APPROVED' | 'DONE') {
    if (!this.selectedSubmission?.id) return;

    this.formService
      .updateStatus(this.selectedSubmission.id, status)
      .then(() => {
        // Update local state
        if (this.selectedSubmission) {
          this.selectedSubmission.status = status;
          // Update in allSubmissions array
          const index = this.allSubmissions.findIndex((s) => s.id === this.selectedSubmission?.id);
          if (index !== -1) {
            this.allSubmissions[index].status = status;
          }
          this.applyFilters();
        }
      })
      .catch((error) => {
        console.error('Error updating status:', error);
        alert('Failed to update status. Please try again.');
      });
  }

  deleteSubmission() {
    if (!this.selectedSubmission?.id) return;

    if (confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      this.formService
        .delete(this.selectedSubmission.id)
        .then(() => {
          // Remove from local arrays
          this.allSubmissions = this.allSubmissions.filter(
            (s) => s.id !== this.selectedSubmission?.id
          );
          this.applyFilters();
          this.closeModal();
        })
        .catch((error) => {
          console.error('Error deleting submission:', error);
          alert('Failed to delete submission. Please try again.');
        });
    }
  }

  takeScreenshot() {
    // This would typically use a library like html2canvas
    // For now, we'll just show an alert
    alert(
      'Screenshot functionality would be implemented here. You can use libraries like html2canvas to capture the modal content.'
    );
  }

  formatDate(date: Date | any): string {
    if (!date) return '';
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else if (date && typeof date.toDate === 'function') {
      d = date.toDate();
    } else if (date && date.seconds) {
      d = new Date(date.seconds * 1000);
    } else {
      d = new Date(date);
    }
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  getFullName(submission: Contact): string {
    const middle = submission.middleInitial ? ` ${submission.middleInitial}. ` : ' ';
    return `${submission.firstName}${middle}${submission.lastName}`;
  }

  isProjectTypeSelected(submission: Contact, type: string): boolean {
    return submission.projectTypes?.includes(type) || false;
  }

  getProjectTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      newCabinets: 'New Cabinets',
      preExistingCabinets: 'Pre-Existing Cabinets',
      remodel: 'Remodel',
      removeExistingCounters: 'Remove Existing Counters',
    };
    return labels[type] || type;
  }
}
