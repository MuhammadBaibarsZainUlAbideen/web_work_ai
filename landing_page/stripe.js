document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const session_id = params.get("session_id");


    if (!session_id) {
        return;
    }

    let upgrade_button = document.getElementById("payBtn");

    upgrade_button.onclick = async function checkout() {
        const response = await fetch("http://api.asolve.me/checkout", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${session_id}`
            }
        });

        const data = await response.json();

        if (data.error === "invalid_session") {
            return;
        }

        if (data.url) {
            window.location.href = data.url;
        }
    };
    return true;
});

