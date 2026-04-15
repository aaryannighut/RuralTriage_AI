import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { TalkToDoctor } from "./pages/TalkToDoctor";
import { CheckSymptoms } from "./pages/CheckSymptoms";
import { FindMedicines } from "./pages/FindMedicines";
import { HealthRecords } from "./pages/HealthRecords";
import { HealthTips } from "./pages/HealthTips";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Privacy } from "./pages/Privacy";
import { NotFound } from "./pages/NotFound";
import { HealthDashboard } from "./pages/HealthDashboard";
import { PharmaAdmin } from "./pages/PharmaAdmin";
import { DoctorAdmin } from "./pages/DoctorAdmin";
import { TestCall } from "./pages/TestCall";
import { TestChat } from "./pages/TestChat";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "talk-to-doctor", Component: TalkToDoctor },
      { path: "check-symptoms", Component: CheckSymptoms },
      { path: "find-medicines", Component: FindMedicines },
      { path: "health-records", Component: HealthRecords },
      { path: "health-tips", Component: HealthTips },
      { path: "about", Component: About },
      { path: "contact", Component: Contact },
      { path: "privacy", Component: Privacy },
      { path: "dashboard", Component: HealthDashboard },
      { path: "pharma", Component: PharmaAdmin },
      { path: "doctors", Component: DoctorAdmin },
      { path: "test-call", Component: TestCall },
      { path: "test-chat", Component: TestChat },
      { path: "*", Component: NotFound },
    ],
  },
]);
