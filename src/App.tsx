import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Home } from './home/Home';
import { Login } from './auth/Login';
import { WaitingScreen } from './auth/WaitingScreen';
import { AppToaster } from './ui/toast';
import './App.css'

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/login' element={<Login />} />
          <Route path='/waiting' element={<WaitingScreen />} />
        </Routes>
      </BrowserRouter>
      <AppToaster />
    </>
  );
}

export default App;
