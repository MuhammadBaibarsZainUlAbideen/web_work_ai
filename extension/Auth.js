// let element = document.getElementById("LS");
var solveBtn = document.getElementById("solve");
var approveBtn = document.getElementById("approve");
var resultDiv = document.getElementById("result");
const loginBtn = document.getElementById("LS");
const termsBtn = document.getElementById("termsOfService");
const overlay = document.getElementById("termsOverlay");
const acceptBtn = document.getElementById("acceptTermsBtn");
let termsSource = null;

async function storingLocal(token){
    const Access_token = token['Access_token']
    const Refresh_token = token['Refresh_token']
    console.log(Access_token)
    console.log(Refresh_token)
    loginBtn.style.display = "none"

    try{
        await chrome.storage.local.set({"Access_token":Access_token,"Refresh_token":Refresh_token})
        console.log("wrker")
    }catch(error){
        console.log("Error is :",error)
    }
    
    solveBtn.disabled=false;
    approveBtn.disabled=false;
}

async function sendingBakcend(jsObject){
    console.log("h")
    const sending = await fetch("http://127.0.0.1:8000/get",{
        method:"POST",
        headers:{"Content-Type": "application/json"},
        body:JSON.stringify({Auth:jsObject})
    })
    const converting_token = await sending.json();
    storingLocal(converting_token)
}

async function gettingToken(token){
    const sending_request = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json",{
        headers: {
            Authorization: "Bearer " + token
        }
    })
    const converting = await sending_request.json()
    console.log(converting)
    sendingBakcend(converting)
}


const CLIENT_ID = "761181264175-1qmk12gfnsbo8k58dk4mmvbt6c8ujurt.apps.googleusercontent.com";



loginBtn.addEventListener("click", () => {
    overlay.classList.remove("hidden");
    termsSource = "login"
});



// termsBtn.addEventListener("click", () => {
//     overlay.classList.remove("hidden");
// });



acceptBtn.addEventListener("click", () => {

    overlay.classList.add("hidden");
    if (termsSource === "login"){
        startOAuth();
    }

    

});



function startOAuth() {

    const redirectURL = chrome.identity.getRedirectURL();

    console.log("Redirect URL:", redirectURL);

    const authURL = new URL(
        "https://accounts.google.com/o/oauth2/v2/auth"
    );

    authURL.searchParams.append("client_id", CLIENT_ID);
    authURL.searchParams.append("redirect_uri", redirectURL);
    authURL.searchParams.append("response_type", "token");
    authURL.searchParams.append("scope", "openid email profile");
    authURL.searchParams.append("prompt", "consent");
    authURL.searchParams.append("access_type", "online");

    chrome.identity.launchWebAuthFlow({
        url: authURL.toString(),
        interactive: true

    }, (redirectUrl) => {

        if (chrome.runtime.lastError) {

            console.error(
                "Auth error:",
                chrome.runtime.lastError
            );

            resultDiv.textContent =
                "Login failed: " +
                chrome.runtime.lastError.message;

            return;
        }

        console.log("Redirect URL received:", redirectUrl);

        const fragment = redirectUrl.split('#')[1];

        if (!fragment) {

            console.error("No fragment in redirect URL");

            resultDiv.textContent =
                "Login failed: No token received";

            return;
        }

        const params = new URLSearchParams(fragment);

        const token = params.get('access_token');

        if (token) {

            console.log("Token obtained successfully");

            resultDiv.textContent =
                "Login successful! You are good to start solving problems";

            gettingToken(token);

        } else {

            console.error("No access token found");

            resultDiv.textContent =
                "Login failed: No access token";
        }
    });
}