document.addEventListener('DOMContentLoaded', async () => {
    window.apiService = await new ApiService();
    window.timeService = undefined;
    window.employee = undefined;
    window.curYear = null;
    window.curMonth = null;
    window.curDay = null;
    window.shownInternationalWarning = false;

    currentComponent = 'login'; // default component
    await loadHeader('header');
    loadComponent(currentComponent);

    // after 30 seconds of inactivity, show the screensaver
    let inactivityTimeout;
    function resetInactivityTimeout() {
        window.hideScreensaver();
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
            window.showScreensaver();
        }, 300000); // 30 seconds
    }
    // Reset inactivity timeout on user interaction
    document.addEventListener('mousemove', resetInactivityTimeout);
    document.addEventListener('keydown', resetInactivityTimeout);
    resetInactivityTimeout(); // Initialize the timeout
});

async function loadComponent(componentName, divQuerySelector = `.component-container`) {
    // Only call cleanup if the primary component, won't call cleanup on smaller components
    // like the keypad, which is a child component of the login component
    if (window.components?.[currentComponent]?.cleanup && divQuerySelector === `.component-container`) {
        window.components[currentComponent].cleanup();
    }

    const htmlPath = `./components/${componentName}/${componentName}.html`;
    const jsPath = `./components/${componentName}/${componentName}.js`;
    const cssPath = `./components/${componentName}/${componentName}.css`;

    // load the css
    const oldStylesheet = document.getElementById('component-stylesheet');
    if (oldStylesheet && divQuerySelector === `.component-container`) {
        oldStylesheet.remove();
    }

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = cssPath;
    stylesheet.id = 'component-stylesheet';
    stylesheet.onload = () => {
        const module = window.components?.[componentName];
        if (module?.loadStyles) {
            module.loadStyles();
        }
    }

    document.head.appendChild(stylesheet);

    // load the html
    const componentContainer = document.querySelector(divQuerySelector);
    componentContainer.classList.add('loading'); // hide before loading
    const response = await fetch(htmlPath);
    const html = await response.text();
    componentContainer.innerHTML = html;

    // load the js
    const oldScript = document.getElementById('component-script');
    if (oldScript) {
        oldScript.remove();
    }

    const script = document.createElement('script');
    script.src = jsPath;
    script.id = 'component-script';
    // call loadPage on the new component
    script.onload = () => {
        const module = window.components?.[componentName];
        if (module?.loadPage) {
            module.loadPage();
            if (divQuerySelector === `.component-container`) {
                // If it's the main component, track the current component
                currentComponent = componentName;
            }
        }
        componentContainer.classList.remove('loading'); // finally show it
    };
    document.body.appendChild(script);
}

loadHeader = async function (componentName) {
    const header = document.querySelector('.header');
    // clear existing header children
    header.innerHTML = '';

    const htmlPath = `./components/${componentName}/${componentName}.html`;
    const jsPath = `./components/${componentName}/${componentName}.js`;

    // load the html
    await fetch(htmlPath)
        .then(response => response.text())
        .then(html => {
            header.innerHTML = html;
            document.body.insertBefore(header, document.body.firstChild);
        })
        .catch(error => console.error('Error loading header:', error));
    
    // load the js
    const script = document.createElement('script');
    script.src = jsPath;
    script.onload = () => {
        const module = window.components?.[componentName];
        if (module?.initialize) {
            module.initialize();
        }
    };
    document.body.appendChild(script);
}

window.showScreensaver = function () {
    // Remove any existing screensaver first
    window.hideScreensaver();
    window.signOut();

    // reset id-entry
    window.components.keypad.clearIdEntry();
    
    const screensaver = document.createElement('div');
    screensaver.id = 'screensaver';
    screensaver.className = 'screensaver';

    const time = document.createElement('h1');
    time.id = 'screensaver-time';
    // Show time with seconds
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    screensaver.appendChild(time);

    const message = document.createElement('p');
    screensaver.appendChild(message);

    document.body.appendChild(screensaver);

    // Start interval to update time every second
    window.screensaverTimeInterval = setInterval(() => {
        const timeElem = document.getElementById('screensaver-time');
        if (timeElem) {
            timeElem.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }, 1000);
};

// Clear the interval when hiding the screensaver
window.hideScreensaver = function () {
    const screensaver = document.getElementById('screensaver');
    if (screensaver) {
        screensaver.remove();
    }
    if (window.screensaverTimeInterval) {
        clearInterval(window.screensaverTimeInterval);
        window.screensaverTimeInterval = null;
    }
};

window.loadDayOverview = function (day) {
    window.dayOverviewDay = day; // Store the day for the overvie
    loadComponent('dayOverview', `.component-container`);
}

window.signOut = function () {
    // Clear the window objects
    window.employee = undefined;
    window.curYear = null;
    window.curMonth = null;
    window.shownInternationalWarning = false;
    // Reset the current component to login
    currentComponent = 'login';
    // Load the login component
    loadComponent(currentComponent);
}

window.showPopup = function (title, message) {
    const popupContainer = document.querySelector('.popup-container');
    const popupHeader = popupContainer.querySelector('.popup-header');
    const popupMessage = popupContainer.querySelector('.popup-message');

    popupHeader.textContent = title;
    popupMessage.textContent = message;

    popupContainer.style.visibility = 'visible';
}

window.hidePopup = function () {
    const popupContainer = document.querySelector('.popup-container');
    
    // clear the popup content, title, and buttons
    const popupHeader = popupContainer.querySelector('.popup-header');
    const popupMessage = popupContainer.querySelector('.popup-message');
    const popupButtons = popupContainer.querySelector('.popup-buttons');
    
    popupHeader.textContent = '';
    popupMessage.textContent = '';
    popupButtons.innerHTML = '';

    popupContainer.style.visibility = 'hidden';
}

window.showErrorPopup = function (message) {
    window.showPopup('Error', message);
    const popupButtons = document.querySelector('.popup-buttons');
    const okButton = document.createElement('button');
    okButton.textContent = 'Dismiss';
    okButton.className = 'close-error-btn';
    okButton.onclick = () => {
        window.hidePopup();
    };
    popupButtons.appendChild(okButton);
}
