import { sending_Refresh_token } from './Refrsh_token.js'
import { addMessage } from './send_message.js';
import { chatHistory } from './send_message.js';
import { goPremimumOverly } from './goPremimum_overly.js'
import { addImage } from "./send_message.js";

var solveBtn = document.getElementById("solve");
var resultDiv = document.getElementById("result");
var login = document.getElementById("LS");
let redirect = document.getElementById("upgrade");
let coordinates = null;
let fullAnswer = null;
let overly = null;

async function captureAndCropImage(coordinates) {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, async (screenshotUrl) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }

            try {
                const base64Image = screenshotUrl.split(',')[1];
                const byteString = atob(base64Image);
                const byteArray = new Uint8Array(byteString.length);
                for (let i = 0; i < byteString.length; i++) {
                    byteArray[i] = byteString.charCodeAt(i);
                }
                
                const blob = new Blob([byteArray], { type: "image/png" });
                const bitmap = await createImageBitmap(blob);
                const cropRegion = {
                    x: parseInt(coordinates.x),
                    y: parseInt(coordinates.y),
                    width: parseInt(coordinates.width),
                    height: parseInt(coordinates.height)
                };
                
                const canvas = new OffscreenCanvas(cropRegion.width, cropRegion.height);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(
                    bitmap,
                    cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
                    0, 0, cropRegion.width, cropRegion.height
                );
                
                const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
                const reader = new FileReader();
                reader.onloadend = () => {
                    const croppedBase64 = reader.result.split(',')[1];
                    resolve(croppedBase64);
                };
                reader.readAsDataURL(croppedBlob);
            } catch (err) {
                reject(err);
            }
        });
    });
}

solveBtn.onclick = async function() {
    resultDiv.innerText = ""
    
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startSnip" }, async (response) => {
            if (!response || response.coords === null) {
                resultDiv.innerText = "Something Went Wrong, Refreshing your page, Try again"
                chrome.tabs.reload(tabs[0].id);
                return;
            }
            
            coordinates = response.coords;
            
            // Take screenshot and crop HERE before sending to background
            let croppedBase64;
            try {
                croppedBase64 = await captureAndCropImage(coordinates);
                    if (croppedBase64) {
                        await addImage("user", croppedBase64);
                        chatHistory.push({ role: "user", content: "[Image]", image: croppedBase64 });
                    }
            } catch (err) {
                resultDiv.innerText = "Failed to capture image: " + err.message;
                return;
            }
            
            chrome.runtime.sendMessage(
                { action: "solveProblem", imageData: croppedBase64, history: chatHistory },
                async function(apiResponse) {
                    if (!apiResponse) {
                        resultDiv.innerText = "ERROR: Something Went Wrong, Contact Support";
                        solveBtn.disabled = false;
                        return;
                    }
                    
                    if (apiResponse.success === false) {
                        resultDiv.innerText = "ERROR: Something Went Wrong, Contact Support";
                        solveBtn.disabled = false;
                        return;
                    }
                    
                    fullAnswer = apiResponse.answer;
                    overly = apiResponse.overly;
                    
                    if (overly == "True") {
                        await goPremimumOverly();
                    }
                    
                    if (fullAnswer === "False") {
                        resultDiv.innerText = "Pay to Continue";
                        return;
                    }

                    if (fullAnswer === "Login_again" || apiResponse.success === 401) {
                        const response = await sending_Refresh_token(true);
                        if (response === "No") {
                            login.style.display = "block";
                            resultDiv.innerText = "Please Login again";
                        } else {
                            chrome.runtime.sendMessage(
                                { action: "solveProblem", imageData: croppedBase64, history: chatHistory },
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
                                    overly = apiResponse.overly;
                                    
                                    if (overly == "True") {
                                        await goPremimumOverly();
                                    }
                                    
                                    if (fullAnswer === "False") {
                                        resultDiv.innerText = "Pay to Continue";
                                    } else {
                                        chatHistory.push({ role: "assistant", content: fullAnswer });
                                        await addMessage("ai", fullAnswer);
                                        resultDiv.scrollTop = 0;
                                    }
                                    return;
                                }
                            );
                        }
                    } else {
                        chatHistory.push({ role: "assistant", content: fullAnswer });
                        await addMessage("ai", fullAnswer);
                        resultDiv.scrollTop = 0;
                    }
                    return;
                }
            );
        });
    });
};

redirect.onclick = async () => {
    const result = await chrome.storage.local.get(["Access_token"]);
    let accessToken = result.Access_token;

    if (!accessToken) {
        return;
    }

    let data = await callCheckout(accessToken);

    if (data.Verify === "false" && data.reason === "token_expired") {
        accessToken = await refreshAccessToken();
        if (!accessToken) {
            return;
        }
        data = await callCheckout(accessToken);
    }

    if (data.plans_url) {
        chrome.tabs.create({ url: data.plans_url });
    } else {
    }
};

async function callCheckout(token) {
    const response = await fetch("https://marksup-hjgvdbdbdmhdbff7.eastus2-01.azurewebsites.net/create-session", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();
    return data;
}

async function refreshAccessToken() {
    const result = await chrome.storage.local.get(["Refresh_token"]);
    const Refresh_token = result.Refresh_token;
    
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