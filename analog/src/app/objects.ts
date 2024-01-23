import { InjectionToken } from "@angular/core";
import {
  JsonObject,
  JsonProperty,
  Any,
  JsonConverter,
  JsonCustomConvert
} from "json2typescript";

export const PORTAL_DATA = new InjectionToken<{}>("PORTAL_DATA");

export enum PunchType {
  In = "I",
  Out = "O",
  Transfer = "T"
}

export namespace PunchType {
  export function toString(pt: PunchType | String): String {
    switch (pt) {
      case PunchType.In:
        return "IN";
      case PunchType.Out:
        return "OUT";
      case PunchType.Transfer:
        return "TRANSFER";
      default:
        return pt.toString();
    }
  }

  export function toNormalString(pt: PunchType | String): String {
    switch (pt) {
      case PunchType.In:
        return "In";
      case PunchType.Out:
        return "Out";
      case PunchType.Transfer:
        return "Transfer";
      default:
        return pt.toString();
    }
  }

  export function reverse(pt: PunchType): PunchType {
    switch (pt) {
      case PunchType.In:
        return PunchType.Out;
      case PunchType.Out:
        return PunchType.In;
      default:
        return pt;
    }
  }

  export function fromString(s: string | String): PunchType {
    switch (s) {
      case "I":
        return PunchType.In;
      case "O":
        return PunchType.Out;
      case "T":
        return PunchType.Transfer;
      default:
        return;
    }
  }
}

export enum JobType {
  FullTime = "F",
  PartTime = "P"
}

@JsonConverter
export class NumberConverter implements JsonCustomConvert<Number> {
  serialize(num: Number): any {
    return num.toString();
  }

  deserialize(numString: any): Number {
    // Extract numeric part from the string (e.g., "2.41 H" -> "2.41")
    const numericPart = numString.match(/[\d.]+/);

    // Check if numeric part is found
    if (numericPart && numericPart.length > 0) {
      // Parse the numeric part and convert it to a number
      return Number(numericPart[0]);
    }

    // Return undefined if no numeric part is found
    return undefined;
  }
}


@JsonConverter
export class DateConverter implements JsonCustomConvert<Date> {
  serialize(date: Date): any {
    if (!date) {
      return "0001-01-01T00:00:00Z";
    }

    const pad = n => {
      return n < 10 ? "0" + n : n;
    };

    // Extract timezone offset in the format ±HH:mm
    const offset = -date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const timezoneOffset = (offset < 0 ? "-" : "+") + pad(offsetHours) + ":" + pad(offsetMinutes);

    return (
      date.getUTCFullYear() +
      "-" +
      pad(date.getUTCMonth() + 1) +
      "-" +
      pad(date.getUTCDate()) +
      "T" +
      pad(date.getUTCHours()) +
      ":" +
      pad(date.getUTCMinutes()) +
      ":" +
      pad(date.getUTCSeconds()) +
      timezoneOffset
    );
  }

  deserialize(dateString: any): Date {
    if (!dateString || dateString === "0001-01-01T00:00:00Z") {
      return undefined;
    }

    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([\+\-]\d{2}:\d{2})$/);

    if (match) {
      const [, year, month, day, hours, minutes, seconds, offset] = match;
      const utcMilliseconds = Date.UTC(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      );

      // Parse timezone offset
      const offsetSign = offset.charAt(0) === '-' ? -1 : 1;
      const offsetParts = offset.substr(1).split(':');
      const offsetHours = parseInt(offsetParts[0]) * offsetSign;
      const offsetMinutes = parseInt(offsetParts[1]) * offsetSign;

      // Adjust for UTC offset
      const localMilliseconds = utcMilliseconds - (offsetHours * 60 + offsetMinutes) * 60 * 1000;
      const localDate = new Date(localMilliseconds);

      return localDate;
    }

    return undefined;
  }
}

@JsonConverter
export class PunchTypeConverter implements JsonCustomConvert<string> {
  serialize(value: string): any {
    return value.toUpperCase(); // Serialize to uppercase ("IN" or "OUT")
  }

  deserialize(value: any): string {
    // Map "check-in" to "IN" and "check-out" to "OUT"
    if (value && typeof value === 'string') {
      const lowerCaseValue = value.toLowerCase();
      if (lowerCaseValue === 'check-in') {
        return 'IN';
      } else if (lowerCaseValue === 'check-out') {
        return 'OUT';
      }
    }

    // Return the original value if no mapping is found
    return value;
  }
}




export class Hours {
  private _time: string;
  get time(): string {
    if (!this._time || this._time.length <= 0 || this._time.length > 4) {
      return "--:--";
    } else if (this._time.length <= 2) {
      return "--:" + this._time;
    }

    if (this._time.length <= 2) {
      return "--:" + this._time;
    }

    if (this._time.length > 2) {
      return this._time.substring(0, 2) + ":" + this._time.substring(2);
    }
  }
  set time(s: string) {
    if (s.includes(":")) {
      s = s.replace(":", "");
    }

    this._time = s.substring(0, 4);
  }

  public toString = (): string => {
    return this.time;
  };

  constructor(s: string) {
    this.time = s;
  }
}


