import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import TranslateText from "../components/TranslateText";

export default function HomePage(){
    return (
      <>
         <Navbar />
        <motion.div
          initial={{ x: "100vw", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div style={{ padding: "2rem" }}>
            <h1>
              <TranslateText>Welcome to FarmEasy🌱</TranslateText>
            </h1>
            <p>
              <TranslateText>Your Farming Companion starts here</TranslateText>
            </p>
          </div>
        </motion.div>
      </>
    );
}