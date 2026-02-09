import "./App.css";
import { BrowserRouter,Routes,Route,useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage.jsx";
import HomePage from "./pages/Homepage.jsx";
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Register from './pages/Register.jsx';
import MarketPrices from './pages/MarketPrices.jsx';
import AgriSchemes from "./pages/AgriSchemes.jsx";
import CropList from "./pages/CropList.jsx";
import MyDoubts from "./pages/MyDoubts.jsx";
import CreateDoubt from "./pages/CreateDoubt.jsx";
import Profile from "./pages/Profile.jsx";

const withNavbar = (Page) => (
  <>
    <Navbar />
    <div style={{ paddingTop: "90px", minHeight: "100vh" }}>
      <Page />
    </div>
  </>
);

function AnimatedRoutes(){
  const location = useLocation()

  return(
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={withNavbar(Login)}/>
        <Route path="/register" element={withNavbar(Register)}/>
        <Route path="/forgot-password" element={withNavbar(ForgotPassword)}/>
        <Route path="/reset-password/:uid/:token" element={withNavbar(ResetPassword)}/>
        <Route path="/market-prices" element={<MarketPrices/>}/>
        <Route path="/agri-schemes" element={<AgriSchemes/>}/>
        <Route path="/crops" element={<CropList/>}/>
        <Route path="/doubts" element={<MyDoubts/>}/>
        <Route path="/create/doubts" element={<CreateDoubt/>}/>
        <Route path="/profile" element={<Profile />} />

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



