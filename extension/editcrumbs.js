import {sending_Refresh_token} from "./Refrsh_token.js"
let resulElementtDiv = document.getElementById("result");
import { goPremiumOverlay } from './goPremimum_overly.js'

export async function editCrumbs(editedCrumbs){

    let result = await chrome.storage.local.get(["Access_token"]);
    let access_token = result.Access_token;


    
    let data = await sendEditCrumbs(access_token,editedCrumbs)



   
    if (data.reason === "token_expired") {
        access_token = await sending_Refresh_token("True");

        if (access_token) {
            data = await sendEditCrumbs(access_token,editedCrumbs); 
        } else {
            resulElementtDiv.innerText = "Something Went Wrong Contact Support"
            return
        }
    }

    if (data.Status === "True") {
        return data.Crumbs
    }



}

async function sendEditCrumbs(access_token, editedCrumbs){
    
    let message = {};
    
    if (editedCrumbs.type === "topic") {
        message = {
            "type": editedCrumbs.type,
            "action": editedCrumbs.action,
            "prevTopic": editedCrumbs.prevTopic,
            "topic": editedCrumbs.topic
        };
    } else if (editedCrumbs.type === "subtopic" && ((editedCrumbs.action === "edit") || (editedCrumbs.action === "delete"))) {
        message = {
            "type": editedCrumbs.type,
            "action": editedCrumbs.action,
            "prevTopic": editedCrumbs.prevTopic,
            "subtopic": editedCrumbs.subtopic,
            "newSubtopic": editedCrumbs.newSubtopic
        };
    }else if (editedCrumbs.type === "subtopic" && editedCrumbs.action === "move_to_topic") {
        message = {
            "type": editedCrumbs.type,
            "action": editedCrumbs.action,
            "prevTopic": editedCrumbs.prevTopic,
            "subtopic": editedCrumbs.subtopic,
            "newTopic": editedCrumbs.newTopic
        };
    }
    else if (editedCrumbs.type === "fact") {
        if (editedCrumbs.action === "edit") {
            message = {
                "type": editedCrumbs.type,
                "action": editedCrumbs.action,
                "prevTopic": editedCrumbs.prevTopic,
                "subtopic": editedCrumbs.subtopic,
                "oldQuestion": editedCrumbs.oldQuestion,
                "oldFact": editedCrumbs.oldFact,
                "newQuestion": editedCrumbs.newQuestion,
                "newFact": editedCrumbs.newFact
            };
        } else if (editedCrumbs.action === "delete") {
            message = {
                "type": editedCrumbs.type,
                "action": editedCrumbs.action,
                "prevTopic": editedCrumbs.prevTopic,
                "subtopic": editedCrumbs.subtopic,
                "question": editedCrumbs.question,
                "fact": editedCrumbs.fact
            };
        }else if (editedCrumbs.action === "move_to_subtopic") {
            message = {
                "type": editedCrumbs.type,
                "action": editedCrumbs.action,
                "prevTopic": editedCrumbs.prevTopic,
                "oldSubtopic": editedCrumbs.oldSubtopic,
                "newSubtopic": editedCrumbs.newSubtopic,
                "question": editedCrumbs.question,
                "fact": editedCrumbs.fact
            };
        }
    }

    
    let data = await fetch("http://localhost:8000/edittopic",{
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access_token}`
        },
        body: JSON.stringify({ message: message })
    })

    let dataJsonConversion = await data.json()
    if(dataJsonConversion.overly){
        await blocking(dataJsonConversion)
    }
    
    if(dataJsonConversion.answer){
        await editRateLimt(dataJsonConversion)
        return
    }

    return dataJsonConversion
}

async function blocking(apiResponse){
    let overly = apiResponse.overly;
    if (overly == "True") {
        await goPremiumOverlay({
            title: "Editing is a Premium feature",
            subtitle: "Upgrade to edit, refine, and iterate on any response.",
            perks: [
                "Edit & regenerate any response",
                "Unlimited AI solves",
                "Full memory & history",
            ],
            btnText: "Unlock Editing",
            dismissText: "Not now",
            });
    }
    

}
async function editRateLimt(apiResponse){
    let final = apiResponse.answer;
    resulElementtDiv.innerText=final
    document.getElementById("memoryOverlay").classList.add("hidden");
    

}