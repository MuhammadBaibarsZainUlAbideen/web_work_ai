console.log("popup.js loaded");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
var solveBtn = document.getElementById("solve");
var resultDiv = document.getElementById("result");
var login = document.getElementById("LS");
import { sending_Refresh_token } from './Refrsh_token.js'



let chatHistory = [];
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
sendBtn.addEventListener("click", async () => {
    const text = chatInput.value.trim();
    console.log(text)
    if (!text) return;


    addMessage("user", text);

    chatHistory.push({ role: "user", content: text });

    chatInput.value = "";


    const aiReply = await getAIResponse(text);

    addMessage("ai", aiReply);

    chatHistory.push({ role: "assistant", content: aiReply });

});
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
                { action: "sendMessage", message: input },
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