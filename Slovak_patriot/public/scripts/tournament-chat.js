// tournament-chat.js - Tournament chat functionality
let currentUser = null;
let teamChatWs = null;
let captainChatWs = null;
let currentTeam = null;
let isCaptain = false;
let currentMatchRoom = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  const sessionResponse = await fetch('/session');
  const sessionData = await sessionResponse.json();

  if (!sessionData.loggedIn) {
    alert('Please login to access tournament chat');
    window.location.href = 'login.html';
    return;
  }
  
  currentUser = sessionData.user;

  // Check if user is in a team
  if (!currentUser.teamId) {
    document.getElementById('team-chat').innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <p style="color: var(--gray); font-size: 1.2rem;">You need to be in a team to access team chat.</p>
        <a href="../index.html" class="btn btn-activate" style="display: inline-block; margin-top: 20px; padding: 15px 30px; text-decoration: none;">Go to Home</a>
      </div>
    `;
    return;
  }

  // Get team info
  const teamResponse = await fetch(`/teams/${currentUser.teamId}`);
  const teamData = await teamResponse.json();
  
  if (teamData.ok) {
    currentTeam = teamData.team;
    isCaptain = currentTeam.captainId === currentUser.id;
    
    // Show captain chat tab if user is captain
    if (isCaptain) {
      document.querySelector('[data-tab="captain-chat"]').style.display = 'block';
      
      // Find which match this team is in
      await findTeamMatch();
    }
  }

  // Initialize tabs
  initializeTabs();

  // Initialize WebSocket connections
  initializeTeamChat();
  if (isCaptain) {
    initializeCaptainChat();
  }
});

function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      tab.classList.add('active');
      const tabName = tab.getAttribute('data-tab');
      document.getElementById(tabName).classList.add('active');
    });
  });
}

async function findTeamMatch() {
  try {
    const eventsResponse = await fetch('/events');
    const eventsData = await eventsResponse.json();
    
    if (eventsData.ok) {
      // Find live events where this team is registered
      const liveEvents = eventsData.events.filter(e => 
        e.status === 'live' && 
        e.bracket && 
        e.registrations.some(r => r.teamId === currentTeam.id)
      );
      
      if (liveEvents.length > 0) {
        // Find the match this team is currently in
        for (const event of liveEvents) {
          for (const round of event.bracket) {
            for (const match of round) {
              if ((match.participant1?.id === currentTeam.id || match.participant2?.id === currentTeam.id) && !match.winner) {
                currentMatchRoom = `match-${event.id}-${match.matchId}`;
                return;
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error finding team match:', error);
  }
}

function initializeTeamChat() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  teamChatWs = new WebSocket(`${protocol}//${window.location.host}`);

  teamChatWs.onopen = () => {
    console.log('Team Chat WebSocket connected');
    teamChatWs.send(JSON.stringify({
      type: 'auth',
      userId: currentUser.id,
      username: currentUser.username,
      isAdmin: false,
      isCaptain: isCaptain,
      teamId: currentUser.teamId,
      room: `team-${currentUser.teamId}`
    }));
  };

  teamChatWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'history') {
      displayTeamChatHistory(data.messages);
    } else if (data.type === 'message') {
      appendTeamMessage(data.message);
    }
  };

  teamChatWs.onclose = () => {
    console.log('Team Chat WebSocket disconnected, reconnecting...');
    setTimeout(initializeTeamChat, 3000);
  };
}

function initializeCaptainChat() {
  if (!currentMatchRoom) {
    document.getElementById('captain-chat').innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <p style="color: var(--gray); font-size: 1.2rem;">Captain chat will be available when your team is in an active match.</p>
      </div>
    `;
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  captainChatWs = new WebSocket(`${protocol}//${window.location.host}`);

  captainChatWs.onopen = () => {
    console.log('Captain Chat WebSocket connected');
    captainChatWs.send(JSON.stringify({
      type: 'auth',
      userId: currentUser.id,
      username: currentUser.username,
      isAdmin: false,
      isCaptain: true,
      teamId: currentUser.teamId,
      room: currentMatchRoom
    }));
  };

  captainChatWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'history') {
      displayCaptainChatHistory(data.messages);
    } else if (data.type === 'message') {
      appendCaptainMessage(data.message);
    }
  };

  captainChatWs.onclose = () => {
    console.log('Captain Chat WebSocket disconnected, reconnecting...');
    setTimeout(initializeCaptainChat, 3000);
  };
}

function displayTeamChatHistory(messages) {
  const historyDiv = document.getElementById('teamChatHistory');
  if (!historyDiv) return;

  historyDiv.innerHTML = messages.map(msg => `
    <div style="margin-bottom: 12px; padding: 10px; background: ${msg.userId === currentUser.id ? 'rgba(220, 20, 60, 0.1)' : 'var(--black-lighter)'}; border-radius: 6px; border-left: 3px solid ${msg.userId === currentUser.id ? 'var(--accent-red)' : 'var(--gray)'};">
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span style="font-weight: bold; color: var(--white);">${msg.username} ${msg.isCaptain ? '??' : ''}</span>
        <span style="font-size: 0.8rem; color: #666;">${new Date(msg.timestamp).toLocaleTimeString()}</span>
      </div>
      <div style="color: var(--gray);">${msg.message}</div>
    </div>
  `).join('');

  historyDiv.scrollTop = historyDiv.scrollHeight;
}

