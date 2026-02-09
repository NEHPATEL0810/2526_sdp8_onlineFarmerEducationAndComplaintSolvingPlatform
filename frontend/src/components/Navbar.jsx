import React, { useState } from "react";
import { motion } from "framer-motion";
import FarmEasyLogo from "../assets/Logo.png";
import { Link } from "react-router-dom";
import LogoShuffle from "./ShufflingLogo";
import LanguageToggle from "./LanguageToggle";
import TranslateText from "./TranslateText";
import FormDialog from "./FormDialog";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ResetPassword from "../pages/ResetPassword";
import ForgotPassword from "../pages/ForgotPassword";
import MarketPrices from "../pages/MarketPrices";
export default function Navbar() {
// const [open, setOpen] = React.useState(false);
//   const handleClickOpen = () => {
//     setOpen(true);
//   };
//   const handleClose = () => {
//     setOpen(false);
//   };
const [openLogin,setOpenLogin] = useState(false);
const [openRegister,setOpenRegister] = useState(false);
const [openForgot,setOpenForgot] = useState(false);
const [openReset,setOpenReset] = useState(false);
  return (
    <nav style={navStyle}>
      <motion.div
        // style={logoContainer}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* <img src={FarmEasyLogo} alt="FarmEasy Logo" style={logoStyle} /> */}
        {/* <LogoShuffle /> */}
        <LanguageToggle />
      </motion.div>

      <div style={menuStyle}>
        <a style={linkStyle} href="#">
          <TranslateText> About Us </TranslateText>
        </a>
   
          <TranslateText>
            <Link style={linkStyle} to="/market-prices"> Education</Link>{" "}
          </TranslateText>

        <a style={linkStyle} href="#">
          <TranslateText> Complaints </TranslateText>
        </a>
       

        <motion.span style={linkStyle} onClick={() => setOpenLogin(true)}>
          <TranslateText>Profile</TranslateText>
        </motion.span>

        <Dialog open={openLogin} onClose={() => setOpenLogin(false)}>
          <DialogContent>
            <Login
              OnRegisterClick={() => {
                setOpenLogin(false);
                setOpenRegister(true);
              }}
              onForgotClick={() => {
                setOpenLogin(false);
                setOpenForgot(true);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={openRegister}
          onClose={() => {
            setOpenRegister(false);
          }}
        >
          <DialogContent>
            <Register
              onBackToLogin={() => {
                setOpenRegister(false);
                setOpenLogin(true);
              }}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={openForgot} onClose={() => setOpenForgot(false)}>
          <DialogContent>
            <ForgotPassword
              onBackToLogin={() => {
                setOpenForgot(false);
                setOpenLogin(true);
              }}
              onResetLinkSent={() => {
                setOpenForgot(false);
                setOpenReset(true);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={openReset} onClose={() => setOpenReset(false)}>
          <DialogContent>
            <ResetPassword
              onBackToLogin={() => {
                setOpenReset(false);
                setOpenLogin(true);
              }}
            />
          </DialogContent>
        </Dialog>
        <a style={linkStyle} href="#">
          <TranslateText>Contact Us </TranslateText>
        </a>
      </div>
    </nav>
  );
}

const navStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right:0,
  width: "100%",
  height: "70px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 2rem",
  backgroundColor: "#4caf50",
  zIndex: 1000,
  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
  borderRadius: "0 0 25px 25px",
};

/* Logo */
const logoContainer = {
  display: "flex",
  alignItems: "center",
  fontSize:"1.2rem",
};

const logoStyle = {
  height: "45px",
  width: "auto",
  cursor: "pointer",
};

const menuStyle = {
  display: "flex",
  alignItems: "center",
//   justifyContent:"right-align",
  gap: "1rem",
//   flexDirection: "row",
  marginRight:"2rem",
};

const linkStyle = {
  color: "#fff",

  textDecoration: "none",
  fontSize: "1.5rem",
  fontWeight: "500",
  padding: "0.5rem 1rem",
  margin: "0 0.5rem",
  transition: "all 0.3s ease",
  cursor:"pointer",
};

const linkHoverStyle = {
  backgroundColor: "#45a049",
  borderRadius: "8px",
};
