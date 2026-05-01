chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startSnip") {
        
        // --- Create overlay ---
        const overlay = document.createElement("div")
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.4);
            cursor: crosshair;
            z-index: 999999;
        `
        document.body.appendChild(overlay)

        
        const selectionBox = document.createElement("div")
        selectionBox.style.cssText = `
            position: fixed;
            border: 2px solid #ffffff;
            background: rgba(0, 170, 255, 0.25);
            box-shadow: 0 0 0 1px rgba(0, 170, 255, 0.6),
                        0 0 10px rgba(0, 170, 255, 0.5);
            pointer-events: none;
            z-index: 9999999;
        `
        document.body.appendChild(selectionBox)

        let startX, startY, isDrawing = false

        
        overlay.addEventListener("mousedown", (e) => {
            isDrawing = true
            startX = e.clientX
            startY = e.clientY

            selectionBox.style.left   = startX + "px"
            selectionBox.style.top    = startY + "px"
            selectionBox.style.width  = "0px"
            selectionBox.style.height = "0px"
        })

       
        overlay.addEventListener("mousemove", (e) => {
            if (!isDrawing) return

            const currentX = e.clientX
            const currentY = e.clientY

            const x = Math.min(currentX, startX)
            const y = Math.min(currentY, startY)
            const width  = Math.abs(currentX - startX)
            const height = Math.abs(currentY - startY)

            selectionBox.style.left   = x + "px"
            selectionBox.style.top    = y + "px"
            selectionBox.style.width  = width + "px"
            selectionBox.style.height = height + "px"
        })

        
        overlay.addEventListener("mouseup", (e) => {
            isDrawing = false

            const dpr = window.devicePixelRatio || 1  

            const x = parseInt(selectionBox.style.left)
            const y = parseInt(selectionBox.style.top)
            const width  = parseInt(selectionBox.style.width)
            const height = parseInt(selectionBox.style.height)

           
            overlay.remove()
            selectionBox.remove()

            sendResponse({
                coords: {
                    x:      Math.round(x * dpr),
                    y:      Math.round(y * dpr),
                    width:  Math.round(width * dpr),
                    height: Math.round(height * dpr)
                }
            })
        })

        
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                overlay.remove()
                selectionBox.remove()
                sendResponse({ coords: null })  
            }
        }, { once: true })

        return true  
    }
})