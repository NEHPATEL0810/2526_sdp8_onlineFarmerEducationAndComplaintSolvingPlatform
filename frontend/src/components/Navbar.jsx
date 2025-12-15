import { nav, p } from "motion/react-client";

export default function Navbar() {
    return(
        <nav style={navStyle}>
            <h2>FarmEasy</h2>
            <div style={tstyle}>
                <a href="#">Home</a>
                <a href="#">Education</a>
                <a href="#">Complaints</a>
                <a href="#">Profile</a>
                <a href="#">Contact Us</a>
                <a href="#">About Us</a>
            </div>
        </nav>
    )
}

const navStyle = {
display:"flex",
justifyContent:"space-between",
alignItems:"center",
padding:"1rem 2rem",
backgroundColor:"#4caf50",
margin:"0",
position:"sticky",
top:"0",
zIndex:"10",
boxShadow:"0 2px 4px rgba(0,0,0,0.1)",
// color:"#fff"
}

const tstyle={
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    padding:"0 1rem",
    gap:"1rem",
    listStyle:"none",
    color:"#fff",

}