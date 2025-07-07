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
        document.querySelectorAll('.day-cell:not(.disabled)').forEach((dayButton) => {
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

        if (this.calendarTitle) {
            this.calendarTitle.textContent = `${this.monthNames[month]} ${year}`;
        }

        this.renderCalendar(year, month);
        this.updateNextPrevButtons();
    },

    renderCalendar: function (year, month) {
        const calendarGrid = document.querySelector('.calendar-grid');
        const firstDay = new Date(year, month, 1);
        const startDayOfWeek = firstDay.getDay();
        const totalCells = 42;

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);

        let html = '';
        for (let i = 0; i < totalCells; i++) {
            const date = new Date(year, month, 1 - startDayOfWeek + i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const day = date.getDate();

            const isNotCurMonth = date.getMonth() !== month;
            const isToday = dateStr === todayStr;
            const isDisabled = date > today || date < twoMonthsAgo || (isNotCurMonth && date < lastMonth);

            let classes = 'day-cell';
            if (isNotCurMonth) classes += ' not-cur-month';
            if (isToday) classes += ' cur-day';
            if (isDisabled) classes += ' disabled';

            let dotHTML = '';
            if (!isDisabled) {
                const dayData = window.timeService.getDayData(dateStr);
                if (dayData && dayData.hasPeriodBlocks && !dayData.hasPeriodPunches) {
                    dotHTML = `<div class="black-dot"></div>`;
                } else if (dayData && dayData.hasPeriodPunches) {
                    dotHTML = `<div class="red-dot"></div>`;
                }
            }

            html += `<div class="${classes}" id="${dateStr}">${day}${dotHTML}</div>`;
        }

        // Clear existing cells and re-render all
        if (calendarGrid) {
            // preserve weekday headers & unprocessed msg
            const staticElems = [...calendarGrid.querySelectorAll('.day-name, .unprocessed-punches-msg')];
            calendarGrid.innerHTML = '';
            staticElems.forEach(el => calendarGrid.appendChild(el));
            calendarGrid.insertAdjacentHTML('beforeend', html);
        }

        this.addDayListeners();
    },

    addButtonListeners: function () {
        const calendarLeftBtn = document.querySelector('.calendar-left');
        const calendarRightBtn = document.querySelector('.calendar-right');

        if (calendarLeftBtn && calendarRightBtn) {
            calendarLeftBtn.addEventListener('click', () => {
                window.apiService.log('Previous month button clicked', 'calendar-left-button');
                this.slideRight();
                if (window.curMonth === 0) {
                    this.updateCalendarMonthYear(window.curYear - 1, 11);
                } else {
                    this.updateCalendarMonthYear(window.curYear, window.curMonth - 1);
                }
            });

            calendarRightBtn.addEventListener('click', () => {
                window.apiService.log('Next month button clicked', 'calendar-right-button');
                this.slideLeft();
                if (window.curMonth === 11) {
                    this.updateCalendarMonthYear(window.curYear + 1, 0);
                } else {
                    this.updateCalendarMonthYear(window.curYear, window.curMonth + 1);
                }
            });
        }
    },

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

    updateNextPrevButtons: function () {
        const today = new Date();
        const isCurrentMonth = (window.curYear === today.getFullYear() && window.curMonth === today.getMonth());
        const isPrevMonth = (window.curYear === today.getFullYear() && window.curMonth === today.getMonth() - 1);

        const calendarLeftBtn = document.querySelector('.calendar-left');
        const calendarRightBtn = document.querySelector('.calendar-right');

        if (calendarRightBtn) calendarRightBtn.style.visibility = isCurrentMonth ? 'hidden' : 'visible';
        if (calendarLeftBtn) calendarLeftBtn.style.visibility = isPrevMonth ? 'hidden' : 'visible';
    },

    showUnprocessedPunchesMessage: function () {
        const messageContainer = document.querySelector('.unprocessed-punches-msg');
        const unprocessedCount = window.unprocessedPunches;

        if (messageContainer) {
            if (unprocessedCount > 0) {
                messageContainer.style.display = 'flex';
                const messageText = messageContainer.querySelector('p');
                if (messageText) {
                    messageText.textContent = "⚠ " + unprocessedCount + " event" + (unprocessedCount > 1 ? "s have " : " has ") + "not yet processed.";
                }
            } else {
                messageContainer.style.display = 'none';
            }
        }
    }
};
