import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Home } from './home/Home';
import { Login } from './auth/Login';
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
