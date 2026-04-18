import { sending_Refresh_token } from './Refrsh_token.js'

var solveBtn = document.getElementById("solve");
var resultDiv = document.getElementById("result");
var login = document.getElementById("LS");
let redirect = document.getElementById("upgrade");
let coordinates = null;

solveBtn.onclick = async function() {
    resultDiv.innerText = "Please Wait..."
    
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startSnip" }, async (response) => {
            if (!response || response.coords === null) {
                resultDiv.innerText = "Failed to capture coordinates"
                return;
            }
            
            coordinates = response.coords;
            
            chrome.runtime.sendMessage(
                { action: "solveProblem", tcoordinates: coordinates },
                async function(apiResponse) {
                    
                    if (!apiResponse) {
                        resultDiv.innerText = "ERROR: No API response";
                        solveBtn.disabled = false;
                        return;
                    }
                    
                    if (apiResponse.success === false) {
                        resultDiv.innerText = "ERROR: " + apiResponse.error;
                        solveBtn.disabled = false;
                        return;
                    }
                    
                    let fullAnswer = apiResponse.answer;
                    if (fullAnswer === "Login_again" || apiResponse.success === 401) {
                        console.log("pp")
                        const reposne = await sending_Refresh_token(true)
                        console.log("BABA", reposne)
                        if (reposne === "No") {
                            login.style.display = "block";
                            resultDiv.innerText = "Please Login again"
                        } else {
                            solveBtn.onclick()
                            solveBtn.disabled = false
                            approveBtn.disabled = false
                            return;
                        }
                    } else if (fullAnswer === "False") {
                        resultDiv.innerText = "Pay to Continue"
                    } else {
                        resultDiv.innerHTML = marked.parse(fullAnswer);
                        console.log(fullAnswer)
                        renderMathInElement(resultDiv, {
                            delimiters: [
                                { left: "$$", right: "$$", display: true },
                                { left: "$", right: "$", display: false }
                            ]
                        });
                    }
                }
            );
        });
    });
};

// extension.js

redirect.onclick = async () => {
    chrome.storage.local.get(["Access_token"], async (result) => {
        let Access_token = result.Access_token;
        console.log(Access_token)
        if (!Access_token) {
            console.log("No access token found!");
            return;
        }
        console.log("1")

        let data = await callCheckout(Access_token)
        console.log("2" + data)

        if (data.Verify == "false" && data.reason == "token_expired") {
            console.log("3")
            Access_token = await refreshAccessToken()
            console.log("4")

            if (Access_token) {
                data = await callCheckout(Access_token);
                console.log(data)
            } else {
                console.log("Plz login again")
                return;
            }
        }
        
        chrome.tabs.create({ url: data.plans_url });
    });
};

async function callCheckout(token) {
    const response = await fetch("https://webworkai-production.up.railway.app/create-session", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();
    console.log(data)
    return data
}

async function refreshAccessToken() {
    const result = await chrome.storage.local.get(["Refresh_token"])
    const Refresh_token = result.Refresh_token
    
    const response = await fetch("https://webworkai-production.up.railway.app/refresh_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Refresh_token: Refresh_token })
    });

    const data = await response.json();

    if (data.Data && data.Data !== "No") {
        chrome.storage.local.set({ "Access_token": data.Data }); 
        return data.Data;
    }

    return null; 
}