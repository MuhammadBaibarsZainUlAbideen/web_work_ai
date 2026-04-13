chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    
    if (request.action === "getProblem") {
        try {
            let problem = document.querySelector(".problem").innerText;
            let inputs = document.querySelectorAll("input[id^='AnSwEr'][type='text']");
            let boxCount = inputs.length;
            console.log(boxCount)
            sendResponse({success: true, problem: problem,boxes: boxCount});
        } catch(e) {
            console.log("Error getting problem:", e);
            sendResponse({success: false, error: e.message});
        }
    }
    return true;
});

