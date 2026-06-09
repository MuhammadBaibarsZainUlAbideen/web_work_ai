import { sending_Refresh_token } from './Refrsh_token.js'
import { addMessage } from './send_message.js';
import { chatHistory } from './send_message.js';

var solveBtn = document.getElementById("solve");
var resultDiv = document.getElementById("result");
var login = document.getElementById("LS");
let redirect = document.getElementById("upgrade");
let coordinates = null;
let fullAnswer = null
solveBtn.onclick = async function() {
    resultDiv.innerText = ""
    
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startSnip" }, async (response) => {
            if (!response || response.coords === null) {
                resultDiv.innerText = "Someting Went Wrong, Refreshing your page, Try again"
                chrome.tabs.reload(tabs[0].id);
                return;
            }
            
            coordinates = response.coords;
            
            chrome.runtime.sendMessage(
                { action: "solveProblem", tcoordinates: [coordinates,chatHistory] },
                async function(apiResponse) {
                    
                    if (!apiResponse) {
                        resultDiv.innerText = "ERROR: Someting Went Wrong, Contact Support";
                        solveBtn.disabled = false;
                        return;
                    }
                    
                    if (apiResponse.success === false) {
                        resultDiv.innerText = "ERROR: Someting Went Wrong, Contact Support";
                        solveBtn.disabled = false;
                        return;
                    }
                    
                    fullAnswer = apiResponse.answer;
                    if (fullAnswer === "False"){
                        resultDiv.innerText = "Pay to Continue"
                        return;
                    }

                    if (fullAnswer === "Login_again" || apiResponse.success === 401) {
                        console.log("pp")
                        const reposne = await sending_Refresh_token(true)
                        console.log("BABA", reposne)
                        if (reposne === "No") {
                            login.style.display = "block";
                            resultDiv.innerText = "Please Login again"
                        } else {
                            chrome.runtime.sendMessage(
                                { action: "solveProblem", tcoordinates: [coordinates,chatHistory] },
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
                                    fullAnswer = apiResponse.answer;
                                    
                                    if (fullAnswer === "False") {
                                        resultDiv.innerText = "Pay to Continue"
                                    }else {
                                            console.log("RAW:", JSON.stringify(fullAnswer));
                                            chatHistory.push({ role: "assistant", content: fullAnswer });
                                            await addMessage("ai",fullAnswer)
                                            resultDiv.scrollTop = 0;
                                        }   
                                    return;
                                }
                                
                            )

                        }
                        
                    } else if (fullAnswer === "False") {
                        resultDiv.innerText = "Pay to Continue"
                    } else {
                        console.log("RAW:", JSON.stringify(fullAnswer));
                        console.log(fullAnswer)
                        chatHistory.push({ role: "assistant", content: fullAnswer });
                        await addMessage("ai",fullAnswer)

                        resultDiv.scrollTop = 0;
                    }
                    return;
                }
            );
        });
    });
};


// extension.js

redirect.onclick = async () => {
    const result = await chrome.storage.local.get(["Access_token"]);
    let accessToken = result.Access_token;

    if (!accessToken) {
        console.log("No access token found!");
        return;
    }

    let data = await callCheckout(accessToken);

    if (data.Verify === "false" && data.reason === "token_expired") {
        accessToken = await refreshAccessToken();
        if (!accessToken) {
            console.log("Plz login again");
            return;
        }

        data = await callCheckout(accessToken);
    }

    if (data.plans_url) {
        chrome.tabs.create({ url: data.plans_url });
    } else {
        console.log("Invalid response from server");
    }
};

async function callCheckout(token) {
    const response = await fetch("https://marksup-hjgvdbdbdmhdbff7.eastus2-01.azurewebsites.net/create-session", {
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
    
    const response = await fetch("https://marksup-hjgvdbdbdmhdbff7.eastus2-01.azurewebsites.net/refresh_token", {
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