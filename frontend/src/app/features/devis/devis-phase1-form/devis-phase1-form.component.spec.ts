import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevisPhase1FormComponent } from './devis-phase1-form.component';

describe('DevisPhase1FormComponent', () => {
  let component: DevisPhase1FormComponent;
  let fixture: ComponentFixture<DevisPhase1FormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevisPhase1FormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DevisPhase1FormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
