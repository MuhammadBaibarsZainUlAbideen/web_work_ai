export async function goPremiumOverlay(config = {}) {
  const {
    title = "Upgrade to Premium",
    subtitle = "You've reached your free limit. Unlock unlimited access to keep going.",
    perks = [
      "Unlimited AI solves",
      "Priority response speed",
      "Full memory & history",
    ],
    btnText = "Upgrade Now",
    dismissText = "Maybe later",
  } = config;

  const overlay = document.getElementById("premiumOverlay");

  // Update content dynamically
  overlay.querySelector(".overlay-title").textContent = title;
  overlay.querySelector(".overlay-sub").textContent = subtitle;
  overlay.querySelector(".overlay-perks").innerHTML = perks
    .map(p => `<li><span class="perk-check">✓</span> ${p}</li>`)
    .join("");
  document.getElementById("upgradeFromOverlay").textContent = btnText;
  document.getElementById("closeOverlayText").textContent = dismissText;

  overlay.style.display = "flex";

  const close = () => { overlay.style.display = "none"; };
  document.getElementById("closeOverlayText").onclick = close;
  document.getElementById("upgradeFromOverlay").onclick = () => {
    document.getElementById("upgrade").click();
    close();
  };
}