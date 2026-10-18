import { createRoot } from "react-dom/client";
import WelcomePage from "@/app/page";
import CalibratePage from "@/app/calibrate/page";
import TestPage from "@/app/test/page";
import ResultsPage from "@/app/results/page";
import { AppStateProvider } from "@/state/AppState";
import { usePath } from "./router";

const ROUTES: Record<string, () => React.JSX.Element | null> = {
  "/": WelcomePage,
  "/calibrate": CalibratePage,
  "/test": TestPage,
  "/results": ResultsPage,
};

function App() {
  const path = usePath();
  const Page = ROUTES[path] ?? WelcomePage;
  return <Page />;
}

createRoot(document.getElementById("root")!).render(
  <AppStateProvider>
    <App />
  </AppStateProvider>,
);
