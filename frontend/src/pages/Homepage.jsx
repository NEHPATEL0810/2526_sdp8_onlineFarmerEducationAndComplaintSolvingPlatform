import { motion } from "framer-motion";
import Navbar from "../components/Navbar";

export default function HomePage(){
    return(
        <motion.div
        initial={{ x:"100vw",opacity:0}}
        animate={{x:0,opacity:1}}
        exit={{opacity:0}}
        transition={{duration:0.8}}
        >
            <Navbar />
            <div style={{padding:"2rem"}}>
                <h1>Welcome to FarmEasy🌱</h1>
                <p>Your Farming Companion starts here</p>
            </div>

        </motion.div>
    )
}