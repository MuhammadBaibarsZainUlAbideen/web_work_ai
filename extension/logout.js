var login1 = document.getElementById("LS");

async function refreshAccessToken() {
    const result = await chrome.storage.local.get(["Refresh_token"]);
    const refresh_token = result.Refresh_token;

    const response = await fetch("https://api.asolve.me/refresh_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Refresh_token: refresh_token })
    });

    const data = await response.json();

    if (data.Data && data.Data !== "No") {
      
        await chrome.storage.local.set({ Access_token: data.Data });
        return data.Data;
    }

    return null; 
}


async function performLogout(access_token) {
    const response = await fetch("https://api.asolve.me/logout", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access_token}`
        }
    });
    return await response.json();
}

document.getElementById("Logout").addEventListener('click', async function () {
    let result = await chrome.storage.local.get(["Access_token"]);
    let access_token = result.Access_token;

    let data = await performLogout(access_token);

   
    if (data.reason === "token_expired") {
        access_token = await refreshAccessToken();

        if (access_token) {
            data = await performLogout(access_token); 
        } else {
            chrome.storage.local.remove(["Access_token", "Refresh_token"]);
            return;
        }
    }

    if (data.logout === "true") {
        chrome.storage.local.remove(["Access_token", "Refresh_token"]);
        showToast("Logged out successfully");
        login1.style.display = "block";
    }
});

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}