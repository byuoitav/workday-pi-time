import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";

@Component({
  selector: "international-dialog",
  templateUrl: "./international.dialog.html",
  styleUrls: ["./international.dialog.scss"]
})
export class InternationalDialog implements OnInit {
  constructor(
    public ref: MatDialogRef<InternationalDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      msg: string;
    }
  ) {
    this.ref.disableClose = true;
  }

  ngOnInit() {}

  close = () => {
    this.ref.close("close");
  };
}
