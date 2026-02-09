import {useState} from "react"
import {useNavigate} from "react-router-dom";
import API_BASE_URL from "../services/api"
import TranslateText from "../components/TranslateText";

function Register({ onBackToLogin }){
    const navigate=useNavigate();
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
        const response=await fetch(`${API_BASE_URL}/auth/register/`,{
            method: "POST",
            headers:{
                "Content-Type":"application/json",
            },
            body:JSON.stringify(formData),
        });
        const data=await response.json();

        if(response.status===201){
            alert("Registration successful");
            setFormData({username:"",email:"",password:""});
            // navigate('/login');
            onBackToLogin();
        }
        else{
            alert(JSON.stringify(data));
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text);
        }

    };
    return(
        <div style= {{ minWidth:"300px" }}>
            <h2><TranslateText>Register</TranslateText></h2>
            <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange}/>
            <br/>
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange}/>
            <br/>
            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange}/>
            <br/>
            <input type="text" name="mobile_number" placeholder="Mobile Number" onChange={handleChange}/>
            <br/>
            <button onClick={handleSubmit}><TranslateText>Register</TranslateText></button>
             <p style={{ marginTop:"1rem" }}>
                <TranslateText>Already have an account?</TranslateText>{" "}
                <span
                style={{
                    cursor:"pointer",
                    color:"green",
                }}
                onClick={onBackToLogin}>
                    <TranslateText>Login</TranslateText>
                </span>
             </p>
        </div>
    )
}
export default Register;