import { ComponentFixture, TestBed } from '@angular/core/testing';

import { N8nAgentComponent } from './n8n-agent.component';

describe('N8nAgentComponent', () => {
  let component: N8nAgentComponent;
  let fixture: ComponentFixture<N8nAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [N8nAgentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(N8nAgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
