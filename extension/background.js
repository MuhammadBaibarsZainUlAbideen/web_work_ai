chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({
        windowId: tab.windowId
    });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "solveProblem") {
        chrome.storage.local.get(["Access_token"], async (result) => {
            const Access_token = result.Access_token;
            
            fetch("https://marksup-hjgvdbdbdmhdbff7.eastus2-01.azurewebsites.net/solve", {
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
            
            fetch("https://marksup-hjgvdbdbdmhdbff7.eastus2-01.azurewebsites.net/solve", {
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
            .then(async (r) => {
            const contentType = r.headers.get("content-type") || "";

            if (contentType.includes("application/json")) {
                const data = await r.json();
                sendResponse({ success: true, answer: data.answer, overly: data.overly });
                return;
            }

            const reader = r.body.getReader();

            const decoder = new TextDecoder();
            let answer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                answer += chunk;

                chrome.tabs.sendMessage(tabId, {
                    action: "streamChunk",
                    chunk: chunk
                });
            }

            chrome.tabs.sendMessage(tabId, { action: "streamDone", answer });
            sendResponse({ success: true }); 
        })
            .catch(error => { 
                sendResponse({ success: false, error: error.message });
            });
        });
    }
    return true;
});
