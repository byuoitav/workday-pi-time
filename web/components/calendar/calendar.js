window.components = window.components || {};

window.components.calendar = {
    calendar: document.querySelector('.calendar-grid'),
    calendarTitle: document.querySelector('.calendar-month'),
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    loadPage: async function () {
        window.apiService.log('Loading calendar component', 'none');
        window.components.header.updateHeader(false, 'clock', "Calendar", true, true);
        if (window.curYear === null || window.curMonth === null) {
            const today = new Date();
            window.curYear = today.getFullYear();
            window.curMonth = today.getMonth();
        }
        this.updateCalendarMonthYear(window.curYear, window.curMonth);
        this.addButtonListeners();
        this.showUnprocessedPunchesMessage();
    },

    cleanup: function () {
        window.apiService.log('Cleaning up calendar component', 'none');
    },

    addDayListeners: function () {
        const dayButtons = document.querySelectorAll('.day-cell:not(.disabled)');
        dayButtons.forEach((dayButton) => {
            dayButton.addEventListener('click', () => {
                window.apiService.log('Day clicked: ' + dayButton.id, 'calendar-day-button');
                window.curDay = dayButton.id;
                window.loadDayOverview(dayButton.id);
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
        this.updateNextPrevButtons();
    },
    
    populateCalendar: function (year, month) {
        const calendar = document.querySelector('.calendar-grid');
        [...calendar.querySelectorAll('.day-cell')].forEach(el => el.remove());

        const firstDay = new Date(year, month, 1);
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
        const totalCells = 42;

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); // Previous month
        const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1); // Two months ago

        // i = 0 to 41, representing the 42 cells in the calendar grid
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell';

            // Calculate the date this cell represents
            const date = new Date(year, month, 1 - startDayOfWeek + i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            cell.id = dateStr;
            cell.textContent = date.getDate();

            // grey out days from the previous or next month
            if (date.getMonth() !== month) {
                cell.classList.add('not-cur-month');
            }

            // Highlight today
            if (dateStr === todayStr) {
                cell.classList.add('cur-day');
            }

            // Disable future days and days older than two months ago
            if (date > today || date < twoMonthsAgo || (date.getMonth() !== month && date < lastMonth)) {
                cell.classList.add('disabled');
            } else {
                // Add dots if day has period blocks or period punches
                const dayData = window.timeService.getDayData(dateStr);
                if (dayData && dayData.hasPeriodBlocks && !dayData.hasPeriodPunches) {
                    const blackDot = document.createElement('div');
                    blackDot.className = 'black-dot';
                    cell.appendChild(blackDot);
                } else if (dayData && dayData.hasPeriodPunches) {
                    const redDot = document.createElement('div');
                    redDot.className = 'red-dot';
                    cell.appendChild(redDot);
                }
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
            window.apiService.log('Previous month button clicked', 'calendar-left-button');
            this.slideRight();
            this.dePopulateCalendar();
            if (window.curMonth === 0) {
                this.updateCalendarMonthYear(window.curYear - 1, 11); // December of previous year
            } else {
                this.updateCalendarMonthYear(window.curYear, window.curMonth - 1);
            }
        });
        calendarRightBtn.addEventListener('click', () => {
            window.apiService.log('Next month button clicked', 'calendar-right-button');
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
    },

    // hide the next button if current month is this month, 
    // else show it and hide the previous button if it is the current month - 1
    updateNextPrevButtons: function () {
        const today = new Date();
        const isCurrentMonth = (window.curYear === today.getFullYear() && window.curMonth === today.getMonth());
        const isPrevMonth = (window.curYear === today.getFullYear() && window.curMonth === today.getMonth() - 1);

        const calendarLeftBtn = document.querySelector('.calendar-left');
        const calendarRightBtn = document.querySelector('.calendar-right');

        if (isCurrentMonth) {
            calendarRightBtn.style.visibility = 'hidden';
        } else {
            calendarRightBtn.style.visibility = 'visible';
        }

        if (isPrevMonth) {
            calendarLeftBtn.style.visibility = 'hidden';
        } else {
            calendarLeftBtn.style.visibility = 'visible';
        }
    },

    showUnprocessedPunchesMessage: function () {
        const messageContainer = document.querySelector('.unprocessed-punches-msg');
        const unprocessedCount = window.unprocessedPunches;

        if (messageContainer) {
            if (unprocessedCount > 0) {
                messageContainer.style.display = 'flex';
                const messageText = messageContainer.querySelector('p');
                if (messageText) {
                    messageText.textContent = "⚠ " + unprocessedCount + " event" + ((unprocessedCount) > 1 ? "s have " : " has ") + "not yet processed.";
                }
            } else {
                messageContainer.style.display = 'none';
            }
        }
    }
}