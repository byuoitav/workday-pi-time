window.components = window.components || {};

window.components.clock = {
    loadPage: function () {
        this.updateHeader();

        //.review-time-entry listener
        const reviewTimeEntry = document.querySelector('.review-time-entry');
        if (reviewTimeEntry) {
            reviewTimeEntry.addEventListener('click', () => {
                window.loadComponent('calendar');
            });
        }
    },

    cleanup: function () {
        this.removeNameHeader();
        window.removeEventListener("resize", this.setupScrolling);
    },

    updateHeader: function () {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        const nameElement = document.createElement('p');
        nameElement.className = 'nameElement';
        nameElement.textContent = 'Last, First';
        headerRight.appendChild(nameElement);

        const signOutBtn = document.createElement('img');
        signOutBtn.className = 'sign-out-btn';
        signOutBtn.src = './assets/signOut.svg';
        signOutBtn.alt = 'Sign Out';
        signOutBtn.addEventListener('click', () => {
            window.loadComponent('login');
        });
        headerRight.appendChild(signOutBtn);
    },

    removeNameHeader: function () {
        const nameElement = document.querySelector('.nameElement');
        if (nameElement) nameElement.remove();

        const signOutBtn = document.querySelector('.sign-out-btn');
        if (signOutBtn) signOutBtn.remove();
    },
};
