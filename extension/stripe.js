document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const session_id = params.get("session_id");

    console.log("session_id:", session_id);

    if (!session_id) {
        console.log("No token found!");
        return;
    }

    let upgrade_button = document.getElementById("payBtn");

    upgrade_button.onclick = async function checkout() {
        const response = await fetch("https://webworkai-production.up.railway.app/checkout", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${session_id}`
            }
        });

        const data = await response.json();
        console.log("checkout data:", data);

        if (data.error === "invalid_session") {
            console.log("Session expired, please try again.");
            return;
        }

        if (data.url) {
            window.location.href = data.url;
        }
    };
});

