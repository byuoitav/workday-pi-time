// This service organizes employee time data (punches and blocks) into a structured format for 
// easy access and manipulation.
class TimeService {
  constructor(employee) {
    this.employee = employee;
    this.daysMap = this.initializeDaysMap();
    this.populatePeriodPunches();
    this.populatePeriodBlocks();
  }

  // Helper to format date as YYYY-MM-DD
  static formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  // Initialize last 42 days with default structure
  initializeDaysMap() {
    const map = {};
    const now = new Date();

    for (let i = 0; i < 62; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = TimeService.formatDate(date);
      map[dateStr] = {
        date: dateStr,
        periodPunches: [],
        periodBlocks: [],
        hasPeriodPunches: false,
        hasPeriodBlocks: false,
      };
    }

    return map;
  }

  // Add punches to the correct day
  populatePeriodPunches() {
    for (const punch of this.employee.periodPunches || []) {
      const dateStr = TimeService.formatDate(new Date(punch.time));
      if (this.daysMap[dateStr]) {
        this.daysMap[dateStr].periodPunches.push(punch);
        this.daysMap[dateStr].hasPeriodPunches = true;
      }
    }
  }

  // Add blocks to the correct day
  populatePeriodBlocks() {
    for (const block of this.employee.periodBlocks || []) {
      const dateStr = block.reportedDate;
      if (this.daysMap[dateStr]) {
        this.daysMap[dateStr].periodBlocks.push(block);
        this.daysMap[dateStr].hasPeriodBlocks = true;
      }
    }
  }

  // Get the data for a specific day in YYYY-MM-DD format
  getDayData(dateStr) {
    return this.daysMap[dateStr] || null;
  }

  // Get all 42 days of data
  getAllDays() {
    // Return sorted in descending order (newest first)
    return Object.values(this.daysMap).sort((a, b) => b.date.localeCompare(a.date));
  }
}
