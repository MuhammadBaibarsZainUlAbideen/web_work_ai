import { sending_Refresh_token } from './Refrsh_token.js'
import { goPremimumOverly } from './goPremimum_overly.js'
import { get_solve_endpoint} from "./solve_endpoint.js"

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
    resultDiv.innerText = ""
    solveBtn.disabled = true;
    sendBtn.disabled = true;
    const text = chatInput.value.trim();
    if (!text) return;


    addMessage("user", text);

    chatHistory.push({ role: "user", content: text });


    chatInput.value = "";


    const aiReply = await getAIResponse(text);
    if (aiReply == "stream_true"){solveBtn.disabled = false;sendBtn.disabled = false;return}
    if (aiReply !== null) {
        addMessage("ai", aiReply);
        solveBtn.disabled = false;
        sendBtn.disabled = false;
        chatHistory.push({ role: "assistant", content: aiReply });
        
    }

};
async function getAIResponse(input) {

    let apiResponse = await get_solve_endpoint( { action: "sendMessage", message: [input,chatHistory] })
    if (apiResponse == "stream_true"){return "stream_true"}


    if (!apiResponse || apiResponse.success === false) {
        resultDiv.innerText = "ERROR: Something went wrong";
        solveBtn.disabled = false;
        return;
    }

    let fullAnswer = apiResponse.answer;
    let overly = apiResponse.overly;
    if (overly == "True") {
        await goPremimumOverly();
        return null;
    }

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

        apiResponse =  await get_solve_endpoint( { action: "sendMessage", message: [input,chatHistory] })
        if ( apiResponse.stream_response_true){return apiResponse.stream_response_true}
        if (!apiResponse || apiResponse.success === false) {
            resultDiv.innerText = "ERROR after retry";
            solveBtn.disabled = false;
            return;
        }
        if (apiResponse.overly == "True") {
            await goPremimumOverly();
            return null;
        }

        fullAnswer = apiResponse.answer;
    }





    return fullAnswer;
}

sendBtn.addEventListener("click", handleSend);

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});