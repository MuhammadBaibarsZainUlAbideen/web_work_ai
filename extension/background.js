chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});


let pendingSendResponse = null;
let pendingRequest = null;
let pendingToken = null;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "solveProblem") {
    chrome.storage.local.get(["Access_token"], (result) => {
      pendingToken = result.Access_token;
      pendingRequest = request;
      pendingSendResponse = sendResponse;

      chrome.tabs.captureVisibleTab(null, { format: "png" }, (screenshotUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: "Screenshot failed" });
          return;
        }
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { type: "START_SNIP", screenshotUrl });
        });
      });
    });
  }
  return true;
});

// TOP LEVEL - separate listener for when user finishes snipping
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SNIP_DONE") {
    const base64Image = msg.dataUrl.split(',')[1]; // use the CROPPED image

    fetch("https://webworkai-production.up.railway.app/solve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${pendingToken}`
      },
      body: JSON.stringify({
        problem: pendingRequest.problem,
        box_count: pendingRequest.box,
        screenshot: base64Image
      })
    })
    .then(res => res.json())
    .then(data => {
      pendingSendResponse({ success: true, answer: data.answer });
    })
    .catch(err => {
      pendingSendResponse({ success: false, error: err.message });
    });
  }
});