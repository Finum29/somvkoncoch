// notifications.js - Push notification handler
let notificationPermission = 'default';

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const sessionResponse = await fetch('/session');
  const sessionData = await sessionResponse.json();

  if (sessionData.loggedIn) {
    initializeNotifications();
  }
});

async function initializeNotifications() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  notificationPermission = Notification.permission;

  if (notificationPermission === 'default') {
    // Show a prompt to enable notifications
    showNotificationPrompt();
  } else if (notificationPermission === 'granted') {
    subscribeToNotifications();
  }
}

function showNotificationPrompt() {
  // Create a subtle banner to ask for notification permission
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: var(--black-lighter);
    color: var(--white);
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 9999;
    max-width: 300px;
  `;
  banner.innerHTML = `
    <p style="margin: 0 0 10px 0; font-size: 0.9rem;">Enable notifications to get updates about events and matches?</p>
    <div style="display: flex; gap: 10px;">
      <button id="enableNotifications" style="flex: 1; padding: 8px; background: var(--accent-red); color: white; border: none; border-radius: 4px; cursor: pointer;">Enable</button>
      <button id="dismissNotifications" style="flex: 1; padding: 8px; background: var(--gray); color: white; border: none; border-radius: 4px; cursor: pointer;">Later</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('enableNotifications').addEventListener('click', async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      subscribeToNotifications();
      showNotification('Notifications Enabled', 'You will now receive updates about events and matches');
    }
    banner.remove();
  });

  document.getElementById('dismissNotifications').addEventListener('click', () => {
    banner.remove();
  });
}

async function subscribeToNotifications() {
  try {
    // In a real implementation, this would register a service worker and subscribe to push notifications
    const subscription = {
      endpoint: 'simulated-endpoint',
      keys: {
        p256dh: 'simulated-key',
        auth: 'simulated-auth'
      }
    };

    await fetch('/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription })
    });

    console.log('Subscribed to push notifications');
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
  }
}

function showNotification(title, body, icon = '../images/SPlogo-edited.png') {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon,
      badge: icon
    });
  }
}

// Export for use in other scripts
window.showNotification = showNotification;