console.log("popup.js loaded");
import { sending_Refresh_token } from './Refrsh_token.js'
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
var solveBtn = document.getElementById("solve");
var resultDiv = document.getElementById("result");
var login = document.getElementById("LS");




export let chatHistory = [];
export async function addMessage(role, text) {
    const msg = document.createElement("div");
    msg.classList.add("message", role);

    msg.innerHTML = marked.parse(text);

    chatBox.appendChild(msg);

    renderMathInElement(msg, {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
        ],
        throwOnError: false
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}
export async function addImage(role, imageBase64) {
    const msg = document.createElement("div");
    msg.classList.add("message", role);

    const img = document.createElement("img");
    img.src = 'data:image/png;base64,' + imageBase64;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '300px';
    img.style.borderRadius = '8px';
    img.style.marginTop = '8px';
    
    msg.appendChild(img);

    const chatBox = document.getElementById("chatBox");
    chatBox.appendChild(msg);

    chatBox.scrollTop = chatBox.scrollHeight;
}
async function handleSend(){
    const text = chatInput.value.trim();
    console.log(text)
    if (!text) return;


    addMessage("user", text);

    chatHistory.push({ role: "user", content: text });
    if (chatHistory.length > 10) {
        chatHistory = chatHistory.slice(-10);
    }

    chatInput.value = "";


    const aiReply = await getAIResponse(text);

    addMessage("ai", aiReply);

    chatHistory.push({ role: "assistant", content: aiReply });
    if (chatHistory.length > 10) {
        chatHistory = chatHistory.slice(-10);
    }

};
async function getAIResponse(input) {
    console.log("yo123")

    let apiResponse = await new Promise((resolve) => {
        console.log("yo123")
        chrome.runtime.sendMessage(
            { action: "sendMessage", message: [input,chatHistory] },
            resolve
        );
    });
    console.log("yo123")

    if (!apiResponse || apiResponse.success === false) {
        resultDiv.innerText = "ERROR: Something went wrong";
        solveBtn.disabled = false;
        return;
    }

    let fullAnswer = apiResponse.answer;

    if (fullAnswer === "False") {
        resultDiv.innerText = "Pay to Continue";
        return;
    }

    if (fullAnswer === "Login_again" || apiResponse.success === 401) {

        const refresh = await sending_Refresh_token(true);

        if (refresh === "No") {
            login.style.display = "block";
            resultDiv.innerText = "Please Login again";
            return;
        }

        apiResponse = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: "sendMessage", message: [input,chatHistory] },
                resolve
            );
        });

        if (!apiResponse || apiResponse.success === false) {
            resultDiv.innerText = "ERROR after retry";
            solveBtn.disabled = false;
            return;
        }

        fullAnswer = apiResponse.answer;
    }



    // resultDiv.scrollTop = 0;


    return fullAnswer;
}


sendBtn.addEventListener("click", handleSend);

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});