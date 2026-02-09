import { useEffect, useState } from "react";
import API_BASE_URL from "../services/api";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
function Profile() {
  const [user, setUser] = useState(null);
  const navigate=useNavigate();
  
  useEffect(() => {
    fetch(`${API_BASE_URL}/education/profile/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error(err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/");
  };

  if (!user) return <p>Loading...</p>;

  return (
    <>
      <Navbar />
      <div style={{ padding: "100px 20px" }}>
        <h2>👤 My Profile</h2>

        <p><b>Username:</b> {user.username}</p>
        <p><b>Email:</b> {user.email}</p>
        <p><b>Mobile:</b> {user.mobile_number}</p>
        <p><b>Role:</b> {user.role}</p>

        <br />
        <button onClick={handleLogout}>Logout</button>
      </div>
    </>
  );
}

export default Profile;
