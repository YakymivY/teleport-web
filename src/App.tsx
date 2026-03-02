import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Home } from './home/Home';
import { Login } from './auth/Login';
import './App.css'
import { AppToaster } from './ui/toast';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/login' element={<Login />} />
        </Routes>
      </BrowserRouter>
      <AppToaster />
    </>
  );
}

export default App;
