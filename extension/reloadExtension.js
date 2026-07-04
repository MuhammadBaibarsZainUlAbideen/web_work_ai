import { relaoad } from "./Premium_Manage.js";
document.getElementById("reloadExtensionBtn").addEventListener("click", async() => {
    document.getElementById("reloadOverlay").style.display = "none";
    await relaoad()
});
document.getElementById('closeReloadOverlay').addEventListener('click', () => {
    document.getElementById('reloadOverlay').style.display = 'none';
});