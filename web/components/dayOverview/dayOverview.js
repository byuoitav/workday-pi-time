window.components = window.components || {};

window.components.dayOverview = {
    loadPage: function () {
        window.components.header.updateHeader(false, 'calendar', "Day Overview", true, true);
        console.log(window.curDay);
        console.log(window.timeService);
        this.populatePositions();
        this.setDayHeader();
        
        const totalHours = this.calculateTotalHoursForDay();
        const totalHoursElement = document.querySelector('.total-hours');
        if (totalHoursElement) {
            totalHoursElement.textContent = `Total Hours: ${totalHours.toFixed(2)}`;
        } else {
            console.warn('Total hours element not found');
        }
    },

    cleanup: function () {
        window.curDay = null;
    },

    setDayHeader: function () {
        const dayHeader = document.querySelector('.header-title-text');
        if (dayHeader) {
            const date = new Date(window.curDay + 'T00:00:00-07:00');
            dayHeader.textContent = `${date.toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'long', day: 'numeric', year: 'numeric' })}`;
        }   
    },

    populatePositions: function () {
        const positions = window.timeService.employee.positions;

        // Separate primary and non-primary positions
        const primaryPositions = positions.filter(position => position.primary);
        const nonPrimaryPositions = positions.filter(position => !position.primary);

        // Add primary positions first
        primaryPositions.forEach((position) => {
            this.createPositionBlock(position);
        });

        // Add non-primary positions next
        nonPrimaryPositions.forEach((position) => {
            this.createPositionBlock(position);
        });
    },

    calculateTotalHoursForDay: function () {
        // find every time block for the current day
        const timeBlocks = window.timeService.daysMap[window.curDay].periodBlocks;
        let totalHours = 0;
        timeBlocks.forEach(block => {
            if (block.clockIn && block.clockOut) {
                const start = new Date(block.clockIn);
                const end = new Date(block.clockOut);
                const hours = (end - start) / (1000 * 60 * 60); // convert milliseconds to hours
                totalHours += hours;
            }
        });
        
        return totalHours;
    },

    createPositionBlock: function (position) {
        const positionsContainer = document.querySelector('.positions-container');

        const positionContainer = document.createElement('div');
        positionContainer.className = 'position-container';

        const positionTitle = document.createElement('p');
        positionTitle.className = 'position-title';
        positionTitle.textContent = `${position.title}`;
        positionContainer.appendChild(positionTitle);

        const hr = document.createElement('hr');
        positionContainer.appendChild(hr);

        const timesContainer = document.createElement('div');
        timesContainer.className = 'times-container';
        positionContainer.appendChild(timesContainer);

        const timeBlocks = document.createElement('div');
        timeBlocks.className = 'time-blocks';
        timeBlocks.id = `time-blocks-${position.positionNumber}`;
        timesContainer.appendChild(timeBlocks);

        const timeBlockTitle = document.createElement('p');
        timeBlockTitle.className = 'time-block-title';
        timeBlockTitle.textContent = 'Time Blocks:';
        timeBlocks.appendChild(timeBlockTitle);

        // create the time blocks
        const timeBlocksList = window.timeService.daysMap[window.curDay].periodBlocks.filter(block => block.positionNumber === position.positionNumber);
        timeBlocksList.forEach(block => {
            const timeBlock = this.createTimeBlock(block);
            timeBlocks.appendChild(timeBlock);
        });

        const unmatchedTimeEvents = document.createElement('div');
        unmatchedTimeEvents.className = 'unmatched-time-events';
        unmatchedTimeEvents.id = `unmatched-time-events-${position.positionNumber}`;
        timesContainer.appendChild(unmatchedTimeEvents);

        const unmatchedTimeTitle = document.createElement('p');
        unmatchedTimeTitle.className = 'unmatched-time-title';
        unmatchedTimeTitle.textContent = 'Unmatched Time Events:';
        unmatchedTimeEvents.appendChild(unmatchedTimeTitle);

        // create the unmatched time events
        const unmatchedTimeEventsList = window.timeService.daysMap[window.curDay].periodPunches.filter(event => event.positionNumber === position.positionNumber);
        unmatchedTimeEventsList.forEach(unmatchedTimeEvent => {
            const unmatchedTimeEventDiv = this.createUnmatchedTimeEvent(unmatchedTimeEvent);
            unmatchedTimeEvents.appendChild(unmatchedTimeEventDiv);
        });

        positionsContainer.appendChild(positionContainer);
    },

    createTimeBlock: function (block) {
        const timeBlock = document.createElement('div');
        timeBlock.className = 'time-block';

        const timeType = document.createElement('p');
        timeType.className = 'time-type';
        timeType.textContent = block.timeEntryCodeName;

        const timeRange = document.createElement('div');
        timeRange.className = 'time-range';

        const startTime = document.createElement('p');
        startTime.className = 'start-time';
        startTime.textContent = block.clockIn
            ? block.clockIn.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : '';

        const endTime = document.createElement('p');
        endTime.className = 'end-time';
        endTime.textContent = block.clockOut
            ? block.clockOut.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : '';

        timeBlock.appendChild(timeType);
        timeBlock.appendChild(timeRange);
        timeRange.appendChild(startTime);
        timeRange.appendChild(endTime);

        return timeBlock;
    },

    createUnmatchedTimeEvent: function (unmatchedTimeEvent) {
        const unmatchedTimeEventDiv = document.createElement('div');
        unmatchedTimeEventDiv.className = 'unmatched-time-event';

        const unmatchedTime = document.createElement('p');
        unmatchedTime.className = 'unmatched-time';
        unmatchedTime.textContent = unmatchedTimeEvent.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });


        const inOrOut = document.createElement('p');
        inOrOut.className = 'in-or-out';
        inOrOut.textContent = unmatchedTimeEvent.clockEventType === 'Check-in' ? 'IN' : 'OUT';

        unmatchedTimeEventDiv.appendChild(unmatchedTime);
        unmatchedTimeEventDiv.appendChild(inOrOut);

        return unmatchedTimeEventDiv;
    }
}

