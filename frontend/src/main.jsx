import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "14px",
              fontFamily: "inherit",
              fontSize: "14px",
              background: "#111a2e",
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 16px 40px -16px rgba(0,0,0,0.7)",
            },
            success: { iconTheme: { primary: "#22c55e", secondary: "#0a101d" } },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#0a101d" } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
