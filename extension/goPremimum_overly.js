export async function goPremimumOverly() {
  const overlay = document.getElementById("premiumOverlay");
  overlay.style.display = "flex";

  const close = () => { overlay.style.display = "none"; };

  document.getElementById("closeOverlayText").onclick = close;

  document.getElementById("upgradeFromOverlay").onclick = () => {
    document.getElementById("upgrade").click();
    close();
  };
}