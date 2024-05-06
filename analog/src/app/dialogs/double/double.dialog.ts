import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'double-dialog',
  templateUrl: './double.dialog.html',
  styleUrls: ['./double.dialog.scss']
})
export class DoubleDialog implements OnInit  {
  constructor(
    public ref: MatDialogRef<DoubleDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      msg: string;
    }
  ) {
    this.ref.disableClose = true;
  }

  ngOnInit() {
  }

  close = () => {
    this.ref.close("cancel");
  };

  confirmed = () => {
    this.ref.close("continue");
  }

}
