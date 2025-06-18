window.components = window.components || {};

window.components.calendar = {
    loadPage: function () {
        this.updateHeader();
    },
    cleanup: function () {
        this.removeNameHeader();
    },

    updateHeader: function () {
        // Put name and sign out button in the header
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

        // remove byu logo and y-time, replace with back arrow and Calendar
        const logo = document.querySelector('.logo');
        backArrow = document.createElement('button');
        backArrow.className = 'back-arrow';
        backArrow.innerHTML = '&lt;';
        backArrow.addEventListener('click', () => {
            window.loadComponent('clock');
        });
        // replace the logo with the back arrow
        if (logo) {
            logo.replaceWith(backArrow);
        }
        
        const headerTitleText = document.querySelector('.header-title-text');
        if (headerTitleText) {
            headerTitleText.textContent = 'Calendar';
        }

    },

    removeNameHeader: function () {
        const nameElement = document.querySelector('.nameElement');
        if (nameElement) nameElement.remove();

        const signOutBtn = document.querySelector('.sign-out-btn');
        if (signOutBtn) signOutBtn.remove();

        const backArrow = document.querySelector('.back-arrow');
        // replace back arrow with logo
        const logo = document.createElement('img');
        logo.className = 'logo';
        logo.src = './assets/byu_logo.svg';
        logo.alt = 'BYU Logo';

        if (backArrow) {
            backArrow.replaceWith(logo);
        }

        const headerTitleText = document.querySelector('.header-title-text');
        if (headerTitleText) {
            headerTitleText.textContent = 'Y-Time';
        }
    },
}