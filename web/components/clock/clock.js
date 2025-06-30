window.components = window.components || {};

window.components.clock = {
    hourlySingle: false,
    hourlyMultiple: false,
    notHourly: false,

    loadPage: function () {
        window.components.header.updateHeader(true, '', "Y-Time", true, true);
        if (window.employee.timeEntryCodes.length === 0) {
            this.notHourly = true;
        }

        else if (window.employee.timeEntryCodes.length === 1) {
            this.hourlySingle = true;
        }
        else if (window.employee.timeEntryCodes.length > 1) {
            this.hourlyMultiple = true;
        } else {
            console.error("Unexpected time entry codes length:", window.employee.timeEntryCodes.length);
        }

        //.review-time-entry listener
        const reviewTimeEntry = document.querySelector('.review-time-entry');
        if (reviewTimeEntry) {
            reviewTimeEntry.addEventListener('click', () => {
                window.loadComponent('calendar');
            });
        }
        this.populateJobs();
        this.populateClockInfo();
        this.hideReviewTimeEntry();
    },

    cleanup: function () {
        window.removeEventListener("resize", this.setupScrolling);
    },

    populateClockInfo: function () {
        this.setWeeklyTotal()
        this.setDailyTotal();
    },

    setWeeklyTotal: function () {
        const weeklyTotal = document.querySelector('.weekly-total');
        if (weeklyTotal) {
            weeklyTotal.textContent = `Week Total: ${this.convertToTimeFormat(window.employee.totalWeekHours)}`;
        }
    },

    setDailyTotal: function () {
        const dailyTotal = document.querySelector('.daily-total');
        if (dailyTotal) {
            dailyTotal.textContent = `Pay Period Total: ${this.convertToTimeFormat(window.employee.totalPeriodHours)}`;
        }
    },

    populateJobs: function () {
        const jobs = window.employee.positions;

        this.addHeaderRow();

        // populate primary positions first
        const primaryPositions = jobs.filter(job => job.primary);
        primaryPositions.forEach(position => {
            this.createJobRow(position);
        });

        // populate secondary positions
        const secondaryPositions = jobs.filter(job => !job.primary);
        secondaryPositions.forEach(position => {
            this.createJobRow(position);
        });

    },

    createJobRow: function (position) {
        const clockGridContainer = document.querySelector('#clock-grid');
        this.applyClockGridClass(clockGridContainer);

        const jobTitleContainer = this.createJobTitleContainer(position);
        clockGridContainer.appendChild(jobTitleContainer);

        const weekTime = this.createWeekTimeElement(position.weekHours);
        clockGridContainer.appendChild(weekTime);

        const periodTime = this.createPeriodTimeElement(position.periodHours);
        clockGridContainer.appendChild(periodTime);

        if (this.hourlyMultiple) {
            const timeEntryCodeSelect = this.createTimeEntryCodeSelector();
            clockGridContainer.appendChild(timeEntryCodeSelect);
        }

        if (!this.notHourly) {
            const customRadioContainer = this.createClockInOutRadioButtons(position);
            clockGridContainer.appendChild(customRadioContainer);
        }
    },

    addHeaderRow: function () {
        const clockGridContainer = document.querySelector('#clock-grid');

        const jobTitleHeader = document.createElement('p');
        jobTitleHeader.className = 'clock-heading';
        jobTitleHeader.textContent = 'Job Title';
        clockGridContainer.appendChild(jobTitleHeader);

        const weekHeader = document.createElement('p');
        weekHeader.className = 'clock-heading';
        weekHeader.textContent = 'Week';
        clockGridContainer.appendChild(weekHeader);

        const payPeriodHeader = document.createElement('p');
        payPeriodHeader.className = 'clock-heading';
        payPeriodHeader.textContent = 'Pay Period';
        clockGridContainer.appendChild(payPeriodHeader);

        if (this.hourlyMultiple) {
            const timeEntryCodeHeader = document.createElement('p');
            timeEntryCodeHeader.className = 'clock-heading';
            timeEntryCodeHeader.textContent = 'TEC';
            clockGridContainer.appendChild(timeEntryCodeHeader);
        }

        if (!this.notHourly) {
            const clockHeader = document.createElement('p');
            clockHeader.className = 'clock-heading';
            clockHeader.textContent = 'Clock';
            clockGridContainer.appendChild(clockHeader);
        }
    },

    applyClockGridClass: function (clockGridContainer) {
        if (this.notHourly) {
            clockGridContainer.classList.add('clock-grid-not-hourly');
        } else if (this.hourlySingle) {
            clockGridContainer.classList.add('clock-grid-hourly-single');
        } else if (this.hourlyMultiple) {
            clockGridContainer.classList.add('clock-grid-hourly-multiple');
        }
    },

    createJobTitleContainer: function (position) {
        const jobTitleContainer = document.createElement('div');
        jobTitleContainer.className = 'job-title-container';

        // Check if jobTitle or supervisoryOrg text is longer than 25 characters
        const isLongText = (position.title && position.title.length > 25) ||
            (position.org && position.org.length > 25);

        if (isLongText) {
            jobTitleContainer.classList.add('scrolling-container');
        }

        const scrollBlock = document.createElement('div');
        scrollBlock.className = 'scroll-block';

        const jobContainer = document.createElement('div');

        const jobTitle = document.createElement('p');
        jobTitle.className = 'job-title';
        jobTitle.textContent = position.title;

        const supervisoryOrg = document.createElement('p');
        supervisoryOrg.className = 'job-department';
        supervisoryOrg.textContent = position.org;

        jobContainer.appendChild(jobTitle);
        jobContainer.appendChild(supervisoryOrg);
        scrollBlock.appendChild(jobContainer);
        jobTitleContainer.appendChild(scrollBlock);

        return jobTitleContainer;
    },

    createWeekTimeElement: function (weekHours) {
        const weekTime = document.createElement('p');
        weekTime.className = 'week-time';
        weekTime.textContent = this.convertToTimeFormat(weekHours);
        return weekTime;
    },

    createPeriodTimeElement: function (periodHours) {
        const periodTime = document.createElement('p');
        periodTime.className = 'pay-period';
        periodTime.textContent = this.convertToTimeFormat(periodHours);
        return periodTime;
    },

    createTimeEntryCodeSelector: function () {
        const timeEntryCodeSelect = document.createElement('select');
        timeEntryCodeSelect.className = 'time-entry-code-select';

        // Sort codes by sortOrder ascending
        const sortedCodes = window.employee.timeEntryCodes.slice().sort((a, b) => a.sortOrder - b.sortOrder);

        sortedCodes.forEach((code, idx) => {
            const option = document.createElement('option');
            option.value = code.backendId;
            option.textContent = code.frontendName;
            // Select the first (lowest sortOrder) by default
            if (idx === 0) {
                option.selected = true;
            }
            timeEntryCodeSelect.appendChild(option);
        });
        return timeEntryCodeSelect;
    },

    createClockInOutRadioButtons: function (position) {
        const customRadioContainer = document.createElement('div');
        customRadioContainer.className = 'custom-radio-container';

        const inLabel = this.createRadioButton('in', position.positionNumber, 'IN', position.clockedIn);
        customRadioContainer.appendChild(inLabel);

        const outLabel = this.createRadioButton('out', position.positionNumber, 'OUT', !position.clockedIn);
        customRadioContainer.appendChild(outLabel);

        return customRadioContainer;
    },

    createRadioButton: function (value, name, labelText, isChecked) {
        const label = document.createElement('label');
        label.className = 'custom-radio';

        const input = document.createElement('input');
        input.name = name;
        input.type = 'radio';
        input.className = `${value}-radio`;
        input.value = value;
        if (isChecked) {
            input.checked = true;
        }

        const icon = document.createElement('div');
        icon.className = 'radio-icon';

        const span = document.createElement('span');
        span.textContent = labelText;

        label.appendChild(input);
        label.appendChild(icon);
        label.appendChild(span);

        return label;
    },

    convertToTimeFormat: function (timeString) {
        // Remove the "H" and trim any whitespace
        const numericPart = parseFloat(timeString.replace('H', '').trim());

        // Extract hours and minutes
        const hours = Math.floor(numericPart);
        const minutes = Math.round((numericPart - hours) * 60);

        // Format as hh:mm
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    },

    hideReviewTimeEntry: function () {
        const reviewTimeEntry = document.querySelector('.review-time-entry');
        // An employee can't clock in or out if they have no time entry codes
        if (reviewTimeEntry && !(window.employee.timeEntryCodes.length > 0)) {
            reviewTimeEntry.classList.add('grey-out');
            reviewTimeEntry.disabled = true;
        }
    }
};
