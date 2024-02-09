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

    if (!this.api.employee_cache || !this.api.timeevents_online || !this.api.workdayAPI_online) {
      this.toast.show(
        "Offline Mode.",
        "DISMISS",
        6000
      );
    }

    if (this.emp?.positions.length <= 0 || this.api.workdayAPI_online === false) {
      const rvwTimesheet = document.getElementById("rvwTimesheet") as HTMLButtonElement;
      rvwTimesheet.className = "hidden";
    }

    const weekHours = this.emp?.totalWeekHours.length === 5 ? Number((this.emp?.totalWeekHours).substring(0, 2)) : Number((this.emp?.totalWeekHours).substring(0, 1));
    if (this.emp?.internationalStatus && weekHours >= 15 && this.api.showAlert) {
      this.api.showAlert = false;
      this.dialog.open(InternationalDialog, {
        data: {
          msg: "You have worked more than 15 hours this week."
        }
      })
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
    
    //Get the Time Entry Code
    var tec: string = null;
    if (this.emp.timeEntryCodes !== null) {
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
    }

    //Construct and Send Punch Request
    const data = new PunchRequest();
    data.id = this.emp.id;
    data.positionNumber = String(jobRef.value.positionNumber);
    data.clockEventType = state === "I" ? "IN" : "OUT";
    data.timeEntryCode = tec;
    
    const obs = this.api.punch(data).pipe(share());
    obs.subscribe({
      next: (resp) => {
        const response = JSON.parse(resp);
        if (response.written_to_tcd === 'true') {
          this.dialog.open(ConfirmDialog, {
            data: {state: data.clockEventType}
          })
          .afterClosed()
          .subscribe(confirmed => {
            if (confirmed === "logout") {
              this.logout();
            }
            else if (confirmed === "confirmed") {
              this.router.navigate([], {
                queryParams: {theme: this.api.theme == "dark" ? "dark" : 
                this.api.theme == "default" ? "light" : "default"},
                queryParamsHandling: "merge"
              });
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
      error: (err) => {
        console.warn("response ERROR", err);
        this.dialog.open(ErrorDialog, {
          data: {
            msg: "The Punch was not Submitted Successfully"
          }
        })
        
      }
  });
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





