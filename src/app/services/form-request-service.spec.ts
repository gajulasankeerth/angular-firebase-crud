import { TestBed } from '@angular/core/testing';

import { FormRequestService } from './form-request-service';

describe('FormRequestService', () => {
  let service: FormRequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormRequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
