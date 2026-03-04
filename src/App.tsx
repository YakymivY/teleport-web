import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Home } from './features/home/Home';
import { Login } from './features/auth/Login';
import { WaitingScreen } from './features/auth/WaitingScreen';
import { AppToaster } from './ui/toast';
import { PublicRoute } from './PublicRoute';
import './App.css'

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route element={<PublicRoute />}>
            <Route path='/login' element={<Login />} />
            <Route path='/waiting' element={<WaitingScreen />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <AppToaster />
    </>
  );
}

export default App;
