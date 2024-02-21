import {Component, OnInit, OnDestroy} from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";
import {Subscription} from "rxjs";

import {EmployeeRef, APIService} from "../../services/api.service";
import {ToastService} from "../../services/toast.service";
import {Employee, Day} from "../../objects";

@Component({
  selector: "date-select",
  templateUrl: "./date-select.component.html",
  styleUrls: ["./date-select.component.scss"]
})
export class DateSelectComponent implements OnInit, OnDestroy {
  today: Date;
  viewMonth: number;
  viewYear: number;
  viewDays: Date[];

  minDay: Day;
  maxDay: Day;

  MonthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  DayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  calendar;
  calendarTitle;

  private _empRef: EmployeeRef;
  get emp(): Employee {
    if (this._empRef) {
      return this._empRef.employee;
    }
    return undefined;
  }

  private _subsToDestroy: Subscription[] = [];

  constructor(
    public api: APIService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this._subsToDestroy.push(this.route.paramMap.subscribe(params => {
      this.getViewDays();
    }));

    this._subsToDestroy.push(this.route.data.subscribe(data => {
      this._empRef = data.empRef;

      this._subsToDestroy.push(this._empRef.subject().subscribe(emp => {
        this.getViewDays();
      }));
    }));

    this.calendar = document.getElementById("calendar") as HTMLObjectElement;
    this.calendarTitle = document.getElementById("monthName") as HTMLObjectElement;
  }

  ngOnDestroy() {
    for (const s of this._subsToDestroy) {
      s.unsubscribe();
    }

    this._empRef = undefined;
  }

  goBack() {
      // clock
      this.router.navigate(["/employee/" + this.emp.id], {
        queryParamsHandling: "preserve"
      });
  }

  canMoveMonthBack(): boolean {
    if (this.viewYear < this.today.getFullYear()) {
      return false;
    }
    return this.viewMonth >= this.today.getMonth();
  }

  canMoveMonthForward(): boolean {
    return this.viewMonth < this.today.getMonth() || this.viewYear < this.today.getFullYear();
  }

  moveMonthBack() {
    this.slideRight();
    setTimeout(() => {
      if (this.viewMonth === 0) {
        this.viewMonth = 11;
        this.viewYear--;
      } else {
        this.viewMonth--;
      }
      this.getViewDays();
    }, 50);
    
  }

  moveMonthForward() {
    this.slideLeft();
    setTimeout(() => {
      if (this.viewMonth === 11) {
        this.viewMonth = 0;
        this.viewYear++;
      } else {
        this.viewMonth++;
      }
  
      this.getViewDays();
    }, 50);
  }

  selectDay = (date: Date) => {
    const str = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();

    if (date > this.today || 
      date.getMonth() === (this.today.getMonth() > 1 ? this.today.getMonth() - 2 : (12 + (this.today.getMonth() % 11)) - 2)) {
      return;
    }
    this.router.navigate(["./" + str], {
      relativeTo: this.route,
      queryParamsHandling: "preserve"
    });

    //add cookie to know what current date they are looking at
    if (this._empRef) {
      this._empRef.selectedDate = date;
    }
  };

  getViewDays() {
    this.today = new Date();
    if (!this._empRef) {
      return;
    }
    // console.log(this._empRef?.selectedDate.getMonth());

    if (!this.viewMonth && this.viewMonth !== 0) {
        this.viewMonth = this.today.getMonth();
        this.viewYear = this.today.getFullYear();
        if (this._empRef.selectedDate) {
          this.viewMonth = this._empRef.selectedDate.getMonth();
          this.viewYear = this._empRef.selectedDate.getFullYear();
        } 
    }

    if (!this.viewYear) {
      this.viewMonth = this.today.getMonth();
      this.viewYear = this.today.getFullYear();
      if (this._empRef.selectedDate) {
        this.viewYear = this._empRef.selectedDate.getFullYear();
        this.viewMonth = this._empRef.selectedDate.getMonth();
      } 
    }

    this.viewDays = [];
    const lastDayOfLastMonth = new Date(this.viewYear, this.viewMonth, 0);
    const start = lastDayOfLastMonth.getDate() - lastDayOfLastMonth.getDay();
    const startDate = new Date(this.viewYear, this.viewMonth - 1, start);
    for (let i = 0; i < 42; i++) {
      const d = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      );

      d.setDate(startDate.getDate() + i);
      this.viewDays.push(d);
    }
  }

  dayHasPunch(day: Date): boolean {
    for (const job of this.emp.positions) {
      if (job) {
        const empDay = job.days.find(
          d => d.time.toDateString() === day.toDateString()
        );

        if (empDay) {
          if (empDay.punches.length > 0) {
            return true
          };
        }
      }
    }
    return false;
  }

  dayHasPeriod(day: Date): boolean {
    for (const job of this.emp.positions) {
      if (job) {
        const empDay = job.days.find(
          d => d.time.toDateString() === day.toDateString()
        );

        if (empDay) {
          if (empDay.periodBlocks.length > 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  dayHasUndefinedPeriod(day: Date): boolean {
    for (const job of this.emp.positions) {
      if (job) {
        const empDay = job.days.find(
          d => d.time.toDateString() === day.toDateString()
        );

        if (empDay) {
          for (const period of empDay.periodBlocks) {
            if (period.startDate === undefined || period.endDate === undefined) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  logout = () => {
    this._empRef.logout(false);
  };

  //animations for month change
  slideRight() : void {
    this.calendar.classList.add("slide-right");
    this.calendarTitle.classList.add("slide-name-right");
    setTimeout(() => {
      this.calendar.classList.remove("slide-right");
      this.calendar.classList.add("slide-right2");
    }, 120);
    setTimeout(() => {
      this.calendar.classList.remove("slide-right2");
      this.calendarTitle.classList.remove("slide-name-right");
    }, 300);
  }

  slideLeft() : void {
    this.calendar.classList.add("slide-left");
    this.calendarTitle.classList.add("slide-name-left");
    setTimeout(() => {
      this.calendar.classList.remove("slide-left");
      this.calendar.classList.add("slide-left2");
    }, 120);
    setTimeout(() => {
      this.calendar.classList.remove("slide-left2");
      this.calendarTitle.classList.remove("slide-name-left");
    }, 300);
  }

}

  
