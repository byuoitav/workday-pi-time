import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";

import { Observable, BehaviorSubject } from "rxjs";
import { share } from "rxjs/operators";

import { APIService, EmployeeRef } from "../../services/api.service";
import {
  Employee,
  PunchType,
  TEC,
  Position,
  PunchRequest
} from "../../objects";
import { ToastService } from "src/app/services/toast.service";
import { ConfirmDialog } from "src/app/dialogs/confirm/confirm.dialog";
import {ErrorDialog} from "src/app/dialogs/error/error.dialog";
import { InternationalDialog } from "src/app/dialogs/international/international.dialog";

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
        "Offline Mode.",
        "DISMISS",
        7000
      );
    }

    if (this.emp.internationalStatus && Number(this.emp.totalWeekHours) >= 15) {
      this.dialog.open(InternationalDialog, {
        data: {
          msg: "You have worked more than 15 hours this week."
        }
      })
    }
    
    if (this.emp.positions.length <= 0 ) {
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
    var tec: string;
    const timeEntryCodesKeys = Object.keys(this.emp.timeEntryCodes);
    tec = this.emp.timeEntryCodes[timeEntryCodesKeys[0]].id;
    if (this.emp.showTEC()) {
      const tecList = document.getElementById(String(jobRef.value.positionNumber)) as HTMLSelectElement;
      tec = tecList.options[tecList.selectedIndex].value;
      for (const key in this.emp.timeEntryCodes) {
        if (this.emp.timeEntryCodes[0].frontendName === tec) {
          tec = key;
          break;
        }
      }
    }

    const data = new PunchRequest();
    data.id = this.emp.id;
    data.positionNumber = String(jobRef.value.positionNumber);
    data.clockEventType = state === "I" ? "IN" : "OUT";
    data.timeEntryCode = tec;
    
    const obs = this.api.punch(data).pipe(share());
    obs.subscribe(
      resp => {
        const response = JSON.parse(resp);
        if (response.written_to_tcd === 'true') {
          console.log("Punch Successful:", resp)
          this.dialog.open(ConfirmDialog, {
            data: {state: data.clockEventType}
          })
          .afterClosed()
          .subscribe(confirmed => {
            if (confirmed === "logout") {
              this.logout();
            }
          })
        } else {
          console.log(resp.written_to_tcd)
          this.dialog.open(ErrorDialog, {
            data: {
              msg: "The Punch was not Submitted Successfully"
            }
          })
        }
         
      },
      err => {
        console.warn("response ERROR", err);
        this.dialog.open(ErrorDialog, {
          data: {
            msg: "The Punch was not Submitted Successfully"
          }
        })
        
      }
    );
  };

  toTimesheet = () => {
    this.router.navigate(["./date/"], { 
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




