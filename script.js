// Entrance animation
window.addEventListener('load', function () {
  setTimeout(() => {
    document.body.classList.remove('hidden-content');
  }, 300);
});

(function () {
  const form = document.getElementById('rsvp-form');
  const nameInput = document.getElementById('guestName');
  const rsvpBtn = document.getElementById('rsvpBtn');
  const message = document.getElementById('message');

  // Google Form config (optional; keep if you want to post to Google)
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe-bYTF0CB08vVxn38CoooKF43357qKcNB4uu-dDByYTMJUZA/formResponse';
  const ENTRY_ID = 'entry.118511384';

  // LocalStorage keys
  const LS_CONFIRMED_KEY = 'rsvpConfirmed';
  const LS_NAME_KEY = 'rsvpName';

  // Helper: sanitize and normalize name
  function normalizeName(value) {
    return value.replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  // Show the persistent thank-you message and hide the form
  function showConfirmedMessage(name) {
    form.style.display = 'none';
    const displayName = name ? `, ${name}` : '';
    message.textContent = `Thank you for confirming${displayName}. See you soon! ✨`;
    message.style.display = 'block';
  }

  // Initialize on load: if previously confirmed, show message
  const confirmed = localStorage.getItem(LS_CONFIRMED_KEY);
  const savedName = localStorage.getItem(LS_NAME_KEY);
  if (confirmed === 'true') {
    showConfirmedMessage(savedName);
    // Also disable inputs in case form is visible by CSS or other scripts
    nameInput.disabled = true;
    rsvpBtn.disabled = true;
  } else {
    // Ensure message is hidden and form visible
    message.style.display = 'none';
    form.style.display = 'flex';
  }

  // Disable UI while submitting
  function setSubmitting(isSubmitting) {
    rsvpBtn.disabled = isSubmitting;
    if (isSubmitting) {
      rsvpBtn.setAttribute('aria-busy', 'true');
      rsvpBtn.textContent = 'Sending...';
    } else {
      rsvpBtn.removeAttribute('aria-busy');
      rsvpBtn.textContent = 'Kindly RSVP';
    }
  }

  // Submit handler
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    // If already confirmed in this browser, show message and return
    if (localStorage.getItem(LS_CONFIRMED_KEY) === 'true') {
      showConfirmedMessage(localStorage.getItem(LS_NAME_KEY));
      return;
    }

    const rawName = nameInput.value || '';
    const guestName = normalizeName(rawName);

    if (!guestName) {
      nameInput.focus();
      alert('Please enter your name!');
      return;
    }

    // Prevent double clicks
    setSubmitting(true);

    // Optimistically save confirmation locally so the user sees immediate feedback
    localStorage.setItem(LS_CONFIRMED_KEY, 'true');
    localStorage.setItem(LS_NAME_KEY, guestName);

    // Update UI immediately
    showConfirmedMessage(guestName);

    // Optionally send to Google Forms (fire-and-forget; no-cors)
    // If you don't want to post externally, remove the fetch block below.
    try {
      const formData = new FormData();
      formData.append(ENTRY_ID, guestName);

      fetch(FORM_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
      })
        .then(() => {
          // Because of no-cors, we cannot reliably detect server errors.
          // We already saved locally and updated the UI.
          setSubmitting(false);
          // Keep inputs disabled to prevent duplicate local submissions
          nameInput.disabled = true;
          rsvpBtn.disabled = true;
          rsvpBtn.textContent = 'Reserved';
        })
        .catch((err) => {
          // In the unlikely event of a network error, keep local confirmation but re-enable button
          console.error('RSVP submission error:', err);
          setSubmitting(false);
          nameInput.disabled = true;
          rsvpBtn.disabled = true;
        });
    } catch (err) {
      console.error('Unexpected error while sending RSVP:', err);
      setSubmitting(false);
    }
  });
})();
