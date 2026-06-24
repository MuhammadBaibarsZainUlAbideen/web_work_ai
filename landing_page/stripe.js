document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const session_id = params.get("session_id");


    if (!session_id) {
        return;
    }

    let upgrade_button = document.getElementById("payBtn");

    upgrade_button.onclick = async function checkout() {
        upgrade_button.disabled = true; 
        const response = await fetch("https://api.asolve.me/checkout", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${session_id}`
            }
        });

        const data = await response.json();

        if (data.error === "invalid_session") {
            upgrade_button.disabled = false; 
            return;
        }

        if (data.url) {
            upgrade_button.disable = false; 
            window.location.href = data.url;
        }
    };
    return true;
});

