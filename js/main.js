fetch("/assets/ascii-art.txt")
    .then(response => response.text())
    .then(text => {
        document.getElementById("ascii-background").textContent = text;
    });