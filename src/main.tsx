import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { GatekeeperConsole } from "./apps/gatekeeper/GatekeeperConsole";
import { LedgerBook } from "./apps/ledger/LedgerBook";
import { LensSearch } from "./apps/lens/LensSearch";
import { PilahInbox } from "./apps/pilah/PilahInbox";
import { Lobby } from "./lobby/Lobby";
import { NotFound } from "./NotFound";
import "./styles/brand.css";

const router = createBrowserRouter([
  { path: "/", element: <Lobby /> },
  { path: "/dispatch", element: <PilahInbox /> },
  { path: "/pilah", element: <PilahInbox /> },
  { path: "/gatekeeper", element: <GatekeeperConsole /> },
  { path: "/lens", element: <LensSearch /> },
  { path: "/ledger", element: <LedgerBook /> },
  { path: "*", element: <NotFound /> },
]);

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
