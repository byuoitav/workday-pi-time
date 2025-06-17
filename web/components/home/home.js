window.components = window.components || {};

window.components.home = {
    loadPage: function () {
        window.loadComponent('keypad', '.right-container');
    },

    cleanup: function () {
        console.log('Cleaning up home component');
    }
}