import React, { useState } from "react";
import { motion } from "framer-motion";
import FarmEasyLogo from "../assets/Logo.png";
import { Link, useNavigate } from "react-router-dom";
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
import LoginModal from "./LoginModal";
import ElectricBorder from "./ElectricBorder";
export default function Navbar() {
  // const [open, setOpen] = React.useState(false);
  //   const handleClickOpen = () => {
  //     setOpen(true);
  //   };
  //   const handleClose = () => {
  //     setOpen(false);
  //   };
  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);
  const [openForgot, setOpenForgot] = useState(false);
  const [openReset, setOpenReset] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEduDropdown, setShowEduDropdown] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("access");

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

        <div
          style={{ position: "relative", display: "inline-block" }}
          onMouseEnter={() => setShowEduDropdown(true)}
          onMouseLeave={() => setShowEduDropdown(false)}
        >
          <span style={linkStyle}>
            <TranslateText>Education</TranslateText> ▼
          </span>

          {showEduDropdown && (
            <div style={dropdownStyle}>
              <div style={dropdownItemStyle} onClick={() => navigate("/crops")}>
                Crop Encyclopedia
              </div>

              <div style={dropdownItemStyle} onClick={() => navigate("/market-prices")}>
                Market Prices
              </div>

              <div style={dropdownItemStyle} onClick={() => navigate("/agri-schemes")}>
                Agriculture Schemes
              </div>
            </div>
          )}
        </div>


        <div
          style={{ position: "relative" }}
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <span style={linkStyle}>
            <TranslateText>Complaints</TranslateText> ▼
          </span>

          {showDropdown && (
            <div
              style={{
                position: "absolute",
                top: "35px",
                background: "#020617",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "10px",
                minWidth: "150px",
                zIndex: 1000,
              }}
            >
              <div
                style={dropdownItemStyle}
                onClick={() => navigate("/create/doubts")}
              >
                Create Doubt
              </div>

              <div
                style={dropdownItemStyle}
                onClick={() => navigate("/doubts")}
              >
                View My Doubts
              </div>
            </div>
          )}
        </div>



        <motion.span
          style={linkStyle}
          onClick={() => {
            if (isLoggedIn) {
              navigate("/profile");
            } else {
              setOpenLogin(true);
            }
          }}
        >
          <TranslateText>Profile</TranslateText>
        </motion.span>


        {/* <Dialog open={openLogin} onClose={() => setOpenLogin(false)}>
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
        </Dialog> */}

        <Dialog
          open={openLogin}
          onClose={() => setOpenLogin(false)}
          PaperProps={{
            style: {
              background: "transparent",
              boxShadow: "none",
              overflow: "visible",
            },
          }}
        >
          <DialogContent style={{
            padding: 0,
            overflow: "visible",
          }}>
            <ElectricBorder
              color="#4ca750"
              speed={1}
              chaos={0.12}
              borderRadius={16}
              style={{ borderRadius: 16 }}
            >
              <div style={loginCardStyle}>
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

              </div>
            </ElectricBorder>
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
  right: 0,
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


const logoContainer = {
  display: "flex",
  alignItems: "center",
  fontSize: "1.2rem",
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
  marginRight: "2rem",
};

const linkStyle = {
  color: "#fff",

  textDecoration: "none",
  fontSize: "1.5rem",
  fontWeight: "500",
  padding: "0.5rem 1rem",
  margin: "0 0.5rem",
  transition: "all 0.3s ease",
  cursor: "pointer",
};

const linkHoverStyle = {
  backgroundColor: "#45a049",
  borderRadius: "8px",
};


const loginCardStyle = {
  background: "#0f172a",
  padding: "2rem",
  width: "360px",
  borderRadius: "16px",
  color: "#fff",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
};

const dropdownItemStyle = {
  padding: "8px",
  cursor: "pointer",
  color: "#fff",
};

dropdownItemStyle["hover"] = {
  backgroundColor: "#334155",
};

const dropdownStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: "8px",
  padding: "8px 0",
  minWidth: "180px",
  zIndex: 1000,
};
