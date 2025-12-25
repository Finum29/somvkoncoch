// support.js - Support ticket functionality
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const sessionResponse = await fetch('/session');
  const sessionData = await sessionResponse.json();

  const loginRequired = document.getElementById('loginRequired');
  const supportFormContainer = document.getElementById('supportFormContainer');

  if (!sessionData.loggedIn) {
    loginRequired.style.display = 'block';
    supportFormContainer.style.display = 'none';
  } else {
    loginRequired.style.display = 'none';
    supportFormContainer.style.display = 'block';

    const supportForm = document.getElementById('supportForm');
    if (supportForm) {
      supportForm.addEventListener('submit', submitTicket);
    }
  }
});

async function submitTicket(e) {
  e.preventDefault();

  const messageDiv = document.getElementById('message');
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('messageText').value;

  try {
    const response = await fetch('/tickets/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message })
    });

    const data = await response.json();

    if (data.ok) {
      messageDiv.innerHTML = '<div class="success-message">Ticket submitted successfully! Our team will respond soon.</div>';
      document.getElementById('supportForm').reset();
      
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 2000);
    } else {
      messageDiv.innerHTML = `<div class="error-message">${data.message}</div>`;
    }
  } catch (error) {
    console.error('Error submitting ticket:', error);
    messageDiv.innerHTML = '<div class="error-message">Failed to submit ticket. Please try again.</div>';
  }
}