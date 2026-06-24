import {sending_Refresh_token} from "./Refrsh_token.js"
export async function getStoredCrumbs(){
    let result = await chrome.storage.local.get(["Access_token"]);
    let access_token = result.Access_token;


    
    let data = await getCrumbs(access_token)



   
    if (data.reason === "token_expired") {
        access_token = await sending_Refresh_token("True");

        if (access_token) {
            data = await getCrumbs(access_token); 
        } else {
            resulElementtDiv.innerText = "Something Went Wrong Contact Support"
            return
        }
    }

    if (data.Status === "True") {
        return data.Crumbs
    }



}

async function getCrumbs(access_token){
    let data =  await fetch("https://api.asolve.me/crumbs",{
        method:"POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access_token}`
        }

    })
    let dataJsonConversion = await data.json()
    return dataJsonConversion

}
