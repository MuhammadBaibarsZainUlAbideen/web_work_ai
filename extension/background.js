chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({
        windowId: tab.windowId
    });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "solveProblem") {
        chrome.storage.local.get(["Access_token"], async (result) => {
            const Access_token = result.Access_token;
            
            fetch("http://127.0.0.1:8000/solve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Access_token}`
                },
                body: JSON.stringify({
                    type: "image",
                    message: request.imageData,
                    history: request.history
                })
            })
            .then(r => r.json())
            .then(data => {
                console.log(data)
                sendResponse({ success: true, answer: data.answer, overly: data.overly });
            })
            .catch(error => { 
                sendResponse({ success: false, error: error.message });
            });
        });
    }
    
    if (request.action === "sendMessage") {
        chrome.storage.local.get(["Access_token"], async (result) => {
            const Access_token = result.Access_token;
            
            fetch("http://127.0.0.1:8000/solve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Access_token}`
                },
                body: JSON.stringify({
                    type: "text",
                    message: request.message[0],
                    history: request.message[1]
                })
            })
            .then(r => r.json())
            .then(data => {
                console.log(data)
                sendResponse({ success: true, answer: data.answer, overly: data.overly });
            })
            .catch(error => { 
                sendResponse({ success: false, error: error.message });
            });
        });
    }
    return true;
});