import { TestBed } from '@angular/core/testing';

import { IaNlpService } from './ia-nlp.service';

describe('IaNlpService', () => {
  let service: IaNlpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IaNlpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
