import { Route, Routes } from "react-router";
import { Layout, RequireAuth } from "./components/Layout";
import AppointmentDetail from "./pages/AppointmentDetail";
import Appointments from "./pages/Appointments";
import Dashboard from "./pages/Dashboard";
import DoctorDetail from "./pages/DoctorDetail";
import Doctors from "./pages/Doctors";
import Landing from "./pages/Landing";
import { Login, Register } from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PredictionDetail from "./pages/PredictionDetail";
import Predictions from "./pages/Predictions";
import Profile from "./pages/Profile";
import SymptomChecker from "./pages/SymptomChecker";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="doctors/:id" element={<DoctorDetail />} />
        <Route path="app">
          <Route
            index
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="check"
            element={
              <RequireAuth role="patient">
                <SymptomChecker />
              </RequireAuth>
            }
          />
          <Route
            path="predictions"
            element={
              <RequireAuth>
                <Predictions />
              </RequireAuth>
            }
          />
          <Route
            path="predictions/:id"
            element={
              <RequireAuth>
                <PredictionDetail />
              </RequireAuth>
            }
          />
          <Route
            path="appointments"
            element={
              <RequireAuth>
                <Appointments />
              </RequireAuth>
            }
          />
          <Route
            path="appointments/:id"
            element={
              <RequireAuth>
                <AppointmentDetail />
              </RequireAuth>
            }
          />
          <Route
            path="profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
