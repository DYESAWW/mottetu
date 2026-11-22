fetch("assets/ascii-art.txt")
.then(response => response.text())
.then(text => {
	document.getElementById("ascii-background").textContent = text;
});

const URLS = ["jaan", "karl", "konstantin"];

// select from index for URLS array
function randomPage() {
	return Math.floor(Math.random() * 3);
}

// redirect to random url from URLS
function redirectFurther() {
	const SELECTOR = randomPage()
	selected = URLS[SELECTOR]
	window.location.href = selected;
}

document.getElementById("randomButton").addEventListener("click", redirectFurther); // execute function on button click