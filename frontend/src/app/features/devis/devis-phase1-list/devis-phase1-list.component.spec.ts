import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevisPhase1ListComponent } from './devis-phase1-list.component';

describe('DevisPhase1ListComponent', () => {
  let component: DevisPhase1ListComponent;
  let fixture: ComponentFixture<DevisPhase1ListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevisPhase1ListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DevisPhase1ListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
