export async function translateText(text,from,to){
    const response = await fetch("http://localhost:8000/api/translate/",{
    method:"POST",
    headers:{
        "Content-Type":"application/json",
    },
    body: JSON.stringify({
        text,
        source_lang:from,
        target_lang:to,
    }),  
    });

    const data = await response.json();
    return data.translatedText;
}