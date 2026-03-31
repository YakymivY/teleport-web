import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Login } from './features/auth/Login';
import { WaitingScreen } from './features/auth/WaitingScreen';
import { Dashboard } from './features/dashboard/Dashboard';
import { AppToaster } from './ui/toast';
import { PublicRoute } from './PublicRoute';
import { PrivateRoute } from './PrivateRoute';
import { TooltipProvider } from './ui/Tooltip';
import './App.css'

function App() {
  return (
    <TooltipProvider>
      <>
        <BrowserRouter>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path='/' element={<Dashboard />} />
            </Route>
            <Route element={<PublicRoute />}>
              <Route path='/login' element={<Login />} />
              <Route path='/waiting' element={<WaitingScreen />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <AppToaster />
      </>
    </TooltipProvider>
  );
}

export default App;