function appendTeamMessage(message) {
  const historyDiv = document.getElementById('teamChatHistory');
  if (!historyDiv) return;

  const msgDiv = document.createElement('div');
  msgDiv.style.cssText = `margin-bottom: 12px; padding: 10px; background: ${message.userId === currentUser.id ? 'rgba(220, 20, 60, 0.1)' : 'var(--black-lighter)'}; border-radius: 6px; border-left: 3px solid ${message.userId === currentUser.id ? 'var(--accent-red)' : 'var(--gray)'}`;
  
  msgDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <span style="font-weight: bold; color: var(--white);">${message.username} ${message.isCaptain ? '??' : ''}</span>
      <span style="font-size: 0.8rem; color: #666;">${new Date(message.timestamp).toLocaleTimeString()}</span>
    </div>
    <div style="color: var(--gray);">${message.message}</div>
  `;

  historyDiv.appendChild(msgDiv);
  historyDiv.scrollTop = historyDiv.scrollHeight;
}

function displayCaptainChatHistory(messages) {
  const historyDiv = document.getElementById('captainChatHistory');
  if (!historyDiv) return;

  historyDiv.innerHTML = messages.map(msg => `
    <div style="margin-bottom: 12px; padding: 10px; background: ${msg.isAdmin ? 'rgba(255, 68, 68, 0.1)' : msg.userId === currentUser.id ? 'rgba(220, 20, 60, 0.1)' : 'var(--black-lighter)'}; border-radius: 6px; border-left: 3px solid ${msg.isAdmin ? 'var(--accent-red)' : msg.userId === currentUser.id ? 'var(--primary-red)' : 'var(--gray)'};">
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span style="font-weight: bold; color: ${msg.isAdmin ? 'var(--accent-red)' : 'var(--white)'};">${msg.username} ${msg.isAdmin ? '(Admin)' : '(Captain)'}</span>
        <span style="font-size: 0.8rem; color: #666;">${new Date(msg.timestamp).toLocaleTimeString()}</span>
      </div>
      <div style="color: var(--gray);">${msg.message}</div>
    </div>
  `).join('');

  historyDiv.scrollTop = historyDiv.scrollHeight;
}

function appendCaptainMessage(message) {
  const historyDiv = document.getElementById('captainChatHistory');
  if (!historyDiv) return;

  const msgDiv = document.createElement('div');
  msgDiv.style.cssText = `margin-bottom: 12px; padding: 10px; background: ${message.isAdmin ? 'rgba(255, 68, 68, 0.1)' : message.userId === currentUser.id ? 'rgba(220, 20, 60, 0.1)' : 'var(--black-lighter)'}; border-radius: 6px; border-left: 3px solid ${message.isAdmin ? 'var(--accent-red)' : message.userId === currentUser.id ? 'var(--primary-red)' : 'var(--gray)'}`;
  
  msgDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <span style="font-weight: bold; color: ${message.isAdmin ? 'var(--accent-red)' : 'var(--white)'};">${message.username} ${message.isAdmin ? '(Admin)' : '(Captain)'}</span>
      <span style="font-size: 0.8rem; color: #666;">${new Date(message.timestamp).toLocaleTimeString()}</span>
    </div>
    <div style="color: var(--gray);">${message.message}</div>
  `;

  historyDiv.appendChild(msgDiv);
  historyDiv.scrollTop = historyDiv.scrollHeight;
}

function sendTeamMessage() {
  const input = document.getElementById('teamChatInput');
  const message = input.value.trim();

  if (message && teamChatWs && teamChatWs.readyState === WebSocket.OPEN) {
    teamChatWs.send(JSON.stringify({
      type: 'message',
      userId: currentUser.id,
      username: currentUser.username,
      message: message,
      isAdmin: false,
      isCaptain: isCaptain,
      teamId: currentUser.teamId,
      room: `team-${currentUser.teamId}`
    }));
    input.value = '';
  }
}

function sendCaptainMessage() {
  const input = document.getElementById('captainChatInput');
  const message = input.value.trim();

  if (message && captainChatWs && captainChatWs.readyState === WebSocket.OPEN) {
    captainChatWs.send(JSON.stringify({
      type: 'message',
      userId: currentUser.id,
      username: currentUser.username,
      message: message,
      isAdmin: false,
      isCaptain: true,
      teamId: currentUser.teamId,
      room: currentMatchRoom
    }));
    input.value = '';
  }
}

// Allow sending messages with Enter key
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab.id === 'team-chat') {
      sendTeamMessage();
    } else if (activeTab.id === 'captain-chat') {
      sendCaptainMessage();
    }
  }
});