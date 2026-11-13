const button = document.querySelector(".button");
const cow = document.querySelector(".cow");
let has_faded = false;

function Randomizer(element) {

    const min = 30
    const max = 50
    const random_x = Math.floor(min + Math.random() * (max-min));
    const random_y = Math.floor(min + Math.random() * (max-min));
    element.style.left = random_x + "%";
    element.style.top = random_y + "%";

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
