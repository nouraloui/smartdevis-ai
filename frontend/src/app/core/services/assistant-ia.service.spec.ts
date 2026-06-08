import { TestBed } from '@angular/core/testing';

import { AssistantIaService } from './assistant-ia.service';

describe('AssistantIaService', () => {
  let service: AssistantIaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssistantIaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
