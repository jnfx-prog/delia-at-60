window.addEventListener('load', function () {
    setTimeout(() => {
        document.body.classList.remove('hidden-content');
    }, 300);
});

document.getElementById('rsvpBtn').addEventListener('click', function () {
    const nameInput = document.getElementById('guestName');
    const guestName = nameInput.value.trim();

    if (guestName === "") {
        alert("Please enter your name!");
        return;
    }

    // --- GOOGLE FORM CONFIGURATION ---
    // 1. Replace the URL below with your Form's "viewform" URL, but change "viewform" to "formResponse"
    const formURL = "https://docs.google.com/forms/d/e/1FAIpQLSe-bYTF0CB08vVxn38CoooKF43357qKcNB4uu-dDByYTMJUZA/viewform";

    // 2. Replace 'entry.XXXXX' with your actual Entry ID
    const entryID = "entry.118511384";

    // Create the data to send
    const formData = new FormData();
    formData.append(entryID, guestName);

    // Send the data silently to Google
    fetch(formURL, {
        method: "POST",
        mode: "no-cors", // This is important to prevent errors
        body: formData
    })
        .then(() => {
            // UI Transitions after successful send
            document.getElementById('rsvp-form').style.display = 'none';
            document.getElementById('displayName').innerText = guestName;
            document.getElementById('message').style.display = 'block';
            console.log("RSVP sent to Google Sheets!");
        })
        .catch((error) => {
            alert("Oops! Something went wrong. Please try again.");
            console.error(error);
        });

});


