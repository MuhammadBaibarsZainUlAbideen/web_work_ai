import {sending_Refresh_token} from "./Refrsh_token.js"
import {addMessage} from "./send_message.js"
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
                console.log("---->",data)
                return { success: true, answer: data.answer, overly: data.overly }
            } else {
                console.log("please contact")
                return
            }
        }
        if (data.reason === "invalid_token") {
            return {answer: data.answer}
        }
        return { success: true, answer: data.answer, overly: data.overly }


    }
    if (request.action === "sendMessage") {
        console.log("1")
        let data = await getdata(access_token,{type: "text",message: request.message[0],history: request.message[1]})
        if (data.stream_response){chatHistory.push({ role: "assistant", content: data.stream_response });return "stream_true"}
        console.log(chatHistory)
        if (data.reason === "token_expired") {
            console.log("131")
            access_token = await sending_Refresh_token("True");
            console.log("131")

            if (access_token) {
                data = await getdata(access_token,{type: "text",message: request.message[0],history: request.message[1]}); 
                if (data.stream_response){chatHistory.push({ role: "assistant", content: data.stream_response });return "stream_true"}
                console.log(chatHistory)
                console.log("---->",data)
                return { success: true, answer: data.answer, overly: data.overly }
            } else {
                console.log("please contact")
                return
            }
        }
        if (data.reason === "invalid_token") {
            return {answer: data.answer}
        }
        console.log("---->",data)
        return { success: true, answer: data.answer, overly: data.overly }

    }
}

async function getdata(access_token,body){
    let data =  await fetch("http://127.0.0.1:8000/solve",{
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
    console.log("1")
    const contentType = r.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        console.log("1")
        const data = await r.json();
        console.log("11",data)
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
        console.log(answer)
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