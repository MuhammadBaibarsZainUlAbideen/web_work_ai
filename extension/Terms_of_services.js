const element_overly = document.getElementById("termsOfService");
const closeBtn = document.getElementById('closeMemoryOverlay');

element_overly.addEventListener("click",()=>{
    document.getElementById("termsOverlay").classList.remove("hidden");
})

closeBtn.addEventListener("click",()=>{
    document.getElementById("termsOverlay").classList.add("hidden");

})