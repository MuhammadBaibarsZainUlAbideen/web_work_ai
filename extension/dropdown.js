const gearBtn = document.getElementById("gearBtn");
const dropdown = document.getElementById("settingsDropdown");

// toggle dropdown
gearBtn.onclick = () => {
    if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
    } else {
        dropdown.style.display = "block";
    }
};

// close when clicking outside
document.addEventListener("click", (e) => {
    if (!gearBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
    }
});