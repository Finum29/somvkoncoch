// chat.js - Real-time chat functionality
let ws = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const sessionResponse = await fetch('/session');
  const sessionData = await sessionResponse.json();

  if (!sessionData.loggedIn) {
    alert('Please login to use chat');
    window.location.href = 'login.html';
    return;
  }

  currentUser = sessionData.user;
  initializeChat();
});

function initializeChat() {
  const chatStatus = document.getElementById('chatStatus');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');

  // Connect to WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    chatStatus.textContent = 'Connected';
    chatStatus.className = 'chat-status connected';
    chatInput.disabled = false;
    sendBtn.disabled = false;

    // Authenticate
    ws.send(JSON.stringify({
      type: 'auth',
      userId: currentUser.id,
      username: currentUser.username,
      isAdmin: currentUser.isAdmin
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'history') {
      displayChatHistory(data.messages);
    } else if (data.type === 'message') {
      displayMessage(data.message);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    chatStatus.textContent = 'Connection error';
    chatStatus.className = 'chat-status disconnected';
  };

  ws.onclose = () => {
    chatStatus.textContent = 'Disconnected';
    chatStatus.className = 'chat-status disconnected';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Attempt to reconnect after 3 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.CLOSED) {
        initializeChat();
      }
    }, 3000);
  };

  // Send message on button click
  sendBtn.addEventListener('click', sendMessage);

  // Send message on Enter key
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value.trim();

  if (!message || !ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify({
    type: 'message',
    userId: currentUser.id,
    username: currentUser.username,
    message: message,
    isAdmin: currentUser.isAdmin
  }));

  chatInput.value = '';
}

function displayChatHistory(messages) {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '';

  messages.forEach(msg => {
    displayMessage(msg);
  });

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function displayMessage(message) {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  
  const isOwnMessage = message.userId === currentUser.id;
  const messageClass = isOwnMessage ? 'own' : (message.isAdmin ? 'admin' : '');
  
  messageDiv.className = `chat-message ${messageClass}`;
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-username ${message.isAdmin ? 'admin' : ''}">
        ${message.username}${message.isAdmin ? ' (Admin)' : ''}
      </span>
      <span class="message-time">${formatTime(message.timestamp)}</span>
    </div>
    <div class="message-text">${escapeHtml(message.message)}</div>
  `;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}