import { TestBed } from '@angular/core/testing';

import { N8nAgentService } from './n8n-agent.service';

describe('N8nAgentService', () => {
  let service: N8nAgentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(N8nAgentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
