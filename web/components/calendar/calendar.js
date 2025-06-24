window.components = window.components || {};

window.components.calendar = {
    calendar: document.querySelector('.calendar-grid'),
    calendarTitle: document.querySelector('.calendar-month'),
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    loadPage: async function () {
        window.components.header.updateHeader(false, 'clock', "Calendar", true, true);
        if (window.curYear === null || window.curMonth === null) {
            const today = new Date();
            window.curYear = today.getFullYear();
            window.curMonth = today.getMonth();
        }
        this.updateCalendarMonthYear(window.curYear, window.curMonth);
        this.addButtonListeners();
    },

    cleanup: function () {

    },

    addDayListeners: function () {
        const dayButtons = document.querySelectorAll('.day-cell');
        dayButtons.forEach((dayButton) => {
            dayButton.addEventListener('click', () => {
                console.log(`Clicked on day: ${dayButton.textContent}`);
                window.loadDayOverview(dayButton.textContent);
            });
        });
    },

    updateCalendarMonthYear: function (year, month) {
        window.curYear = year;
        window.curMonth = month;

        // Update the header with the current month and year
        calendarHeader = document.querySelector('.calendar-month');
        if (calendarHeader) {
            calendarHeader.textContent = `${this.monthNames[month]} ${year}`; // month is 0-indexed
        }

        // Update the calendar display
        this.dePopulateCalendar();
        this.populateCalendar(year, month);
    },

    populateCalendar: function (year, month) {
        const calendar = document.querySelector('.calendar-grid');

        // Remove previous day cells (if any)
        [...calendar.querySelectorAll('.day-cell')].forEach(el => el.remove());

        const firstDay = new Date(year, month, 1); // 1st day of the month
        const lastDay = new Date(year, month + 1, 0); // Last day of current month

        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
        const daysInMonth = lastDay.getDate();

        const prevMonthLastDay = new Date(year, month, 0).getDate(); // Last day of previous month

        const totalCells = 42;

        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell';

            if (i < startDayOfWeek) {
                // Days from previous month
                cell.textContent = prevMonthLastDay - startDayOfWeek + 1 + i;
                cell.classList.add('not-cur-month');
            } else if (i < startDayOfWeek + daysInMonth) {
                // Current month
                cell.textContent = i - startDayOfWeek + 1;
                // current day highlight
                if (i - startDayOfWeek + 1 === new Date().getDate() && year === new Date().getFullYear() && month === new Date().getMonth()) {
                    cell.classList.add('cur-day');
                }
            } else {
                // Next month
                cell.textContent = i - (startDayOfWeek + daysInMonth) + 1;
                cell.classList.add('not-cur-month');
            }

            calendar.appendChild(cell);
        }
        this.addDayListeners();
    },

    dePopulateCalendar: function () {
        const calendar = document.querySelector('.calendar-grid');
        // Remove all day cells
        [...calendar.querySelectorAll('.day-cell')].forEach(el => el.remove());
    },

    addButtonListeners: function () {
        calendarLeftBtn = document.querySelector('.calendar-left');
        calendarRightBtn = document.querySelector('.calendar-right');
        calendarLeftBtn.addEventListener('click', () => {
            this.slideRight();
            this.dePopulateCalendar();
            if (window.curMonth === 0) {
                this.updateCalendarMonthYear(window.curYear - 1, 11); // December of previous year
            } else {
                this.updateCalendarMonthYear(window.curYear, window.curMonth - 1);
            }
        });
        calendarRightBtn.addEventListener('click', () => {
            this.slideLeft();
            this.dePopulateCalendar();
            if (window.curMonth === 11) {
                this.updateCalendarMonthYear(window.curYear + 1, 0); // January of next year
            } else {
                this.updateCalendarMonthYear(window.curYear, window.curMonth + 1);
            }
        });
    },

    //animations for month changes
    slideRight: function () {
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
    },

    slideLeft: function () {
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