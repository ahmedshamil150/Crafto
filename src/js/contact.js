import { showToast } from './main.js';

const form = document.getElementById('contact-form');
const btn  = form?.querySelector('button[type="submit"]');
const status = document.getElementById('contact-status');

form?.addEventListener('submit', async e => {
  e.preventDefault();
  const hp = document.getElementById('hp-contact-website');
  if (hp && hp.value.trim()) return;

  btn.disabled = true;
  btn.textContent = 'Sending…';
  status.textContent = '';

  const data = {
    _subject: 'Crafto Contact Form',
    name: document.getElementById('c-name').value.trim(),
    email: document.getElementById('c-email').value.trim(),
    message: document.getElementById('c-message').value.trim(),
  };

  try {
    const res = await fetch('https://formsubmit.co/ajax/crafto.pk@gmail.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      window.location.href = './contact-success';
    } else {
      throw new Error(json.message || 'Failed to send.');
    }
  } catch (err) {
    status.textContent = err.message;
    status.style.color = '#c62828';
    btn.disabled = false;
    btn.textContent = 'Send Message';
  }
});
