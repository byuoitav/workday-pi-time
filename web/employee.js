class TimeBlock {
  constructor(data) {
    this.positionNumber = data.position_number;
    this.businessTitle = data.business_title;
    this.clockIn = new Date(data.time_clock_event_date_time_in);
    this.clockOut = new Date(data.time_clock_event_date_time_out);
    this.length = parseFloat(data.length);
    this.referenceId = data.reference_id;
    this.reportedDate = data.reported_date;
    this.timeEntryCodeId = data.time_entry_code_ref_id_from_source;
    this.timeEntryCodeName = data.time_entry_code_ref_id_name;
  }
}

class Punch {
  constructor(data) {
    this.positionNumber = data.position_number;
    this.businessTitle = data.business_title;
    this.clockEventType = data.clock_event_type;
    this.time = new Date(data.time_clock_event_date_time);
  }
}

class Position {
  constructor(data) {
    this.positionNumber = data.position_number;
    this.primary = data.primary_position === "true";
    this.title = data.business_title;
    this.org = data.supervisory_org;
    this.weekHours = data.position_total_week_hours;
    this.periodHours = data.position_total_period_hours;
    this.clockedIn = data.clocked_in === "true";
  }
}

class TimeEntryCode {
  constructor(data) {
    this.backendId = data.backend_id;
    this.frontendName = data.frontend_name;
    this.sortOrder = data.sort_order;
  }
}
class ErrorResponse {
    constructor(data) {
        this.error = data.error || "Unknown error occurred";
    }
    toString() {
        return `Error: ${this.error}`;
    }
}
class Employee {
  constructor(data) {
    this.name = (data.employee_name || "").trim();
    this.workerId = data.worker_id ?? null;
    this.international = data.international_status === "true";
    this.totalWeekHours = data.total_week_hours ?? 0;
    this.totalPeriodHours = data.total_period_hours ?? 0;
    this.positionsList = data.positions_list ?? [];
    this.timeEntryCodes = Array.isArray(data.time_entry_codes)
      ? data.time_entry_codes.map(code => new TimeEntryCode(code))
      : [];
    this.positions = Array.isArray(data.positions)
      ? data.positions.map(pos => new Position(pos))
      : [];
    this.periodPunches = Array.isArray(data.period_punches)
      ? data.period_punches.map(p => new Punch(p))
      : [];
    this.periodBlocks = Array.isArray(data.period_blocks)
      ? data.period_blocks.map(b => new TimeBlock(b))
      : [];
  }

  get primaryPosition() {
    return this.positions.find(pos => pos.primary);
  }

  get isClockedIn() {
    return this.primaryPosition?.clockedIn ?? false;
  }

  get latestPunch() {
    return this.periodPunches.at(-1) ?? null;
  }

  get totalHoursWorked() {
    return this.periodBlocks.reduce((sum, b) => sum + b.length, 0);
  }
}
