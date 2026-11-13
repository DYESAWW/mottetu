const spookymode = document.querySelector(".spookymode");
const bg = document.querySelector(".bg");
const button_pressed = false

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

function Fade(){
    let size = 150;
    let count = 0;
    bg.style.setProperty("--reveal", "pointer");
    const timer = setInterval(() => {
        if (count === 240) {

            clearInterval(timer);
            spookymode.style.setProperty("--clear", 100 + "%");
            
        } else {

            size += Math.max(screen.width,screen.height)/50;
            count++;
            spookymode.style.setProperty("--z", size + "px");
        }
        
    },10);
    
        
    }


/*button.addEventListener("clicked",Fade){

}*/

