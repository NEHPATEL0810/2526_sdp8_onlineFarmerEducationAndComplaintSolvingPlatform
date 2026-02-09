import {useState} from "react";
import {useParams,useNavigate} from "react-router-dom";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";

function ResetPassword({onBackToLogin}){
    const {uid,token}=useParams();
    const navigate=useNavigate();

    const [password,setPassword]=useState("");
    const [confirm,setConfirmPassword]=useState("");
    const [error,setError]=useState("");

    const handleSubmit=async (e)=>{
        e.preventDefault();

        if(password!== confirm){
            setError("Password do not match");
            return;
        }

        const res=await fetch(`${API_BASE_URL}/auth/reset-password/`,{
            method: "POST",
            headers:{
                "Content-Type":"application/json",
            },
            body:JSON.stringify({
                uid,
                token,
                new_password:password,
            }),
        });

        const data=await res.json();

        if(res.ok){
            alert("Password reset successful");
            // navigate("/login");
            onBackToLogin();
        }
        else{
            setError(data.error || "Reset link invalid or expired");
        }
    };
    return(
        <div>
            <h2><TranslateText>Reset Password</TranslateText></h2>
            <form onSubmit={handleSubmit}>
                <input type="password" placeholder="New Password" value={password} onChange={(e)=>setPassword(e.target.value)} required/>
                <input type="password" placeholder="Confirm Password" value={confirm} onChange={(e)=>setConfirmPassword(e.target.value)} required/>

                <button type="submit"><TranslateText>Reset Password</TranslateText></button>
            </form>
            {error && <p style={{color:"red"}}>{error}</p>}
        </div>
    )
}

export default ResetPassword;