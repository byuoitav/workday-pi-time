window.components = window.components || {};

window.components.calendar = {
    loadPage: function () {
        window.components.header.updateHeader(false, 'clock', "Calendar", true, true);
        this.addDayListeners();
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
    }
}