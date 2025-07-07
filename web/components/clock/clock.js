window.components = window.components || {};

window.components.clock = {
    hourlySingle: false,
    hourlyMultiple: false,
    notHourly: false,

    loadPage: function () {
        window.apiService.log('Loading clock component', 'none');
        window.components.header.updateHeader(true, '', "Y-Time", true, true);

        const tecLength = window.employee.timeEntryCodes.length;
        this.notHourly = tecLength === 0;
        this.hourlySingle = tecLength === 1;
        this.hourlyMultiple = tecLength > 1;

        const reviewTimeEntry = document.querySelector('.review-time-entry');
        if (reviewTimeEntry) {
            reviewTimeEntry.addEventListener('click', () => {
                window.apiService.log('Review Time Entry clicked', 'clock-review-time-entry');
                window.loadComponent('calendar');
            });
        }

        this.populateClockInfo();
        this.populateJobs();
        this.hideReviewTimeEntry();
        this.updateRadioButtonStates();
        this.showInternationalWarning();
    },

    cleanup: function () {
        window.apiService.log('Cleaning up clock component', 'none');
        window.removeEventListener("resize", this.setupScrolling);
    },

    populateClockInfo: function () {
        const weeklyTotal = document.querySelector('.weekly-total');
        const dailyTotal = document.querySelector('.daily-total');
        if (weeklyTotal) {
            weeklyTotal.textContent = `Week Total: ${this.convertToTimeFormat(window.employee.totalWeekHours)}`;
        }
        if (dailyTotal) {
            dailyTotal.textContent = `Pay Period Total: ${this.convertToTimeFormat(window.employee.totalPeriodHours)}`;
        }
    },

    populateJobs: function () {
        const jobs = window.employee.positions;
        const container = document.querySelector('#clock-grid');
        renderClockGrid(container, jobs, this.hourlySingle, this.hourlyMultiple, this.notHourly, window.employee.timeEntryCodes);
        attachClockEvents(jobs, window.employee.timeEntryCodes, this);
    },

    clockInOut: async function (positionNumber, clock_event_type, timeEntryCode) {
        clock_event_type = clock_event_type.toUpperCase();
        console.log(`Clocking ${clock_event_type} for position: ${positionNumber} with TEC: ${timeEntryCode}`);

        const clockData = {
            worker_id: window.employee.workerId,
            position_number: positionNumber,
            clock_event_type,
            time_entry_code: timeEntryCode
        };

        renderPopup(`Clocking ${clock_event_type}`, `<div class="loading-spinner"></div>`);
        const response = await window.apiService.punch(clockData);

        if (!response.status) {
            window.showErrorPopup('Failed to clock in/out. Please try again later.');
        } else {
            const result = await response.json();
            if (result.written_to_tcd === "true") {
                this.handleClockingSuccess(positionNumber, clock_event_type);
            } else {
                window.showErrorPopup("Please try again.");
                await window.apiService.getEmployee(window.employee.workerId);
                window.loadComponent('clock');
            }
        }
    },

    // handles the success of clocking in/out
    handleClockingSuccess: function (positionNumber, clock_event_type) {
        renderPopup('Punch Successfully Submitted', `Your punch has been submitted, please verify your time in Workday`);
        const buttons = document.querySelector('.popup-buttons');
        buttons.innerHTML = `
            <button class="logout-btn red-btn">Logout</button>
            <button class="return-btn">Return</button>
        `;

        buttons.querySelector('.logout-btn').onclick = () => {
            window.apiService.log('Logout button clicked from clock success', 'clock-logout-button');
            window.hidePopup();
            window.signOut();
        };
        buttons.querySelector('.return-btn').onclick = async () => {
            window.apiService.log('Return clicked from clock success', 'clock-return-button');
            window.hidePopup();
            renderPopup(`Reloading Clock`, `<div class="loading-spinner"></div>`);
            await window.apiService.getEmployee(window.employee.workerId);
            window.loadComponent('clock');
            window.hidePopup();
        };
    },

    // updates the radio button states based on clocked in positions
    updateRadioButtonStates: function () {
        const positions = window.employee.positions;
        const clockedIn = positions.find(pos => pos.clockedIn);
        positions.forEach(pos => {
            ['in', 'out'].forEach(dir => {
                const input = document.querySelector(`input[name='${pos.positionNumber}'].${dir}-radio`);
                if (input?.parentElement) {
                    if (clockedIn && clockedIn.positionNumber !== pos.positionNumber) {
                        input.parentElement.classList.add('radio-button-greyed-out');
                    } else {
                        input.parentElement.classList.remove('radio-button-greyed-out');
                    }
                }
            });
        });
    },

    // hides the review time entry button if conditions are not met
    // (no time entry codes, no positions, or any of the online checks fail)
    hideReviewTimeEntry: function () {
        const reviewBtn = document.querySelector('.review-time-entry');
        if (reviewBtn) {
            const disable = !(window.employee.timeEntryCodes.length > 0 && window.employee.positions.length > 0) ||
                !window.stats.TCD_employee_cache_online ||
                !window.stats.TCD_timeevents_online ||
                !window.stats.workdayAPI_online;
            if (disable) {
                reviewBtn.classList.add('grey-out');
                reviewBtn.disabled = true;
            }
        }
    },

    // show the international work warning if conditions are met 
    // (more than 15 hours worked this week and international))
    showInternationalWarning: function () {
        if (parseFloat(window.employee.totalWeekHours.replace('H', '').trim()) > 15 &&
            window.employee.international && !window.shownInternationalWarning) {
            renderPopup("International Work Warning", "You have worked more than 15 hours this week.");
            const buttons = document.querySelector('.popup-buttons');
            buttons.innerHTML = `<button class="close-btn">OK</button>`;
            buttons.querySelector('.close-btn').onclick = () => {
                window.apiService.log('International work warning acknowledged', 'international-work-warning');
                window.hidePopup();
            };
            window.shownInternationalWarning = true;
        }
    },

    convertToTimeFormat: function (timeString) {
        const n = parseFloat(timeString.replace('H', '').trim());
        const h = Math.floor(n);
        const m = Math.round((n - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    }
};

// Render UI Functions
function renderClockGrid(container, jobs, hourlySingle, hourlyMultiple, notHourly, timeEntryCodes) {
    let html = `
        <p class="clock-heading">Job Title</p>
        <p class="clock-heading">Week</p>
        <p class="clock-heading">Pay Period</p>
        ${hourlyMultiple ? `<p class="clock-heading">TEC</p>` : ''}
        ${!notHourly ? `<p class="clock-heading">Clock</p>` : ''}
    `;

    // primary positions first
    const primaries = jobs.filter(j => j.primary);
    const secondaries = jobs.filter(j => !j.primary);
    const orderedJobs = [...primaries, ...secondaries];

    // sort TEC once
    let tecOptionsHTML = '';
    if (hourlyMultiple) {
        const sortedTECs = timeEntryCodes.slice().sort((a, b) => a.sortOrder - b.sortOrder);
        tecOptionsHTML = sortedTECs.map((c, i) =>
            `<option value="${c.backendId}" ${i === 0 ? 'selected' : ''}>${c.frontendName}</option>`
        ).join('');
    }

    for (const pos of orderedJobs) {
        const long = (pos.title?.length > 25 || pos.org?.length > 25);
        html += `
            <div class="job-title-container ${long ? 'scrolling-container' : ''}">
                <div class="scroll-block">
                    <div>
                        <p class="job-title">${pos.title}</p>
                        <p class="job-department">${pos.org}</p>
                    </div>
                </div>
            </div>
            <p class="week-time">${convertToTimeFormat(pos.weekHours)}</p>
            <p class="pay-period">${convertToTimeFormat(pos.periodHours)}</p>
        `;

        if (hourlyMultiple) {
            html += `<select class="time-entry-code-select" id="tec-select-${pos.positionNumber}">
                ${tecOptionsHTML}
            </select>`;
        }

        if (!notHourly) {
            html += `
            <div class="custom-radio-container">
                <label class="custom-radio">
                    <input type="radio" name="${pos.positionNumber}" class="in-radio" value="in" ${pos.clockedIn ? 'checked' : ''}>
                    <div class="radio-icon"></div><span>IN</span>
                </label>
                <label class="custom-radio">
                    <input type="radio" name="${pos.positionNumber}" class="out-radio" value="out" ${!pos.clockedIn ? 'checked' : ''}>
                    <div class="radio-icon"></div><span>OUT</span>
                </label>
            </div>`;
        }
    }

    container.innerHTML = html;
    container.className = `clock-grid-${notHourly ? 'not-hourly' : hourlySingle ? 'hourly-single' : 'hourly-multiple'}`;
}


function attachClockEvents(positions, timeEntryCodes, clock) {
    positions.forEach(pos => {
        ['in', 'out'].forEach(dir => {
            const input = document.querySelector(`input[name='${pos.positionNumber}'].${dir}-radio`);
            if (!input) return;
            input.addEventListener('click', () => {
                const tecSelect = document.getElementById(`tec-select-${pos.positionNumber}`);
                const tecCode = tecSelect ? tecSelect.value : (timeEntryCodes[0]?.backendId || '');
                const isDoubleClock = (pos.clockedIn && dir === 'in') || (!pos.clockedIn && dir === 'out');
                if (isDoubleClock) {
                    renderPopup(`Double Clock ${dir.toUpperCase()}`, `Are you sure you want to clock ${dir} again?`);
                    const buttons = document.querySelector('.popup-buttons');
                    buttons.innerHTML = `
                        <button class="cancel-double-clock-btn red-btn">Cancel</button>
                        <button class="confirm-double-clock-btn">Confirm</button>
                    `;
                    buttons.querySelector('.cancel-double-clock-btn').onclick = () => window.hidePopup();
                    buttons.querySelector('.confirm-double-clock-btn').onclick = () => {
                        window.hidePopup();
                        clock.clockInOut(pos.positionNumber, dir, tecCode);
                    };
                } else {
                    clock.clockInOut(pos.positionNumber, dir, tecCode);
                }
                clock.updateRadioButtonStates();
            });
        });
    });
}

function renderPopup(title, message) {
    window.showPopup(title, message);
}
function convertToTimeFormat(timeString) {
    const n = parseFloat(timeString.replace('H', '').trim());
    const h = Math.floor(n), m = Math.round((n - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
}