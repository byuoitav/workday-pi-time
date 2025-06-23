window.components = window.components || {};

window.components.dayOverview = {   
    loadPage: function () {
        this.addDay();
        window.components.header.updateHeader(false, 'calendar', "Day Overview", true, true);

    },

    cleanup: function () {
    },
    
    addDay: function () {
        const componentContainer = document.querySelector('.component-container');
        const day = window.dayOverviewDay;
        dayParagraph = document.createElement('p');
        dayParagraph.className = 'day-overview-day';
        dayParagraph.textContent = `Day ${day}`;
        componentContainer.appendChild(dayParagraph);
    }


}