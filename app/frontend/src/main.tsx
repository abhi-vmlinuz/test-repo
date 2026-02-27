import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

/**
 * Dynamic Mocking Activation
 * Ensures that the Service Worker is registered BEFORE the app 
 * attempts initial data fetching (e.g., auth check).
 */
async function enableMocking() {
    if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
        return Promise.resolve();
    }

    const { worker } = await import('./mocks/browser');

    // 'onUnhandledRequest: bypass' ensures static assets and 
    // external CDNs aren't blocked by the worker.
    return worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
            url: '/mockServiceWorker.js',
        },
    });
}

enableMocking().then(() => {
    ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
});
