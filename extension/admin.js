async function loadAdminData() {
    try {
        
        const response = await fetch("https://webworkai-production.up.railway.app/admin");
        const result = await response.json();

        const users = result.data;
        const tableBody = document.getElementById("adminTable");
        tableBody.innerHTML = ""; 

        users.forEach(user => {
            const row = document.createElement("tr");

            
            const nameCell = document.createElement("td");
            nameCell.textContent = user.name;
            row.appendChild(nameCell);

            
            const emailCell = document.createElement("td");
            emailCell.textContent = user.email;
            row.appendChild(emailCell);

            
            const tokenCell = document.createElement("td");
            tokenCell.textContent = user.token_status === 0 ? "Active" : "Inactive";
            tokenCell.className = user.token_status === 0 ? "active" : "inactive";
            row.appendChild(tokenCell);

           
            const paymentCell = document.createElement("td");
            paymentCell.textContent = user.payment_status === "active" ? "Paid" : "Unpaid";
            paymentCell.className = user.payment_status === "active" ? "active" : "inactive";
            row.appendChild(paymentCell);

         
            const triesCell = document.createElement("td");
            triesCell.textContent = user.tries;
            row.appendChild(triesCell);

            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Failed to load admin data:", error);
    }
}


window.addEventListener("load", loadAdminData);