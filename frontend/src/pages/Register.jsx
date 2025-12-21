import {useState} from "react"
import {useNavigate} from "react-router-dom";
import API_BASE_URL from "../services/api"

function Register(){
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
            navigate('/login');
        }
        else{
            alert(JSON.stringify(data));
        }
    };
    return(
        <div>
            <h2>Register</h2>
            <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange}/>
            <br/>
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange}/>
            <br/>
            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange}/>
            <br/>
            <input type="text" name="mobile_number" placeholder="Mobile Number" onChange={handleChange}/>
            <br/>
            <button onClick={handleSubmit}>Register</button>

        </div>
    )
}
export default Register;