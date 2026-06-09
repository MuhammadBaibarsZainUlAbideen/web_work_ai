import {sending_Refresh_token} from "./Refrsh_token.js"
export async function editCrumbs(editedCrumbs){

    let result = await chrome.storage.local.get(["Access_token"]);
    console.log(result.Access_token)
    let access_token = result.Access_token;
    console.log('1')


    
    let data = await sendEditCrumbs(access_token,editedCrumbs)
    console.log('1')



   
    if (data.reason === "token_expired") {
        console.log('1')
        console.log("Token expired, refreshing...");
        access_token = await sending_Refresh_token("True");
        console.log('1')

        if (access_token) {
            console.log('1')
            data = await sendEditCrumbs(access_token,editedCrumbs); 
            console.log('1')
        } else {
            console.log("Refresh token invalid. Forcing local logout.");
            return;
            chrome.storage.local.remove(["Access_token", "Refresh_token"]);
            return;
        }
    }

    if (data.Status === "True") {
        console.log(data.Crumbs)
        return data.Crumbs
    }



}

async function sendEditCrumbs(access_token, editedCrumbs){
    console.log('11')
    
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
    console.log(dataJsonConversion)
    return dataJsonConversion
}
