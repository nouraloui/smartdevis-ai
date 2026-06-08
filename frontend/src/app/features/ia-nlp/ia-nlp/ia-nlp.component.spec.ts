import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IaNlpComponent } from './ia-nlp.component';

describe('IaNlpComponent', () => {
  let component: IaNlpComponent;
  let fixture: ComponentFixture<IaNlpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IaNlpComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(IaNlpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
