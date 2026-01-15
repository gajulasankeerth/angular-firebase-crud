import { Routes } from '@angular/router';
import { Portal } from './portal/portal';
import { FormComponent } from './form-component/form-component';

export const routes: Routes = [
  {
    path: 'portal',
    component: Portal,
  },
  {
    path: '',
    component: FormComponent,
  },
];
