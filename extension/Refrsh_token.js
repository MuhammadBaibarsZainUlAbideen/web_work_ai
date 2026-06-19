export async function sending_Refresh_token(message){

    if(message){
        const result = await chrome.storage.local.get(["Refresh_token"])
        const Refresh_token = result.Refresh_token
        if(!Refresh_token){
            return "No"
        }




        const sending_refresh_token = await fetch("http://127.0.0.1:8000/refresh_token",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({Refresh_token:Refresh_token})
        })
        const json_convertion = await sending_refresh_token.json()
        if(json_convertion.Data != "No"){
            chrome.storage.local.set({"Access_token":json_convertion.Data})
            return json_convertion.Data;

        }else{
            return json_convertion.Data

        }

    }
    return true;


         



} 