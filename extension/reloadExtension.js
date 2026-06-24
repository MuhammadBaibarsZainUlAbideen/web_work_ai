import { relaoad } from "./Premium_Manage.js";
document.getElementById("reloadExtensionBtn").addEventListener("click", async() => {
    console.log("reload clicked");
    document.getElementById("reloadOverlay").style.display = "none";
    await relaoad()
});
