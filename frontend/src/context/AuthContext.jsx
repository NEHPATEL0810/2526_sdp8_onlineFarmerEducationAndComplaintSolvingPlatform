import { createContext,useContext,useState,useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user,setUser] = useState(null);
    const [isAuthenticated,setIsAuthenticated] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if(storedUser && token){
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);

        }
    },[]);

    const login = (userData,token) => {
        localStorage.setItem("user",JSON.stringify(userData));
        localStorage.setItem("token",token);
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{user,isAuthenticated,login,logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
