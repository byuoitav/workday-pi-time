window.components = window.components || {};

window.components.login = {
    loadPage: function () {
        window.loadComponent('keypad', '.right-container');
    },

    cleanup: function () {
        // remove keypad component css
        const keypadStylesheet = document.querySelector('link[href="./components/keypad/keypad.css"]');
        if (keypadStylesheet) {
            keypadStylesheet.remove();
        }
    }
}