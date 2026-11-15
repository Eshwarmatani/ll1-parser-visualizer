/**
 * LL(1) Predictive Parser - Application Entry Point
 * Bootstraps the application on DOMContentLoaded.
 */

document.addEventListener('DOMContentLoaded', () => {
    window.appUI = new UIController();
    window.appUI.init();
    console.log('LL(1) Predictive Parser Visualizer successfully initialized.');
});

