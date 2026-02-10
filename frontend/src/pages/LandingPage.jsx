import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FallingLeaves from "../components/FallingLeaves";
import FarmEasyLogo from "../assets/Logo.png";
import { useState, useEffect } from "react";
import TranslateText from "../components/TranslateText";
import axios from "axios";
const FINAL_SEQUENCE = [
  { id: 1, text: "Fa", color: "#2e7d32" },
  { id: 2, text: "rm", color: "#388e3c" },
  { id: 3, text: "Ea", color: "#4caf50" },
  { id: 4, text: "sy", color: "#66bb6a" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  // const handleGetStarted = () => {
  //     navigate("/home")
  // }


  
    const [blocks, setBlocks] = useState(FINAL_SEQUENCE);
    const [isShuffling, setIsShuffling] = useState(true);

    const [message, setMessage] = useState("");

    useEffect(() => {
      axios
        .get("http://127.0.0.1:8000/test/")
        .then((res) => setMessage(res.data.message))
        .catch((err) => console.error(err));
    }, []);

    useEffect(() => {
      if (!isShuffling) return;

      const shuffleInterval = setInterval(() => {
        setBlocks((prev) => shuffle([...prev]));
      }, 300);

      const stopShuffle = setTimeout(() => {
        setIsShuffling(false);
        setBlocks(FINAL_SEQUENCE);
      }, 2000);

      return () => {
        clearInterval(shuffleInterval);
        clearTimeout(stopShuffle);
      };
    }, [isShuffling]);

    return (
      <>
        {/* <h1>{message}</h1> */}
        {/* <FallingLeaves /> */}
        <motion.div>
          <img src={FarmEasyLogo} className="logo" alt="FarmEasy logo" />
        </motion.div>

        <ul style={container}>
          {blocks.map((block) => (
            <motion.li
              key={block.id}
              layout
              transition={spring}
              style={{ ...moveItem, backgroundColor: block.color }}
            >
              {block.text}
            </motion.li>
          ))}
        </ul>

        <div className="card">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/home")}
          >
            <TranslateText>Get Started</TranslateText>
          </motion.button>
          <p>
            <TranslateText>Enhance Your knowledge with farming and get use to with our App.
          Start your journey towards smarter farming with FarmEasy!</TranslateText>
          </p>
        </div>

        <p className="read-the-docs">
          <TranslateText>FarmEasy - Online Farmer education and doubt solving app</TranslateText>
        </p>
      </>
    );
  }

  function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
  }

  const spring = {
    type: "spring",
    stiffness: 300,
    damping: 20,
  };

  const container = {
    listStyle: "none",
    padding: 0,
    margin: "20px auto",
    display: "flex",
    gap: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    position: "relative",
  };

  const moveItem = {
    width: 100,
    height: 90,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "5rem",
    fontWeight: "bold",
    color: "#fff",
  };

