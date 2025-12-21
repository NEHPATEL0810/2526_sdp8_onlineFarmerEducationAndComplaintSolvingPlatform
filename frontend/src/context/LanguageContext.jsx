import { createContext,useContext,useState } from "react";

const LanguageContext = createContext();

export function LanguageProvider({ children }){
    const [translationEnabled,setTranslationEnabled] = useState(false);
    // const[fromLang,setFromLang] = useState("en");
    const [toLang,setToLang] = useState("hi");
    const fromLang = "en";
    const toggleTranslation = () => {
        if(translationEnabled){
            setTranslationEnabled(false);
            setToLang("en");
        }
        else{
            setTranslationEnabled(true);
        }
    };
    return(
        <LanguageContext.Provider value ={{
            translationEnabled,
            toggleTranslation,
            fromLang,
            toLang,
            setToLang,
        }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () =>{ 
    const context = useContext(LanguageContext)
    if(!context){
        throw new Error("useLanguage must be used inside LanguageProvider");
    }
    return context;
    };