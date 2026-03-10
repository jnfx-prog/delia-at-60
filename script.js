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

  // Replace with your published CSV URL if you want cross-device dedupe.
  // Example: 'https://docs.google.com/spreadsheets/d/e/YOUR_ID/pub?output=csv'
  const GUESTS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQyZkqdY72fUCClENnmgKSwHr4Wcy3BWXHlfELKjmM2PqnpkEeu1Piaj5vPrDFnEbX8sn0iGOj6CcML/pubhtml'; // <-- set CSV URL here or leave empty to use localStorage only

  // Helper: sanitize and normalize name for comparison
  function normalizeName(value) {
    return value.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 80);
  }

  // Read partyGuests array from localStorage
  function readLocalGuests() {
    try {
      const raw = localStorage.getItem('partyGuests');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // Save partyGuests array to localStorage
  function saveLocalGuests(arr) {
    localStorage.setItem('partyGuests', JSON.stringify(arr));
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
        return rows.map(r => {
          if (r.startsWith('"') && r.endsWith('"')) {
            return r.slice(1, -1).replace(/""/g, '"');
          }
          return r;
        });
      })
      .catch(err => {
        console.warn('Could not fetch CSV:', err);
        return []; // fallback to empty list
      });
  }

  // UI helpers
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

  function disableInputForReserved(name) {
    nameInput.disabled = true;
    rsvpBtn.disabled = true;
    rsvpBtn.textContent = 'Already Reserved';
    rsvpBtn.setAttribute('aria-disabled', 'true');
    nameInput.setAttribute('title', 'This name is already on the guest list');
    // Optionally show a message in the existing message element
    displayName.innerText = name;
    message.style.display = 'block';
    message.textContent = `This name is already on the guest list, ${name}.`;
  }

  function enableInput() {
    nameInput.disabled = false;
    rsvpBtn.disabled = false;
    rsvpBtn.textContent = 'Kindly RSVP';
    rsvpBtn.removeAttribute('aria-disabled');
    nameInput.removeAttribute('title');
    // Restore success message only when appropriate
    if (localStorage.getItem('rsvpName')) {
      // keep success message visible if user already RSVP'd from this browser
      displayName.innerText = localStorage.getItem('rsvpName');
      message.style.display = 'block';
      message.textContent = `We've added you to the guest list, ${displayName.innerText}! ✨`;
    } else {
      message.style.display = 'none';
    }
  }

  // Debounce helper
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Check whether a name exists (checks CSV first if provided, otherwise localStorage)
  function checkNameExists(name) {
    const normalized = normalizeName(name);
    if (!normalized) return Promise.resolve(false);

    if (GUESTS_CSV_URL) {
      return fetchGuestCsv().then(existingNames => {
        return existingNames.some(n => normalizeName(n) === normalized);
      });
    } else {
      const guests = readLocalGuests();
      return Promise.resolve(guests.some(n => normalizeName(n) === normalized));
    }
  }

  // On input change (debounced), check for duplicates and disable if found
  const debouncedCheck = debounce(function () {
    const raw = nameInput.value || '';
    const trimmed = raw.trim();
    if (!trimmed) {
      // If empty, ensure inputs are enabled unless user already RSVP'd
      if (!localStorage.getItem('rsvpName')) enableInput();
      return;
    }

    checkNameExists(trimmed).then(exists => {
      if (exists) {
        disableInputForReserved(trimmed);
      } else {
        // If the user already RSVP'd from this browser, keep the success state
        if (localStorage.getItem('rsvpName')) {
          disableInputForReserved(localStorage.getItem('rsvpName'));
        } else {
          enableInput();
        }
      }
    });
  }, 450);

  // Restore previously submitted name if present (single-name UX)
  const savedName = localStorage.getItem('rsvpName');
  if (savedName) {
    displayName.innerText = savedName;
    message.style.display = 'block';
    message.textContent = `We've added you to the guest list, ${savedName}! ✨`;
    form.style.display = 'none';
  } else {
    // If no saved name, run an initial check in case the input is prefilled
    if (nameInput.value.trim()) debouncedCheck();
  }

  // Attach input listener
  nameInput.addEventListener('input', debouncedCheck);
  nameInput.addEventListener('blur', debouncedCheck);

  // Form submit handler (re-check before sending)
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    const rawName = nameInput.value || '';
    const trimmed = rawName.trim();
    if (!trimmed) {
      nameInput.focus();
      alert('Please enter your name!');
      return;
    }

    setSubmitting(true);

    // Re-check duplicates right before submit
    checkNameExists(trimmed).then(exists => {
      if (exists) {
        setSubmitting(false);
        disableInputForReserved(trimmed);
        return;
      }

      // Add locally immediately (optimistic)
      const guests = readLocalGuests();
      guests.push(trimmed);
      saveLocalGuests(guests);
      localStorage.setItem('rsvpName', trimmed);

      // Send to Google Forms (fire-and-forget; no-cors)
      const formURL = 'https://docs.google.com/forms/d/e/1FAIpQLSe-bYTF0CB08vVxn38CoooKF43357qKcNB4uu-dDByYTMJUZA/formResponse';
      const entryID = 'entry.118511384';
      const formData = new FormData();
      formData.append(entryID, trimmed);

      fetch(formURL, { method: 'POST', mode: 'no-cors', body: formData })
        .then(() => {
          // Update UI on "success"
          form.style.display = 'none';
          displayName.innerText = trimmed;
          message.style.display = 'block';
          message.textContent = `We've added you to the guest list, ${trimmed}! ✨`;
          setSubmitting(false);
          // Keep inputs disabled to prevent duplicate local submissions
          nameInput.disabled = true;
          rsvpBtn.disabled = true;
          rsvpBtn.textContent = 'Reserved';
        })
        .catch((err) => {
          setSubmitting(false);
          alert('Oops! Something went wrong. Please try again.');
          console.error(err);
        });
    });
  });
})();
