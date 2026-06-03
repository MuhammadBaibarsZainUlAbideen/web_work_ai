const element_overly = document.getElementById("termsOfService");
const acceptBtn1 = document.getElementById("acceptTermsBtn");

element_overly.addEventListener("click",()=>{
    document.getElementById("termsOverlay").classList.remove("hidden");
})

