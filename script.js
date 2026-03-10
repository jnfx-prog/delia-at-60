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
  const displayName = document.getElementById('displayName');

  // Optional: set your published CSV URL here (replace with your actual URL)
  const GUESTS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyZkqdY72fUCClENnmgKSwHr4Wcy3BWXHlfELKjmM2PqnpkEeu1Piaj5vPrDFnEbX8sn0iGOj6CcML/pubhtml'; // e.g. 'https://docs.google.com/spreadsheets/d/e/YOUR_ID/pub?output=csv'

  // Helper: sanitize and normalize name for comparison
  function normalizeName(value) {
    return value.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 80);
  }

  // Fetch published CSV and return array of names (first column)
  function fetchGuestCsv() {
    if (!GUESTS_CSV_URL) return Promise.resolve([]);
    return fetch(GUESTS_CSV_URL)
      .then(resp => {
        if (!resp.ok) throw new Error('Failed to fetch guest CSV');
        return resp.text();
      })
      .then(text => {
        const rows = text.split(/\r?\n/).filter(Boolean);
        // Basic CSV parsing for single-column sheet
        return rows.map(r => {
          // remove surrounding quotes if present
          if (r.startsWith('"') && r.endsWith('"')) {
            return r.slice(1, -1).replace(/""/g, '"');
          }
          return r;
        });
      })
      .catch(err => {
        console.warn('Could not fetch CSV:', err);
        return []; // fallback to empty list (so submission can proceed)
      });
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

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    const rawName = nameInput.value || '';
    const normalized = normalizeName(rawName);
    if (!normalized) {
      nameInput.focus();
      alert('Please enter your name!');
      return;
    }

    setSubmitting(true);

    // 1) Check published CSV for duplicates (if URL provided)
    fetchGuestCsv().then(existingNames => {
      const exists = existingNames.some(n => normalizeName(n) === normalized);
      if (exists) {
        setSubmitting(false);
        alert('This name is already on the guest list.');
        return;
      }

      // 2) Not found — proceed to submit to Google Forms (fire-and-forget)
      const formURL = 'https://docs.google.com/forms/d/e/1FAIpQLSe-bYTF0CB08vVxn38CoooKF43357qKcNB4uu-dDByYTMJUZA/formResponse';
      const entryID = 'entry.118511384';
      const formData = new FormData();
      formData.append(entryID, rawName.trim());

      fetch(formURL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
          // Update local UI and localStorage
          localStorage.setItem('rsvpName', rawName.trim());
          form.style.display = 'none';
          displayName.innerText = rawName.trim();
          message.style.display = 'block';
          setSubmitting(false);
          console.log('RSVP attempted (no-cors).');
        })
        .catch(err => {
          setSubmitting(false);
          alert('Oops! Something went wrong. Please try again.');
          console.error(err);
        });
    });
  });
})();
