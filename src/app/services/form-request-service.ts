import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
  collectionData,
  doc,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export type JobStatus = 'NEW' | 'PENDING_REVIEW' | 'IN_PROGRESS' | 'APPROVED' | 'DONE';

@Injectable({ providedIn: 'root' })
export class FormRequestService {
  private firestore = inject(Firestore);
  private ordersRef = collection(this.firestore, 'jobOrders');

  // ✅ READ: get all job orders (for portal)
  getAll(): Observable<any[]> {
    return collectionData(this.ordersRef, {
      idField: 'id',
    });
  }

  // ✅ CREATE: save new job order (from form)
  create(order: any) {
    return addDoc(this.ordersRef, {
      ...order,
      status: 'PENDING_REVIEW',
      createdAt: serverTimestamp(),
    });
  }

  // ✅ UPDATE: update job status (from portal)
  updateStatus(orderId: string, status: JobStatus) {
    const orderDocRef = doc(this.firestore, 'jobOrders', orderId);
    return updateDoc(orderDocRef, { status });
  }

  // ✅ DELETE: delete job order
  delete(orderId: string) {
    const orderDocRef = doc(this.firestore, 'jobOrders', orderId);
    return deleteDoc(orderDocRef);
  }
}
