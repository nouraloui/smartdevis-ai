import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssistantIaComponent } from './assistant-ia.component';

describe('AssistantIaComponent', () => {
  let component: AssistantIaComponent;
  let fixture: ComponentFixture<AssistantIaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssistantIaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AssistantIaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
