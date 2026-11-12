const spookymode = document.querySelector(".spookymode");

/*every time the mouse is being moved on the page, it updates the flashlight circle coordinates */
document.addEventListener("mousemove", (e) => {
    spookymode.style.setProperty("--x", e.clientX + "px");
    spookymode.style.setProperty("--y", e.clientY + "px");
});
/*updates the flashlight positon when touching the screen on mobile */
document.addEventListener("touchmove", (e) => {
    spookymode.style.setProperty("--x", e.clientX + "px");
    spookymode.style.setProperty("--y", e.clientY + "px");
});