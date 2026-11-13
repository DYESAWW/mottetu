const button = document.querySelector(".button");
const cow = document.querySelector(".cow");
let has_faded = false;

function Randomizer(element) {
const random_x = Math.floor(Math.random()*(screen.availWidth - element.offsetWidth));
const random_y = Math.floor(Math.random()*(screen.availHeight - element.offsetHeight));
element.style.left = random_x + "px";
element.style.top = random_y + "px";

}
Randomizer(button);

function Cow_Spawn() {

    if (has_faded == false){
        Fade();
        has_faded = true;
    }

    Randomizer(cow);
    cow.style.display = "block";
}


button.addEventListener("click",Cow_Spawn);
