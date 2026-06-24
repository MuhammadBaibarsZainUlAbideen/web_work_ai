let resulElementtDiv = document.getElementById("result");
document.addEventListener("DOMContentLoaded",async function(){
    let result = await chrome.storage.local.get(["Access_token"]);
    let access_token = result.Access_token;
    let data = await Check_request(access_token);
    if (data.reason === "token_expired") {
        access_token = await refreshAccessToken();
        if (access_token) {
            data = await Check_request(access_token); 
            is_premium(data)
        } 
    }else{
        is_premium(data)
    }




})

export async function relaoad() {
    let result = await chrome.storage.local.get(["Access_token"]);
    let access_token = result.Access_token;
    let data = await Check_request(access_token);
    if (data.reason === "token_expired") {
        access_token = await refreshAccessToken();
        if (access_token) {
            data = await Check_request(access_token); 
            is_premium(data)
        } 
    }else{
        is_premium(data)
    }

    
}
async function Check_request(access_token) {
    const response = await fetch("http://localhost:8000/subscription-status", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${access_token}`
        }
    });
    return await response.json();
}
async function refreshAccessToken() {
    const result = await chrome.storage.local.get(["Refresh_token"]);
    const refresh_token = result.Refresh_token;

    const response = await fetch("http://localhost:8000/refresh_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Refresh_token: refresh_token })
    });

    const data = await response.json();

    if (data.Data && data.Data !== "No") {
      
        await chrome.storage.local.set({ Access_token: data.Data });
        return data.Data;
    }

    return null; 
}
function is_premium(data){
    const is_premium = data.is_premium
    const upgradeBtn = document.getElementById("upgrade");
    const manageBtn = document.getElementById("sub");

    if (is_premium) {
        upgradeBtn.style.display = "none";   
        manageBtn.style.display = "block";   
    } else {
        upgradeBtn.style.display = "block";  
    }

}