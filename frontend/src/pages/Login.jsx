import {useState} from "react"
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
// import Dialog from "@mui/material/Dialog";
// import DialogContent from "@mui/material/DialogContent";
function Login({OnRegisterClick,onForgotClick}){
    const [formData,setFormData]=useState({
        username:"",
        email:"",
        password:"",
    });

    const handleChange=(e)=>{
        setFormData({
            ...formData,
            [e.target.name]:e.target.value,
        });
    };

    const handleSubmit=async(e)=>{
        e.preventDefault();
        const response=await fetch(`${API_BASE_URL}/auth/login/`,{
            method:"POST",
            headers:{
                'Content-Type':"application/json",
            },
            body: JSON.stringify(formData),
        });
        const data=await response.json();

        if(response.status===200){
            localStorage.setItem("accress",data.access);
            localStorage.setItem("refresh",data.refresh);

            alert("Login successful");
            setFormData({username:"",password:""});

        }
        else{
            alert(JSON.stringify(data));
        }
    };
    return (
      <div>
        <h1>
          <TranslateText>Login</TranslateText>
        </h1>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
        />
        <br />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
        />
        <br />
        <button onClick={handleSubmit}>Login</button>
        <br />
               <p
               style={{ color:"green",cursor:"pointer",
                 marginTop:"1rem"
               }}
               onClick={onForgotClick}
               >
                 Forgot Password?
               </p>

        <p style={{marginTop:"1rem" }}>
            Don't Have an account?{" "}
            <span
             style={{
                color:"green",
                cursor:"pointer",
             }}
             onClick={OnRegisterClick}>
                Register
            </span>
        </p>
      </div>
    );
}
export default Login;


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