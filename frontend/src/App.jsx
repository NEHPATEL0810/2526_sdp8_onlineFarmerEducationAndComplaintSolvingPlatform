import "./App.css";
import { BrowserRouter,Routes,Route,useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LandingPage from "./pages/LandingPage.jsx";
import HomePage from "./pages/Homepage.jsx";
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

function AnimatedRoutes(){
  const location = useLocation()

  return(
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
      </Routes>
    </AnimatePresence>
  )
}

export default function App(){
  return(
    <BrowserRouter>
    <AnimatedRoutes />
    </BrowserRouter>
  )
}



