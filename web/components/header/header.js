window.components = window.components || {};
window.components.header = {
    showBYULogo: true,
    backArrowDestination: "clock",
    showName: true,
    showSignOut: true,

    header: null,
    headerLeft: null,
    headerRight: null,

    logo: null,
    headerTitle: null,
    nameElement: null,
    signOutBtn: null,
    backArrow: null,

    initialize: function () {
        this.header = document.querySelector('.header');
        this.headerLeft = document.createElement('div');
        this.headerLeft.className = 'header-left';
        this.header.appendChild(this.headerLeft);
        this.headerRight = document.createElement('div');
        this.headerRight.className = 'header-right';
        this.header.appendChild(this.headerRight);

        this.backArrow = document.createElement('p');
        this.backArrow.className = 'back-arrow';
        this.backArrow.innerHTML = '&lt;';
        this.headerLeft.appendChild(this.backArrow);

        this.logo = document.createElement('img');
        this.logo.className = 'logo';
        this.logo.src = './assets/byu_logo.svg';
        this.logo.alt = 'BYU Logo';
        this.headerLeft.appendChild(this.logo);

        this.headerTitle = document.createElement('h2');
        this.headerTitle.className = 'header-title-text';
        this.headerTitle.textContent = 'Y-Time';
        this.headerLeft.appendChild(this.headerTitle);

        this.nameElement = document.createElement('p');
        this.nameElement.className = 'nameElement';
        this.nameElement.textContent = (typeof window !== 'undefined' && window.employee && window.employee.name) ? window.employee.name : 'Employee Name'; // Fallback if name is not set
        this.headerRight.appendChild(this.nameElement);

        this.signOutBtn = document.createElement('img');
        this.signOutBtn.className = 'sign-out-btn';
        this.signOutBtn.src = './assets/signOut.svg';
        this.headerRight.appendChild(this.signOutBtn);

    },

    // backArrowDestination should be the name of a component to load
    // e.g. 'calendar', 'clock', 'dayOverview'
    // title should be a string to display in the header
    // the rest are booleans to show/hide elements
    updateHeader: function (showBYULogo, backArrowDestination, title, showName, showSignOut) {
        this.showBYULogo = showBYULogo;
        this.backArrowDestination = backArrowDestination;
        this.showTitle = title;
        this.showName = showName;
        this.showSignOut = showSignOut;

        // Update logo visibility
        if (this.showBYULogo) {
            this.logo.style.display = 'block';
        } else {
            this.logo.style.display = 'none';
        }

        // Update back arrow
        if (this.backArrowDestination) {
            this.backArrow.style.display = 'block';
            this.backArrow.onclick = () => {
                window.loadComponent(this.backArrowDestination);
            };
        } else {
            this.backArrow.style.display = 'none';
        }

        // Update title
        if (this.showTitle) {
            this.headerTitle.style.display = 'block';
            this.headerTitle.textContent = title || 'Y-Time';
        } else {
            this.headerTitle.style.display = 'none';
        }

        // Update name element
        this.nameElement.textContent = (typeof window !== 'undefined' && window.employee && window.employee.name) ? window.employee.name : 'Employee Name'; // Fallback if name is not set
        if (this.showName) {
            this.nameElement.style.display = 'block';
        } else {
            this.nameElement.style.display = 'none';
        }

        // Update sign out button
        if (this.showSignOut) {
            this.signOutBtn.style.display = 'block';
            this.signOutBtn.onclick = () => {
                window.signOut();
            };
        } else {
            this.signOutBtn.style.display = 'none';
        }

    },
    cleanup: function () {
    }
}
