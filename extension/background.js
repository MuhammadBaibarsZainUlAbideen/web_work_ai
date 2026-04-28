chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({
    windowId: tab.windowId
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "solveProblem") {
        console.log("token-s", request.tcoordinates)
        chrome.storage.local.get(["Access_token"], async (result) => {
            const Access_token = result.Access_token
            console.log("asd", Access_token)

            chrome.tabs.captureVisibleTab(null, { format: "png" }, async (screenshotUrl) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: "Screenshot failed" });
                    return;
                }

                try {
                    const base64Image = screenshotUrl.split(',')[1];

                    // Convert base64 → binary → blob
                    const byteString = atob(base64Image);
                   const byteArray = new Uint8Array(byteString.length);
                    for (let i = 0; i < byteString.length; i++) {
                        byteArray[i] = byteString.charCodeAt(i);
                    } 
                    let blob;
                    let canvas;
                    try{
                        blob = new Blob([byteArray], { type: "image/png" });

                    
                    

                    
                        const bitmap = await createImageBitmap(blob);
                        const cropRegion = {
                            x: parseInt(request.tcoordinates.x),
                            y: parseInt(request.tcoordinates.y),
                            width: parseInt(request.tcoordinates.width),
                            height: parseInt(request.tcoordinates.height)
                        };
                        // OffscreenCanvas works in service workers
                        canvas = new OffscreenCanvas(cropRegion.width, cropRegion.height);
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(
                            bitmap,
                            cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
                            0, 0, cropRegion.width, cropRegion.height
                        );
                    }catch(error){
                        console.log(error)
                    }

                    // Convert back to base64
                    const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const croppedBase64 = reader.result.split(',')[1];

                        fetch("http://127.0.0.1:8000/solve", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${Access_token}`
                            },
                            body: JSON.stringify({
                                problem: request.problem,
                                box_count: request.box,
                                screenshot: croppedBase64
                            })
                        })
                        .then(r => r.json())
                        .then(data => {
                            console.log("3453")
                            console.log(data.answer);
                            sendResponse({ success: true, answer: data.answer });
                        })
                        .catch(error => { 
                            sendResponse({ success: false, error: error.message });
                        });
                    };
                    reader.readAsDataURL(croppedBlob);

                } catch (err) {
                    sendResponse({ success: false, error: err.message });
                }
            });
        });
    }
    return true;
});