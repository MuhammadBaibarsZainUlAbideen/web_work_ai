subElememt = document.getElementById("sub")
subElememt.addEventListener("click",async function(){
    let result = await chrome.storage.local.get(["Access_token"]);
    let access_token = result.Access_token;
    let data = await sub_request(access_token);
    if (data.reason === "token_expired") {
        access_token = await refreshAccessToken();
        if (access_token) {
            data = await sub_request(access_token); 
            chrome.tabs.create({ url: data.url });
        } 
    }else{
        chrome.tabs.create({ url: data.url });
    }




})
async function sub_request(access_token) {
    const response = await fetch("https://marksup-hjgvdbdbdmhdbff7.eastus2-01.azurewebsites.net/billing-portal", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access_token}`
        }
    });
    return await response.json();
}
async function refreshAccessToken() {
    const result = await chrome.storage.local.get(["Refresh_token"]);
    const refresh_token = result.Refresh_token;

    const response = await fetch("https://marksup-hjgvdbdbdmhdbff7.eastus2-01.azurewebsites.net/refresh_token", {
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
