import {sending_Refresh_token} from "./Refrsh_token.js"
let resulElementtDiv = document.getElementById("result");

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

    
    let data = await fetch("https://marksup-hjgvdbdbdmhdbff7.eastus2-01.azurewebsites.net/edittopic",{
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access_token}`
        },
        body: JSON.stringify({ message: message })
    })

    let dataJsonConversion = await data.json()
    return dataJsonConversion
}
