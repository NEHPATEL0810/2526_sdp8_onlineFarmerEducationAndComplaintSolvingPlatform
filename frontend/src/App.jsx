import "./App.css";
import { BrowserRouter,Routes,Route,useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LandingPage from "./pages/LandingPage.jsx";
import HomePage from "./pages/Homepage.jsx";
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Register from './pages/Register.jsx';
import MarketPrices from './pages/MarketPrices.jsx';

function AnimatedRoutes(){
  const location = useLocation()

  return(
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
        <Route path="/forgot-password" element={<ForgotPassword/>}/>
        <Route path="/reset-password/:uid/:token" element={<ResetPassword/>}/>
        <Route path="/market-prices" element={<MarketPrices/>}/>
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



