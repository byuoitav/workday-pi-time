window.components = window.components || {};

window.components.login = {
    loadPage: function () {
        window.loadComponent('keypad', '.right-container');
        window.components.header.updateHeader(true, '', "Y-Time", false, false);
        this.loadMedallion();
    },

    cleanup: function () {
        // remove keypad component css
        const keypadStylesheet = document.querySelector('link[href="./components/keypad/keypad.css"]');
        if (keypadStylesheet) {
            keypadStylesheet.remove();
        }
    },

    loadMedallion: async function () {
        await fetch('assets/byu_medallion.svg')
            .then(response => response.text())
            .then(svgText => {
                const container = document.getElementById('byu-medallion');
                container.innerHTML = svgText;
            });
    }
}