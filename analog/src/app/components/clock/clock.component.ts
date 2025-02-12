import { Component, OnInit, Input } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";

import { BehaviorSubject } from "rxjs";
import { share } from "rxjs/operators";

import { APIService, EmployeeRef } from "../../services/api.service";
import {
  Employee,
  PunchType,
  TEC,
  Position,
  PunchRequest,
  Log
} from "../../objects";
import { ToastService } from "src/app/services/toast.service";
import { ConfirmDialog } from "src/app/dialogs/confirm/confirm.dialog";
import { ErrorDialog } from "src/app/dialogs/error/error.dialog";
import { InternationalDialog } from "src/app/dialogs/international/international.dialog";
import { DoubleDialog } from "src/app/dialogs/double/double.dialog";
import { SvgPreloadService } from "src/app/services/svg-preload.service";

@Component({
  selector: "clock",
  templateUrl: "./clock.component.html",
  styleUrls: ["./clock.component.scss"]
})
export class ClockComponent implements OnInit {
  public punchType = PunchType;

  private clockingInProgress = false;

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
    private toast: ToastService,
    public svgPreloadService: SvgPreloadService
  ) { }

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

    //greys out the "to time sheet" button
    if (this.emp?.positions.length <= 0 || this.api.workdayAPI_online === false || this.emp.timeEntryCodes == null) {
      const rvwTimesheet = document.getElementById("rvwTimesheet") as HTMLButtonElement;
      rvwTimesheet.className = "hidden";
    }

    const weekHours = this.emp?.totalWeekHours.length === 5 ? Number((this.emp?.totalWeekHours).substring(0, 2)) : Number((this.emp?.totalWeekHours).substring(0, 1));
    if (this.emp?.internationalStatus && weekHours >= 15 && this.api.showAlert) {
      this.api.showAlert = false;
      this.logDialogBoxClicks("", "International Dialog Box Opening");
      this.dialog.open(InternationalDialog, {
        data: {
          msg: "You have worked more than 15 hours this week."
        }
      }).afterClosed()
      .subscribe(confirmed => {
        if (confirmed === "close") {
          this.logDialogBoxClicks("close_dialog", "Clicked Close Button International Dialog Box");
          return;
        }
      });
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

  trimTitle = (title: string) => {
    if (title.length > 23) {
      const first = title.substring(0, 23);
      return `${first}...`;
    }
    return title;
  }

  logClockClick = (jobRef: BehaviorSubject<Position>, state: PunchType) => {
    console.log("Logging clock in/out button clicked by " + this.emp.id);
    var log = new Log();
    if (state === "I") {
      log.button = "clock_in";
      log.message = "Clicked In for " + jobRef.value.businessTitle;
    }
    else {
      log.button = "clock_out";
      log.message = "Clicked Out for " + jobRef.value.businessTitle;
    }
    log.byuID = this.emp.id;
    log.time = new Date();
    log.notify = false;
    this.api.sendLog(log).toPromise();
  }

  logDialogBoxClicks = (button: string, message: string) => {
    console.log("Logging dialog box button clicked by " + this.emp.id);
    var log = new Log();
    log.button = button;
    log.message = message;
    log.byuID = this.emp.id;
    log.time = new Date();
    log.notify = false;
    this.api.sendLog(log).toPromise();
  }

  clockInOut = (jobRef: BehaviorSubject<Position>, state: PunchType) => {
    this.logClockClick(jobRef, state);

    if (this.clockingInProgress) {
      console.warn("Clocking already in progress");
      return;
    }

    // Set the cooldown flag
    this.clockingInProgress = true;

    console.log("clocking job", jobRef.value.businessTitle, "to state", state);

    // Get the Time Entry Code
    let tec: string = null;
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
    } else {
      this.logDialogBoxClicks("", "Error Employee Not Eligible Dialog Box Opening");
      this.dialog.open(ErrorDialog, {
        data: {
          msg: "Employee Not Eligible for Time Tracking"
        }
      });
      this.clockingInProgress = false; 
      return;
    }

    // Check that other jobs are not already clocked in
    for (let i = 0; i < this.emp.positions.length; i++) {
      if (this.emp.positions[i].inStatus && this.emp.positions[i].positionNumber !== jobRef.value.positionNumber) {
        this.dialog.open(ErrorDialog, {
          data: {
            msg: "A Different Job is Already Clocked In"
          }
        });
        this.refreshPage();
        this.clockingInProgress = false; 
        return;
      }
    }

    // Handle double clocking
    if (state === "I" && jobRef.value.inStatus) {
      this.logDialogBoxClicks("none", "Double Clock In Dialog Box Opening");
      this.dialog.open(DoubleDialog, {
        data: {
          msg: "Are you sure you want to clock in again?"
        }
      })
        .afterClosed()
        .subscribe(confirmed => {
          if (confirmed === "cancel") {
            this.logDialogBoxClicks("cancel_double_clock", "Clicked Cancel Button");
            this.clockingInProgress = false; 
            return;
          } else if (confirmed === "continue") {
            this.logDialogBoxClicks("continue_double_clock", "Clicked Continue Button");
            this.sendPunch(jobRef, state, tec);
          }
        });
    } else if (state === "O" && !jobRef.value.inStatus) {
      this.logDialogBoxClicks("none", "Double Clock In Dialog Box Opening");
      this.dialog.open(DoubleDialog, {
        data: {
          msg: "Are you sure you want to clock out again?"
        }
      })
        .afterClosed()
        .subscribe(confirmed => {
          if (confirmed === "cancel") {
            this.logDialogBoxClicks("cancel_double_clock", "Clicked Cancel Button");
            this.clockingInProgress = false; 
            return;
          } else if (confirmed === "continue") {
            this.logDialogBoxClicks("continue_double_clock", "Clicked Continue Button");
            this.sendPunch(jobRef, state, tec);
          }
        });
    } else {
      this.sendPunch(jobRef, state, tec);
    }
  };

  sendPunch = (jobRef: BehaviorSubject<Position>, state: PunchType, tec: string) => {
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
          this.logDialogBoxClicks("", "Punch Confirmation Dialog Box Opening");
          this.dialog.open(ConfirmDialog, {
            data: { state: data.clockEventType }
          })
            .afterClosed()
            .subscribe(confirmed => {
              if (confirmed === "logout") {
                this.logDialogBoxClicks("logout_clock_dialog", "Clicked Logout after Punch Button");
                this.logout();
              } else if (confirmed === "confirmed") {
                this.logDialogBoxClicks("confirmed_clock_dialog", "Clicked Return after Punch Button");
                this.refreshPage();
              }
            });
        } else {
          console.log(resp.written_to_tcd);
          this.refreshPage();
          this.dialog.open(ErrorDialog, {
            data: {
              msg: "The Punch was not Submitted Successfully"
            }
          });
        }
      },
      error: (err) => {
        this.refreshPage();
        console.warn("response ERROR", err);
        this.logDialogBoxClicks("", "Punch Error Dialog Box Opening");
        this.dialog.open(ErrorDialog, {
          data: {
            msg: "The Punch was not Submitted Successfully"
          }
        }).afterClosed()
        .subscribe(confirmed => {
          if (confirmed === "close") {
            this.logDialogBoxClicks("close_dialog", "Clicked Dismiss Button Error Dialog Box");
            return;
          }
        });

      },
      complete: () => {
        this.clockingInProgress = false; 
      }
    });
  };

  logTimesheetClick = () => {
    console.log("Logging to timesheet button clicked by " + this.emp.id);
    var log = new Log();
    log.button = "to_timesheet";
    log.message = "Clicked To Timesheet Button";
    log.byuID = this.emp.id;
    log.time = new Date();
    log.notify = false;
    this.api.sendLog(log).toPromise();
  }

  toTimesheet = () => {
    this.logTimesheetClick();
    this._empRef.selectedDate = new Date();
    this.router.navigate(["./date/"], {
      relativeTo: this.route,
      queryParamsHandling: "preserve"
    });
  };

  clickLogout = async () => {
    console.log("Logout button clicked by " + this.emp.id);
    var log = new Log();
    log.button = "logout_clock_screen";
    log.message = "Clicked Logout Button";
    log.byuID = this.emp.id;
    log.time = new Date();
    log.notify = false;
    this.api.sendLog(log).toPromise();
    this.logout();
  }
  
  logout = async () => {
    this._empRef.logout(false);
  };

  refreshPage = () => {
    this.router.navigate([], {
      queryParams: {
        theme: this.api.theme == "dark" ? "dark" :
          this.api.theme == "default" ? "light" : "default"
      },
      queryParamsHandling: "merge"
    });
  }

}





