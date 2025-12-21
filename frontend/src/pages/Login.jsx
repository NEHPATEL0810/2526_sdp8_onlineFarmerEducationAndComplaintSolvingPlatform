import {useState} from "react"
import API_BASE_URL from "../services/api";

function Login(){
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
    return(
        <div>
            <h1>Login</h1>
            <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange}/>
            <br/>
            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange}/>
            <br/>
            <button onClick={handleSubmit}>Login</button>
            <p>
                <a href="/forgot-password">Forgot Password?</a>
            </p>
        </div>
    )
}
export default Login;