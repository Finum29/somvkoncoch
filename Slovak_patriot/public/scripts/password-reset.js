// password-reset.js - Password reset functionality
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const requestResetForm = document.getElementById('requestResetForm');
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const formTitle = document.getElementById('formTitle');
  const messageDiv = document.getElementById('message');

  if (token) {
    // Verify token and show reset form
    verifyToken(token);
  } else {
    // Show request reset form
    requestResetForm.addEventListener('submit', handleRequestReset);
  }

  resetPasswordForm.addEventListener('submit', (e) => handleResetPassword(e, token));
});

async function handleRequestReset(e) {
  e.preventDefault();

  const messageDiv = document.getElementById('message');
  const email = document.getElementById('email').value;

  try {
    const response = await fetch('/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (data.ok) {
      messageDiv.innerHTML = `
        <div class="success-message">
          ${data.message}<br><br>
          <strong>Note:</strong> Check the server console for the reset link (email simulation).
        </div>
      `;
      document.getElementById('requestResetForm').style.display = 'none';
    } else {
      messageDiv.innerHTML = `<div class="error-message">${data.message}</div>`;
    }
  } catch (error) {
    console.error('Error requesting password reset:', error);
    messageDiv.innerHTML = '<div class="error-message">Failed to send reset link. Please try again.</div>';
  }
}

async function verifyToken(token) {
  const messageDiv = document.getElementById('message');
  const requestResetForm = document.getElementById('requestResetForm');
  const resetPasswordForm = document.getElementById('resetPasswordForm');

  try {
    const response = await fetch('/password-reset/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    const data = await response.json();

    if (data.ok) {
      requestResetForm.style.display = 'none';
      resetPasswordForm.style.display = 'block';
      messageDiv.innerHTML = `<div class="success-message">Enter your new password for ${data.email}</div>`;
    } else {
      messageDiv.innerHTML = `<div class="error-message">${data.message}</div>`;
      requestResetForm.style.display = 'none';
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    messageDiv.innerHTML = '<div class="error-message">Invalid or expired reset link.</div>';
    requestResetForm.style.display = 'none';
  }
}

async function handleResetPassword(e, token) {
  e.preventDefault();

  const messageDiv = document.getElementById('message');
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    messageDiv.innerHTML = '<div class="error-message">Passwords do not match</div>';
    return;
  }

  if (newPassword.length < 4) {
    messageDiv.innerHTML = '<div class="error-message">Password must be at least 4 characters</div>';
    return;
  }

  try {
    const response = await fetch('/password-reset/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });

    const data = await response.json();

    if (data.ok) {
      messageDiv.innerHTML = '<div class="success-message">Password reset successful! Redirecting to login...</div>';
      document.getElementById('resetPasswordForm').style.display = 'none';
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      messageDiv.innerHTML = `<div class="error-message">${data.message}</div>`;
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    messageDiv.innerHTML = '<div class="error-message">Failed to reset password. Please try again.</div>';
  }
}