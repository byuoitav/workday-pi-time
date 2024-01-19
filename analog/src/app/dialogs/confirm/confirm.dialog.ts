import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm.dialog.html',
  styleUrls: ['./confirm.dialog.scss']
})
export class ConfirmDialog implements OnInit {
  constructor(
    public ref: MatDialogRef<ConfirmDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      state: string
    }
  ) {
    this.ref.disableClose = true;
  }


  ngOnInit() {
  }

  close = () => {
    this.ref.close("logout");
  };

  confirmed = () => {
    this.ref.close("confirmed");
  }

}
