import {sending_Refresh_token} from "./Refrsh_token.js"
export async function getStoredCrumbs(){
    console.log('1')
    let result = await chrome.storage.local.get(["Access_token"]);
    console.log(result.Access_token)
    let access_token = result.Access_token;
    console.log('1')


    
    let data = await getCrumbs(access_token)
    console.log('1')



   
    if (data.reason === "token_expired") {
        console.log('1')
        console.log("Token expired, refreshing...");
        access_token = await sending_Refresh_token("True");
        console.log('1')

        if (access_token) {
            console.log('1')
            data = await getCrumbs(access_token); 
            console.log('1')
        } else {
            console.log("Refresh token invalid. Forcing local logout.");
            return;
            chrome.storage.local.remove(["Access_token", "Refresh_token"]);
            return;
        }
    }

    if (data.Status === "True") {
        console.log(data.Crumbs)
        return data.Crumbs
    }



}

async function getCrumbs(access_token){
    console.log('11')
    let data =  await fetch("https://marksup-hjgvdbdbdmhdbff7.eastus2-01.azurewebsites.net/crumbs",{
        method:"POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access_token}`
        }

    })
    let dataJsonConversion = await data.json()
    console.log(dataJsonConversion)
    return dataJsonConversion

}
