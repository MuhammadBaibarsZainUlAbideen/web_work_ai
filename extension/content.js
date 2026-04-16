chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "START_SNIP") return;

    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 999999;
        cursor: crosshair; background: rgba(0,0,0,0.35);
    `;
    document.body.appendChild(overlay);

    let startX, startY, box;

    overlay.addEventListener("mousedown", (e) => {
        startX = e.clientX;
        startY = e.clientY;

        box = document.createElement("div");
        box.style.cssText = `
        position: fixed; border: 2px solid #fff;
        background: rgba(255,255,255,0.1); pointer-events: none;
        `;
        overlay.appendChild(box);
    });

    overlay.addEventListener("mousemove", (e) => {
        if (!box) return;
        const x = Math.min(e.clientX, startX);
        const y = Math.min(e.clientY, startY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        Object.assign(box.style, {
        left: x + "px", top: y + "px",
        width: w + "px", height: h + "px"
        });
    });

    overlay.addEventListener("mouseup", (e) => {
        const rect = box.getBoundingClientRect();
        document.body.removeChild(overlay);
        cropScreenshot(msg.dataUrl, rect); // step 3
    });
});
function cropScreenshot(dataUrl, rect) {
  const dpr = window.devicePixelRatio || 1; 
  const img = new Image();
  img.src = dataUrl;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img,
      rect.x * dpr, rect.y * dpr,         
      rect.width * dpr, rect.height * dpr, 
      0, 0,                                
      rect.width * dpr, rect.height * dpr  
    );
    const croppedUrl = canvas.toDataURL("image/png");
    chrome.runtime.sendMessage({ type: "SNIP_DONE", dataUrl: croppedUrl });

  };
}