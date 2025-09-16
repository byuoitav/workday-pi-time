window.components = window.components || {};

window.components.dayOverview = {
    loadPage: function () {
        window.apiService.log('Loading day overview component', 'none');
        window.components.header.updateHeader(false, 'calendar', "Day Overview", true, true);

        const container = document.querySelector('.positions-container');
        const totalHoursEl = document.querySelector('.total-hours');
        const dayHeaderEl = document.querySelector('.header-title-text');
        const positions = window.timeService.employee.positions;
        const dayMap = window.timeService.daysMap;
        const curDay = window.curDay;

        this.renderDayOverview(container, totalHoursEl, dayHeaderEl, positions, dayMap, curDay);
    },

    cleanup: function () {
        window.apiService.log('Cleaning up day overview component', 'none');
        window.curDay = null;
    },

    renderDayOverview: function (container, totalHoursEl, dayHeaderEl, positions, dayMap, curDay) {
        // Set the day header
        if (dayHeaderEl) {
            const date = new Date(curDay + 'T00:00:00-07:00');
            dayHeaderEl.textContent = date.toLocaleDateString('en-US', {
                timeZone: 'America/Denver',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        }

        // Calculate total hours
        let totalHours = 0;
        const blocks = dayMap[curDay]?.periodBlocks || [];
        blocks.forEach(block => {
            if (block.clockIn && block.clockOut) {
                totalHours += (new Date(block.clockOut) - new Date(block.clockIn)) / (1000 * 60 * 60);
            }
        });
        if (totalHoursEl) {
            totalHoursEl.textContent = `Total Hours: ${totalHours.toFixed(2)}`;
        }

        // Sort positions: primary first
        const primaries = positions.filter(p => p.primary);
        const secondaries = positions.filter(p => !p.primary);
        const orderedPositions = [...primaries, ...secondaries];

        // Build HTML
        let html = '';
        for (const pos of orderedPositions) {
            const timeBlocksHTML = this.renderTimeBlocks(dayMap[curDay]?.periodBlocks?.filter(b => b.positionNumber === pos.positionNumber) || []);
            const unmatchedHTML = this.renderUnmatchedTimeEvents(dayMap[curDay]?.periodPunches?.filter(e => e.positionNumber === pos.positionNumber) || []);

            html += `
            <div class="position-container">
                <p class="position-title">${pos.title}</p>
                <hr>
                <div class="times-container">
                    <div class="time-blocks" id="time-blocks-${pos.positionNumber}">
                        <p class="time-block-title">Time Blocks:</p>
                        ${timeBlocksHTML}
                    </div>
                    <div class="unmatched-time-events" id="unmatched-time-events-${pos.positionNumber}">
                        <p class="unmatched-time-title">Unmatched Time Events:</p>
                        ${unmatchedHTML}
                    </div>
                </div>
            </div>`;
        }

        // Inject into DOM
        if (container) {
            container.innerHTML = html;
        } else {
            console.warn('Positions container not found');
        }
    },

    renderTimeBlocks: function (timeBlocks) {
        return timeBlocks.map(block => {
            const start = block.clockIn ? new Date(block.clockIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
            const end = block.clockOut ? new Date(block.clockOut).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
            return `
            <div class="time-block">
                <p class="time-type">${block.timeEntryCodeName}</p>
                <div class="time-range">
                    <p class="start-time">${start}</p>
                    <p class="end-time">${end}</p>
                </div>
            </div>`;
        }).join('');
    },

    renderUnmatchedTimeEvents: function (events) {
        return events.map(event => {
            const time = new Date(event.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
            const type = event.clockEventType === 'Check-in' ? 'IN' : 'OUT';
            return `
            <div class="unmatched-time-event">
                <p class="unmatched-time">${time}</p>
                <p class="in-or-out">${type}</p>
            </div>`;
        }).join('');
    }
};
