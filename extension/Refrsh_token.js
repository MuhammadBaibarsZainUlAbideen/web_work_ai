export async function sending_Refresh_token(message){
    console.log("azx")

    if(message){
        console.log("as")
        const result = await chrome.storage.local.get(["Refresh_token"])
        console.log("Refrsh_token ->", result)
        const Refresh_token = result.Refresh_token
        console.log(Refresh_token)
        if(!Refresh_token){
             console.log("2qa")

            return "No"
        }



        console.log("2qa")

        const sending_refresh_token = await fetch("https://webworkai-production.up.railway.app/refresh_token",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({Refresh_token:Refresh_token})
        })
        console.log("as")
        const json_convertion = await sending_refresh_token.json()
        console.log(json_convertion)
        if(json_convertion.Data != "No"){
            console.log("as1")
            chrome.storage.local.set({"Access_token":json_convertion.Data})
            return;

        }else{
            console.log(json_convertion.Data)
            return json_convertion.Data

        }

    }
    return true;


         



} 