window.components = window.components || {};

window.components.clock = {
    loadPage: function () {
        this.updateHeader();
    },

    cleanup: function () {
        this.removeNameHeader();
    },

    updateHeader: function () {
        const headerRight = document.querySelector('.header-right');
        nameElement = document.createElement('p');
        nameElement.className = 'nameElement';
        nameElement.textContent = 'Last, First';
        headerRight.appendChild(nameElement);

        signOutBtn = document.createElement('img');
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
        if (nameElement) {
            nameElement.remove();
        }
        const signOutBtn = document.querySelector('.sign-out-btn');
        if (signOutBtn) {
            signOutBtn.remove();
        }
    }
}