import { Navigate, Route, Routes } from 'react-router-dom';
import { House } from 'lucide-react';
import { useStore } from './store';
import { TabLayout } from './ui';
import Welcome from './pages/Welcome';
import HomePage from './pages/Home';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import Room from './pages/Room';
import Rooms from './pages/Rooms';
import Automation from './pages/Automation';
import AutomationEdit from './pages/AutomationEdit';
import Energy from './pages/Energy';
import Settings from './pages/Settings';
import ActivityPage from './pages/Activity';

export default function App() {
  const { data, loading } = useStore();

  if (loading && !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand text-white">
        <House size={48} className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md md:max-w-2xl xl:max-w-3xl bg-[#f6f9fe]">
      <Routes>
        {!data ? (
          <Route path="*" element={<Welcome />} />
        ) : (
          <>
            <Route element={<TabLayout />}>
              <Route path="/inicio" element={<HomePage />} />
              <Route path="/dispositivos" element={<Devices />} />
              <Route path="/automacao" element={<Automation />} />
              <Route path="/perfil" element={<Settings />} />
              <Route path="/comodos" element={<Rooms />} />
              <Route path="/comodos/:room" element={<Room />} />
              <Route path="/energia" element={<Energy />} />
              <Route path="/atividade" element={<ActivityPage />} />
            </Route>
            <Route path="/dispositivos/:id" element={<DeviceDetail />} />
            <Route path="/automacao/:id" element={<AutomationEdit />} />
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </>
        )}
      </Routes>
    </div>
  );
}
