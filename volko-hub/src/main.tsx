import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { TrpcProvider } from "./providers/trpc";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <TrpcProvider>
        <App />
      </TrpcProvider>
    </BrowserRouter>
  </StrictMode>
);
