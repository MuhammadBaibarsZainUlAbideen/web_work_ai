chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({
    windowId: tab.windowId
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "solveProblem") {
        console.log("token-s")
        chrome.storage.local.get(["Access_token"],(result)=>{
            const Access_token = result.Access_token
            console.log("asd",Access_token)

    
            chrome.tabs.captureVisibleTab(null, { format: "png" }, (screenshotUrl) => {
                if (chrome.runtime.lastError) {
                    sendResponse({success: false, error: "Screenshot failed"});
                    return;
                }


                const base64Image = screenshotUrl.split(',')[1];

                fetch("http://localhost:8000/solve", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${Access_token}`
                    },
                    body: JSON.stringify({
                        problem: request.problem,
                        box_count: request.box,
                        screenshot: base64Image
                    })
                })
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    console.log(data.answer)
                    sendResponse({success: true, answer: data.answer});
                })
                .catch(function(error) {
                    sendResponse({success: false, error: error.message});
                });
            });
        })
    }
    return true;
});