import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

/**
 * MSW mocking is available for local development only.
 * Run `npm run dev:mock` to enable it.
 * See docs/STANDALONE_DEVELOPMENT.md for details.
 */

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
