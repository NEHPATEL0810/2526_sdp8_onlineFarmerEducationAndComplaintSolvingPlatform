import {useState} from 'react'
import API_BASE_URL from '../services/api';

function ForgotPassword({ onBackToLogin }){
    const [email,setEmail]=useState("");
    const [message,setMessage]=useState("");

    const handleSubmit=async(e)=>{
        e.preventDefault();
        const res=await fetch(`${API_BASE_URL}/auth/forgot-password/`,{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
            },
            body:JSON.stringify({email}),
        });

        const data=await res.json();
        if(res.ok){
            alert("Password reset link sent to your email");
            setMessage("If an account with that email exists, a reset link has been sent.");
        }
        else{
            alert(data.error || "Something went wrong");
        }
    };
    return(
        <div>
            <h2>Forgot Password</h2>
            <form onSubmit={handleSubmit}>
                <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required/>
                <button type="submit">Send Reset Link</button>
            </form>
            {message && <p>{message}</p>}

        <p
        style={{color:"green",cursor:"pointer",marginTop:"1rem"}}
        onClick={onBackToLogin}
        >
            Back to Login
        </p>

        </div>
    )
}
export default ForgotPassword;