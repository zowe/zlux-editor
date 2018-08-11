import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenDataSetComponent } from './open-dataset.component';

describe('OpenFolderComponent', () => {
  let component: OpenDataSetComponent;
  let fixture: ComponentFixture<OpenDataSetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OpenDataSetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OpenDataSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