@JsonObject("TEC")
export class TEC {
  @JsonProperty("backend_id", String, true)
  id: string = undefined;

  @JsonProperty("frontend_name", String, true)
  frontendName: string = undefined;

  @JsonProperty("sort_order", Number)
  sortOrder: number = undefined;
}

@JsonObject("TotalTime")
export class TotalTime {
  @JsonProperty("week", String, true)
  week: string = undefined;

  @JsonProperty("pay-period", String, true)
  payPeriod: string = undefined;
}

@JsonObject("Punch")
export class Punch {
  @JsonProperty("position_number", String, true)
  positionNumber: number = undefined;

  @JsonProperty("business_title", String, true)
  businessTitle: String = undefined;

  @JsonProperty("clock_event_type", PunchTypeConverter, true)
  type: String = undefined;

  @JsonProperty("time_clock_event_date_time", DateConverter, true)
  time: Date = undefined;
}

@JsonObject("PeriodBlock")
export class PeriodBlock {
  @JsonProperty("position_number", String, true)
  positionNumber: String = undefined;

  @JsonProperty("business_title", String, true)
  businessTitle: String = undefined;

  @JsonProperty("time_clock_event_date_time_in", DateConverter, false)
  startDate: Date = undefined;

  @JsonProperty("time_clock_event_date_time_out", DateConverter, false)
  endDate: Date = undefined;

  @JsonProperty("length", NumberConverter, false)
  totalHours: string = undefined;

  @JsonProperty("reference_id", String, false)
  referenceID: string = undefined;
}

@JsonObject("Day")
export class Day {
  @JsonProperty("date", DateConverter, false)
  time: Date = undefined;

  @JsonProperty("punched-hours", String, false)
  punchedHours: string = undefined;

  @JsonProperty("reported-hours", String, true)
  reportedHours: string = undefined;

  @JsonProperty("punches", [Punch], true)
  punches: Punch[] = Array<Punch>();

  @JsonProperty("period-blocks", [PeriodBlock], true)
  periodBlocks: PeriodBlock[] = Array<PeriodBlock>();

  

  public static minDay<T extends Day>(days: T[]): Day {
    if (days == null) {
      return;
    }

    let minimum: Day;
    const today = new Day();
    today.time = new Date();
    minimum = today;

    for (const d of days) {
      if (d.time.getTime() < minimum.time.getTime()) {
        minimum = d;
      }
    }

    if (minimum.time.getTime() === today.time.getTime()) {
      return days[0];
    }

    return minimum;
  }

  public static maxDay<T extends Day>(days: T[]): Day {
    if (days == null) {
      return;
    }

    let maximum: Day;
    const today = new Day();
    today.time = new Date();
    maximum = today;

    for (const d of days) {
      if (d.time.getTime() > maximum.time.getTime()) {
        maximum = d;
      }
    }

    if (maximum.time.getTime() === today.time.getTime()) {
      return days[days.length - 1];
    }

    return maximum;
  }
}

@JsonObject("Position")
export class Position {
 @JsonProperty('position_number', String)
 positionNumber: string = undefined;

 @JsonProperty('primary_position', String)
 primaryPosition: boolean = undefined;

 @JsonProperty('business_title')
 businessTitle: string = undefined;

 @JsonProperty('position_total_week_hours', String)
 totalWeekHours: number = undefined;

 @JsonProperty('position_total_period_hours', String)
 totalPeriodHours: number = undefined;

 @JsonProperty('clocked_in', String)
 inStatus: boolean = false;

 days = Array<Day>();

}


@JsonObject("Employee")
export class Employee {
  @JsonProperty("worker_id", String, true)
  id: string = undefined;
  @JsonProperty("international_status", String, true)
  internationalStatus: Boolean = undefined;
  @JsonProperty("employee_name", String, false)
  name: string = undefined;
  @JsonProperty("total_week_hours", NumberConverter, false)
  totalWeekHours: Number = undefined;

  @JsonProperty("total_period_hours", NumberConverter, false)
  totalPeriodHours: Number = undefined;

  @JsonProperty('time_entry_codes', [TEC])
  timeEntryCodes: TEC[] = undefined;

  @JsonProperty('positions', [Position])
  positions: Position[] = undefined; 

  @JsonProperty("period_punches", [Punch], false)
  periodPunches: Punch[] = undefined;
  
  @JsonProperty("period_blocks", [PeriodBlock], false)
  periodBlocks: PeriodBlock[] = undefined;

  showTEC = (): boolean => {
    if (this.timeEntryCodes) {
      return Object.keys(this.timeEntryCodes).length > 1;
    }
    return false;
  }
}

@JsonObject("ApiResponse")
export class ApiResponse {
  @JsonProperty("status", Object)
  statuses: { [key: string]: boolean } = undefined;

  @JsonProperty("employee", Employee, true)
  employee: Employee = undefined;
}

@JsonObject("PunchRequest") 
export class PunchRequest {
  @JsonProperty("worker_id", String)
  id: string = undefined;

  @JsonProperty("position_number", String)
  positionNumber: string = undefined;

  @JsonProperty("clock_event_type", String)
  clockEventType: string = undefined;

  @JsonProperty("time_entry_code", String)
  timeEntryCode: string = undefined;
}




