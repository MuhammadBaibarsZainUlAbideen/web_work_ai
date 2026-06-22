import {sending_Refresh_token} from "./Refrsh_token.js"
import { chatHistory } from './send_message.js';
let streamingMessageDiv = null;

const chatBox = document.getElementById("chatBox");
var solveBtn = document.getElementById("solve");
const sendBtn = document.getElementById("sendBtn");


export async function get_solve_endpoint(request){
    
    let result = await chrome.storage.local.get(["Access_token"]);
    let access_token = result.Access_token;

    if (request.action === "solveProblem"){
        let data = await getdata(access_token,{type: "image",message: request.imageData,history: request.history})
        if (data.stream_response){chatHistory.push({ role: "assistant", content: data.stream_response });return "stream_true"}
        if (data.reason === "token_expired") {
            access_token = await sending_Refresh_token("True");

            if (access_token) {
                data = await getdata(access_token,{type: "image",message: request.imageData,history: request.history}); 
                if (data.stream_response){chatHistory.push({ role: "assistant", content: data.stream_response });return "stream_true"}
                return { success: true, answer: data.answer, overly: data.overly }
            } else {
                return
            }
        }
        if (data.reason === "invalid_token") {
            return {answer: data.answer}
        }
        return { success: true, answer: data.answer, overly: data.overly }


    }
    if (request.action === "sendMessage") {
        let data = await getdata(access_token,{type: "text",message: request.message[0],history: request.message[1]})
        if (data.stream_response){chatHistory.push({ role: "assistant", content: data.stream_response });return "stream_true"}
        if (data.reason === "token_expired") {
            access_token = await sending_Refresh_token("True");

            if (access_token) {
                data = await getdata(access_token,{type: "text",message: request.message[0],history: request.message[1]}); 
                if (data.stream_response){chatHistory.push({ role: "assistant", content: data.stream_response });return "stream_true"}

                return { success: true, answer: data.answer, overly: data.overly }
            } else {
                return
            }
        }
        if (data.reason === "invalid_token") {
            return {answer: data.answer}
        }
        return { success: true, answer: data.answer, overly: data.overly }

    }
}

async function getdata(access_token,body){
    let data =  await fetch("https://api.asolve.me/solve",{
        method:"POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access_token}`
        },
        body:JSON.stringify(body)

    })
    let dataJsonConversion = await data_type(data)
    return dataJsonConversion

}

async function data_type(r){
    const contentType = r.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        const data = await r.json();
        return data;
    }

    const reader = r.body.getReader();

    const decoder = new TextDecoder();
    let answer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        answer += chunk;
        updateStreamingMessage(answer)


    }
    streamingMessageDiv = null;
    solveBtn.disabled = false;
    sendBtn.disabled = false;
    return {"stream_response":answer}

}

function updateStreamingMessage(text) {
    if (!streamingMessageDiv) {
        streamingMessageDiv = document.createElement("div");
        streamingMessageDiv.classList.add("message", "ai");
        chatBox.appendChild(streamingMessageDiv);
    }
    
    streamingMessageDiv.innerHTML = marked.parse(text);
    
    renderMathInElement(streamingMessageDiv, {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
        ],
        throwOnError: false
    });
    
    chatBox.scrollTop = chatBox.scrollHeight;
}