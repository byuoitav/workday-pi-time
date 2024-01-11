import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { Observable, BehaviorSubject } from "rxjs";
import { share } from "rxjs/operators";

import { APIService, EmployeeRef } from "../../services/api.service";
import {
  Employee,
  PunchType,
  TRC,
  Position,
  PunchRequest
} from "../../objects";
import { ToastService } from "src/app/services/toast.service";
import { ConfirmDialog } from "src/app/dialogs/confirm/confirm.dialog";

@Component({
  selector: "clock",
  templateUrl: "./clock.component.html",
  styleUrls: ["./clock.component.scss"]
})
export class ClockComponent implements OnInit {
  public punchType = PunchType;

  private _empRef: EmployeeRef;
  get emp(): Employee {
    if (this._empRef) {
      return this._empRef.employee;
    }

    return undefined;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public api: APIService,
    public dialog: MatDialog,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.route.data.subscribe(data => {
      this._empRef = data.empRef;
    });

    if (this.api.unsynced) {
      this.toast.show(
        "Not all time events have synced yet.",
        "DISMISS",
        20000
      );
    }
    
    if (this.emp.positions.length <= 0) {
      const rvwTimesheet = document.getElementById("rvwTimesheet") as HTMLButtonElement;
      rvwTimesheet.className = "hidden";
    }
  }

  jobRef(jobID: string): BehaviorSubject<Position> {
    const position = this.emp.positions.find(j => String(j.positionNumber) === String(jobID));
    const ref = new BehaviorSubject(position);

    this._empRef.subject().subscribe(emp => {
      const position = this.emp.positions.find(j => String(j.positionNumber) === String(jobID));
      if (position) {
        ref.next(position);
      }
    });

    return ref;
  }

  clockInOut = (jobRef: BehaviorSubject<Position>, state: PunchType) => {
    console.log("clocking job", jobRef.value.businessTitle, "to state", state);
    var trc: string;
    const timeEntryCodesKeys = Object.keys(this.emp.timeEntryCodes);
    if (timeEntryCodesKeys.length === 1) {
      trc = timeEntryCodesKeys[0];
    }
    else if (this.emp.showTRC()) {
      const trcList = document.getElementById(String(jobRef.value.positionNumber)) as HTMLSelectElement;
      trc = trcList.options[trcList.selectedIndex].value;
      for (const key in this.emp.timeEntryCodes) {
        if (this.emp.timeEntryCodes[key] === trc) {
          trc = key;
          break;
        }
      }
    }

    const data = new PunchRequest();
    data.id = this.emp.id;
    data.positionNumber = String(jobRef.value.positionNumber);
    data.clockEventType = state === "I" ? "IN" : "OUT";
    data.time = formatDate(new Date());
    data.comment = "comment";
    data.timeEntryCode = trc;

    const obs = this.api.punch(data).pipe(share());
    obs.subscribe(
      resp => {
        console.log("response data", resp);
        const msg =
          "Clocked " + PunchType.toNormalString(state) + " Submitted";
        this.toast.show(msg, "DISMISS", 2000);
      },
      err => {
        console.warn("response ERROR", err);
      }
    );
  };

  toTimesheet = () => {
    this.router.navigate(["./job/"], { 
      relativeTo: this.route,
      queryParamsHandling: "preserve" });
  };

  logout = () => {
    this._empRef.logout(false);
  };

}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  const offset = date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
  const offsetMinutes = (Math.abs(offset) % 60).toString().padStart(2, '0');
  const offsetSign = offset < 0 ? '+' : '-';

  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds} ${offsetSign}${offsetHours}${offsetMinutes}`;

  return formattedDate;
}