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

    // there is code inside the svg that handles the loading animation
    // so we must load the svg content and insert it into the page
    // rather than using an <img> tag
    loadMedallion: async function () {
        await fetch('assets/byu_medallion.svg')
            .then(response => response.text())
            .then(svgText => {
                const container = document.getElementById('byu-medallion');
                container.innerHTML = svgText;
            });
    }
}

function createSquare(positionClass, onTap) {
    console.log(`Creating square at position: ${positionClass}`);
    const square = document.createElement('div');
    square.className = `square ${positionClass}`;

    // Show the square on touch or mouse down
    const show = () => square.style.opacity = 0.2;
    const hide = () => square.style.opacity = 0;

    // Event handling
    square.addEventListener('mousedown', e => { show(); onTap(); });
    square.addEventListener('mouseup', hide);
    square.addEventListener('touchstart', e => { show(); onTap(); });
    square.addEventListener('touchend', hide);

    document.body.appendChild(square);
    return square;
}

 // v Z-Pattern Stuff Below v
let topLeft, topRight, bottomLeft, bottomRight;

topLeft = createSquare('top-left', () => {
    if (!topRight) {
        topRight = createSquare('top-right', () => {
            if (!bottomLeft) {
                bottomLeft = createSquare('bottom-left', () => {
                    if (!bottomRight) {
                        bottomRight = createSquare('bottom-right', () => {
                            window.location.href = 'http://localhost:10000/dashboard/overview';
                        });
                    }
                });
            }
        });
    }
});




// Clean up all but topLeft after 20 seconds
setTimeout(() => {
    [topRight, bottomLeft, bottomRight].forEach(sq => {
        if (sq && sq.parentElement) sq.remove();
    });
    topRight = bottomLeft = bottomRight = null;
}, 20000);

let cosmoSquare = createSquare('cosmo-square', () => {
    // Cosmo square tap handler
    console.log('Cosmo square tapped');
    const cosmo = document.getElementById("cosmo");
    cosmo.classList.add("cosmo-slide");
    cosmo.classList.remove("cosmo-hide");
    setTimeout(() => {
      cosmo.classList.remove("cosmo-slide");
      cosmo.classList.add("cosmo-hide");
    }, 4000);
});
