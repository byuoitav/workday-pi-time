window.components = window.components || {};

window.components.clock = {
    loadPage: function () {
        window.components.header.updateHeader(true, '', "Y-Time", true, true);
        //.review-time-entry listener
        const reviewTimeEntry = document.querySelector('.review-time-entry');
        if (reviewTimeEntry) {
            reviewTimeEntry.addEventListener('click', () => {
                window.loadComponent('calendar');
            });
        }
        this.populateJobs();
        this.populateClockInfo();
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
            weeklyTotal.textContent = `Week Total: ${window.employee.totalWeekHours}`;
        }
    },

    setDailyTotal: function () {
        const dailyTotal = document.querySelector('.daily-total');
        if (dailyTotal) {
            dailyTotal.textContent = `Pay Period Total: ${window.employee.totalPeriodHours}`;
        }
    },

    populateJobs: function () {
        const jobs = window.employee.positions;

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
        const clockGridContainer = document.querySelector('.clock-grid');
        jobTitleContainer = document.createElement('div');
        jobTitleContainer.className = 'job-title-container scrolling-container';

        scrollBlock = document.createElement('div');
        scrollBlock.className = 'scroll-block';

        jobContainer = document.createElement('div');

        jobTitle = document.createElement('p');
        jobTitle.className = 'job-title';
        jobTitle.textContent = position.title;

        supervisoryOrg = document.createElement('p');
        supervisoryOrg.className = 'job-department';
        supervisoryOrg.textContent = position.org;

        jobContainer.appendChild(jobTitle);
        jobContainer.appendChild(supervisoryOrg);
        scrollBlock.appendChild(jobContainer);
        jobTitleContainer.appendChild(scrollBlock);
        clockGridContainer.appendChild(jobTitleContainer);

        const weekTime = document.createElement('p');
        weekTime.className = 'week-time';
        weekTime.textContent = position.weekHours;
        clockGridContainer.appendChild(weekTime);

        const periodTime = document.createElement('p');
        periodTime.className = 'pay-period';
        periodTime.textContent = position.periodHours;
        clockGridContainer.appendChild(periodTime);

        const customRadioContainer = document.createElement('div');
        customRadioContainer.className = 'custom-radio-container';
        const inLabel = document.createElement('label');
        inLabel.className = 'custom-radio';

        const inInput = document.createElement('input');
        inInput.name = position.positionNumber; // Use position number as name for radio group
        inInput.type = 'radio';
        inInput.className = 'in-radio';
        inInput.value = 'in';

        const inIcon = document.createElement('div');
        inIcon.className = 'radio-icon';

        const inSpan = document.createElement('span');
        inSpan.textContent = 'IN';

        inLabel.appendChild(inInput);
        inLabel.appendChild(inIcon);
        inLabel.appendChild(inSpan);
        customRadioContainer.appendChild(inLabel);

        const outLabel = document.createElement('label');
        outLabel.className = 'custom-radio';
        const outInput = document.createElement('input');
        outInput.name = position.positionNumber; // Use position number as name for radio group
        outInput.type = 'radio';
        outInput.className = 'out-radio';
        outInput.value = 'out';

        const outIcon = document.createElement('div');
        outIcon.className = 'radio-icon';

        const outSpan = document.createElement('span');
        outSpan.textContent = 'OUT';
        outLabel.appendChild(outInput);
        outLabel.appendChild(outIcon);
        outLabel.appendChild(outSpan);
        customRadioContainer.appendChild(outLabel);
        clockGridContainer.appendChild(customRadioContainer);

        isClockedIn = position.clockedIn;
        if (isClockedIn) {
            inInput.checked = true;
        }
        else {
            outInput.checked = true;
        }
    }
};
