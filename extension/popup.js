import { sending_Refresh_token } from './Refrsh_token.js'
import { addMessage } from './send_message.js';
import { chatHistory } from './send_message.js';
import { goPremiumOverlay } from './goPremimum_overly.js'
import { addImage } from "./send_message.js";
import { get_solve_endpoint} from "./solve_endpoint.js"

var solveBtn = document.getElementById("solve");
var resultDiv = document.getElementById("result");
var login = document.getElementById("LS");
let redirect = document.getElementById("upgrade");
const sendBtn = document.getElementById("sendBtn");
let coordinates = null;
let fullAnswer = null;
let overly = null;
let croppedBase64 = null;

async function captureAndCropImage(coordinates) {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, async (screenshotUrl) => {
            if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
            try {
                const bitmap = await createImageBitmap(await fetch(screenshotUrl).then(r => r.blob()));
                const { x, y, width, height } = coordinates;
                if (width === 0 || height === 0) {
                    reject(new Error("No area selected"));
                    return;
                }
                const canvas = new OffscreenCanvas(width, height);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(bitmap, x, y, width, height, 0, 0, width, height);

                const croppedBlob = await canvas.convertToBlob({ type: "image/png", quality: 0.92 });
                const buf = await croppedBlob.arrayBuffer();

                const bytes = new Uint8Array(buf);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const croppedBase64 = btoa(binary);

                resolve(croppedBase64);
            } catch (err) { reject(err); }
        });
    });
}

solveBtn.onclick = async function() {
    solveBtn.disabled = true;
    sendBtn.disabled = true;
    resultDiv.innerText = ""
    
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startSnip" }, async (response) => {
            if (!response || response.coords === null) {
                resultDiv.innerText = "Something Went Wrong, Refreshing your page, Try again"
                chrome.tabs.reload(tabs[0].id);
                solveBtn.disabled = false;
                sendBtn.disabled = false;

                return;
            }
            
            coordinates = response.coords;
            
            // Take screenshot and crop HERE before sending to background
            
            try {
                croppedBase64 = await captureAndCropImage(coordinates);
                    if (croppedBase64) {
                        await addImage("user", croppedBase64);
                        chatHistory.push({role: "user",content: [{type: "image_url",image_url: {url: `data:image/png;base64,${croppedBase64}`,detail: "low"}}]});

                    }
            } catch (err) {
                resultDiv.innerText = "Failed to capture image: " + err.message;
                solveBtn.disabled = false;
                sendBtn.disabled = false;

                return;
            }
            
            let apiResponse = await get_solve_endpoint( { action:"solveProblem", imageData: croppedBase64, history: chatHistory})
            if (apiResponse == "stream_true"){return}

            
            if (!apiResponse) {
                resultDiv.innerText = "ERROR: Something Went Wrong, Contact Support";
                solveBtn.disabled = false;
                sendBtn.disabled = false;
                return;
            }
            
            if (apiResponse.success === false) {
                resultDiv.innerText = "ERROR: Something Went Wrong, Contact Support";
                solveBtn.disabled = false;
                sendBtn.disabled = false;
                return;
            }
            
            fullAnswer = apiResponse.answer;
            overly = apiResponse.overly;
            
            if (overly == "True") {
                await goPremiumOverlay({
                    title: "You've used your free credits",
                    subtitle: "Upgrade to keep going with unlimited AI solves.",
                    perks: [
                        "Unlimited AI solves",
                        "Priority response speed",
                        "Full memory & history",
                    ],
                    });
                solveBtn.disabled = false;
                sendBtn.disabled = false;
                return
            }
            
            if (fullAnswer === "False") {
                resultDiv.innerText = "Pay to Continue";
                solveBtn.disabled = false;
                sendBtn.disabled = false;
                return;
            }

            if (fullAnswer === "Login_again" || apiResponse.success === 401) {
                const response = await sending_Refresh_token(true);
                if (response === "No") {
                    login.style.display = "block";
                    resultDiv.innerText = "Please Login again";
                    solveBtn.disabled = false;
                    sendBtn.disabled = false;
                    return
                } else {
                    let apiResponse = await get_solve_endpoint( { action:"solveProblem", imageData: croppedBase64, history: chatHistory})
                    if (apiResponse = "stream_true"){return}


                    if (!apiResponse) {
                        resultDiv.innerText = "ERROR: No API response";
                        solveBtn.disabled = false;
                        sendBtn.disabled = false;
                        return;
                    }
                    
                    if (apiResponse.success === false) {
                        resultDiv.innerText = "ERROR: " + apiResponse.error;
                        solveBtn.disabled = false;
                        sendBtn.disabled = false;
                        return;
                    }
                    
                    fullAnswer = apiResponse.answer;
                    overly = apiResponse.overly;
                    
                    if (overly == "True") {
                        await goPremiumOverlay({
                            title: "You've used your free credits",
                            subtitle: "Upgrade to keep going with unlimited AI solves.",
                            perks: [
                                "Unlimited AI solves",
                                "Priority response speed",
                                "Full memory & history",
                            ],
                        });
                        solveBtn.disabled = false;
                        sendBtn.disabled = false;
                        return
                    }
                    
                    if (fullAnswer === "False") {
                        resultDiv.innerText = "Pay to Continue";
                        solveBtn.disabled = false;
                        sendBtn.disabled = false;
                        return
                    } else {
                        chatHistory.push({ role: "assistant", content: fullAnswer });
                        await addMessage("ai", fullAnswer);
                        solveBtn.disabled = false;
                        sendBtn.disabled = false;
                        resultDiv.scrollTop = 0;

                    }
                    return;
                        
                    
                }
            } else {
                chatHistory.push({ role: "assistant", content: fullAnswer });
                await addMessage("ai", fullAnswer);
                solveBtn.disabled = false;
                sendBtn.disabled = false;
                resultDiv.scrollTop = 0;
            }
            return;
        
    
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
    
    const response = await fetch("https://api.asolve.me/create-session", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();
    document.getElementById("reloadOverlay").style.display = "flex";
    return data;
}

async function refreshAccessToken() {
    const result = await chrome.storage.local.get(["Refresh_token"]);
    const Refresh_token = result.Refresh_token;
    
    const response = await fetch("https://api.asolve.me/refresh_token", {
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