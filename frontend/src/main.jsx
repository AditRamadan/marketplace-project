import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./i18n";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Ganti dengan Client ID asli Anda dari Google Cloud Console
const GOOGLE_CLIENT_ID =
  "1010119047462-4a4rddngsqjt22p39a4ip36v442u9n30.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
