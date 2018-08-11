import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { HttpService } from '../../http/http.service';
import { ENDPOINTS } from '../../../../environments/environment';

@Component({
  selector: 'app-open-dataset',
  templateUrl: './open-dataset.component.html',
  styleUrls: ['./open-dataset.component.scss']
})
export class OpenDataSetComponent implements OnInit {

  private fetching = false;
  private value = '';

  constructor(private http: HttpService, private dialogRef: MatDialogRef<OpenDataSetComponent>) { }

  ngOnInit() {
  }
}
