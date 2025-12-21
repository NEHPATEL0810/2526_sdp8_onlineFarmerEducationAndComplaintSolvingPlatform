// "use client"
import { motion } from "framer-motion";
import { div } from "motion/react-client";
import { useLanguage } from "../context/LanguageContext";

export default function LanguageToggle(){
    const{
        translationEnabled,
        toggleTranslation,
        toLang,
        setToLang,
    } = useLanguage();

return (
    <div style={wrapper}>
     <select value={toLang} onChange={(e) => setToLang(e.target.value)}disabled={!translationEnabled}>
        <option value="en">English</option>
        <option value="hi">हिन्दी</option> 
        <option value="gu">ગુજરાતી</option>
        <option value="mr">मराठी</option>
        <option value="ta">தமிழ்</option>
        <option value="te">తెలుగు</option>
        <option value="kn">ಕನ್ನಡ</option>
     </select>
    
    <div
    style={{
        ...switchContainer,
        justifyContent:translationEnabled ? "flex-end" : "flex-start",
        backgroundColor:translationEnabled ? "#22cc88" : "#ddd",
    }}
    onClick={toggleTranslation}
    >
        <motion.div 
        style = {switchHandle} 
        layout 
        transition={{ type: "spring",stiffness:700,damping:30}}
        />
    </div>


    </div>
);

}


const wrapper = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const switchContainer = {
  width: "70px",
  height: "36px",
  // backgroundColor: "#ddd",
  borderRadius: "50px",
  padding:"4px",
  display:"flex",
  cursor:"pointer",
  // borderRadius: 20,
  // padding: 5,
  // cursor: "pointer",
  // display: "flex",
};

const switchHandle = {
  width: "28px",
  height: "28px",
  backgroundColor: "#4caf50",
  borderRadius: "50%",
};