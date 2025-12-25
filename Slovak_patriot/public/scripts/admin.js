// admin.js - Admin panel functionality
let currentTicketChatId = null;
let ws = null;
let currentUser = null;
let tournamentChatWs = null;

// Predefined event images
const EVENT_IMAGES = {
  'default': '../images/Background.png',
  'valorant': '../images/valorant.png',
  'lol': '../images/LOL.png',
  'f1': '../images/F-one.png'
};

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is admin
  const sessionResponse = await fetch('/session');
  const sessionData = await sessionResponse.json();

  if (!sessionData.loggedIn || !sessionData.user.isAdmin) {
    alert('Access denied. Admin privileges required.');
    window.location.href = '../index.html';
    return;
  }
  
  currentUser = sessionData.user;

  // Initialize tabs
  initializeTabs();

  // Load initial data
  loadPlayers();
  loadTeams();
  loadEvents();
  loadTickets();
  loadEventManagement();
  loadTournamentChatAdmin();

  // Setup event form
  const createEventForm = document.getElementById('createEventForm');
  if (createEventForm) {
    createEventForm.addEventListener('submit', createEvent);
  }

  // Show/hide team size based on mode selection
  const eventMode = document.getElementById('eventMode');
  if (eventMode) {
    eventMode.addEventListener('change', () => {
      const teamSizeGroup = document.getElementById('teamSizeGroup');
      if (eventMode.value === 'team' || eventMode.value === 'both') {
        teamSizeGroup.style.display = 'block';
      } else {
        teamSizeGroup.style.display = 'none';
      }
    });
  }
  
  // Show/hide custom URL input based on image selection
  const eventImageSelect = document.getElementById('eventImageSelect');
  if (eventImageSelect) {
    eventImageSelect.addEventListener('change', () => {
      const customUrlGroup = document.getElementById('customUrlGroup');
      if (eventImageSelect.value === 'custom') {
        customUrlGroup.style.display = 'block';
      } else {
        customUrlGroup.style.display = 'none';
      }
    });
  }
  
  // Initialize WebSocket for Admin Chat
  initializeAdminChat();
  initializeTournamentChatWs();
});

function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const tabName = tab.getAttribute('data-tab');
      document.getElementById(tabName).classList.add('active');

      // Reload data when switching tabs
      if (tabName === 'teams') {
        loadTeams();
      } else if (tabName === 'chat') {
        loadTournamentChatAdmin();
      } else if (tabName === 'support') {
        loadTickets();
      }
    });
  });
}

// --- WEBSOCKET CHAT ---
function initializeAdminChat() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
  
    ws.onopen = () => {
      console.log('Admin WebSocket connected');
      // Authenticate as admin
      ws.send(JSON.stringify({
        type: 'auth',
        userId: currentUser.id,
        username: currentUser.username,
        isAdmin: true,
        room: 'global' // Default to global, switch when opening ticket
      }));
    };
  
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_ticket') {
        // Show notification badge
        updateTicketNotificationBadge();
        playNotificationSound();
      } else if (currentTicketChatId) {
          if (data.type === 'history') {
            displayTicketChatHistory(data.messages);
          } else if (data.type === 'message') {
            displayTicketMessage(data.message);
          }
      }
    };
  
    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(initializeAdminChat, 3000);
    };
}

function playNotificationSound() {
  // Create a simple beep sound
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 1000;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

async function updateTicketNotificationBadge() {
  try {
    const response = await fetch('/tickets');
    const data = await response.json();
    
    if (data.ok) {
      const openTickets = data.tickets.filter(t => t.status === 'open').length;
      const badge = document.getElementById('ticketNotificationBadge');
      
      if (badge) {
        if (openTickets > 0) {
          badge.textContent = openTickets;
          badge.style.display = 'inline';
        } else {
          badge.style.display = 'none';
        }
      }
    }
  } catch (error) {
    console.error('Error updating ticket badge:', error);
  }
}

function initializeTournamentChatWs() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    tournamentChatWs = new WebSocket(`${protocol}//${window.location.host}`);
  
    tournamentChatWs.onopen = () => {
      console.log('Tournament Chat WebSocket connected');
      tournamentChatWs.send(JSON.stringify({
        type: 'auth',
        userId: currentUser.id,
        username: currentUser.username,
        isAdmin: true,
        room: 'tournament-admin'
      }));
    };
  
    tournamentChatWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'history') {
        displayTournamentChatHistory(data.messages);
      } else if (data.type === 'message') {
        appendTournamentMessage(data.message);
      }
    };
  
    tournamentChatWs.onclose = () => {
      console.log('Tournament Chat WebSocket disconnected, reconnecting...');
      setTimeout(initializeTournamentChatWs, 3000);
    };
}

function joinTicketRoom(ticketId) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        currentTicketChatId = ticketId;
        // Re-authenticate to switch room
        ws.send(JSON.stringify({
            type: 'auth',
            userId: currentUser.id,
            username: currentUser.username,
            isAdmin: true,
            room: `ticket-${ticketId}`
        }));
    }
}

function sendTicketMessage(ticketId, message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'message',
            userId: currentUser.id,
            username: currentUser.username,
            message: message,
            isAdmin: true,
            room: `ticket-${ticketId}`
        }));
    }
}


// PLAYERS TAB
async function loadPlayers() {
  try {
    const response = await fetch('/admin/users');
    const data = await response.json();

    if (data.ok) {
      displayPlayers(data.users);
    }
  } catch (error) {
    console.error('Error loading players:', error);
  }
}

function displayPlayers(users) {
  const playersList = document.getElementById('playersList');
  if (!playersList) return;

  if (users.length === 0) {
    playersList.innerHTML = '<p>No players registered yet.</p>';
    return;
  }

  playersList.innerHTML = users.map(user => `
    <div class="admin-card">
      <div class="card-header">
        <h3>${user.username}</h3>
        <span style="color: var(--gray);">${user.email}</span>
      </div>
      <div class="card-body">
        <p><strong>Status:</strong> ${user.status.toUpperCase()}</p>
        <p><strong>Team:</strong> ${user.teamId ? 'Yes' : 'No'}</p>
        <p><strong>Wallet:</strong> ${user.wallet || 0} credits</p>
        <p><strong>Registered Events:</strong> ${user.registeredEvents.length}</p>
        <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
      <div class="card-actions">
        ${user.status === 'active' ? `
          <button class="btn btn-suspend" onclick="suspendUser('${user.id}', '${user.username}')">Suspend</button>
          <button class="btn btn-ban" onclick="banUser('${user.id}', '${user.username}')">Ban</button>
        ` : `
          <button class="btn btn-activate" onclick="activateUser('${user.id}', '${user.username}')">Activate</button>
        `}
        <button class="btn btn-disqualify" onclick="showDisqualifyModal('${user.id}', '${user.username}')">Disqualify</button>
        <button class="btn btn-delete" onclick="deleteUser('${user.id}', '${user.username}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function banUser(userId, username) {
  if (!confirm(`Are you sure you want to BAN ${username}? They will not be able to access the site.`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/users/${userId}/ban`, {
      method: 'POST'
    });

    const data = await response.json();

    if (data.ok) {
      alert(`${username} has been banned`);
      loadPlayers();
    }
  } catch (error) {
    console.error('Error banning user:', error);
  }
}

async function suspendUser(userId, username) {
  if (!confirm(`Are you sure you want to SUSPEND ${username}? They won't be able to register for events.`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/users/${userId}/suspend`, {
      method: 'POST'
    });

    const data = await response.json();

    if (data.ok) {
      alert(`${username} has been suspended`);
      loadPlayers();
    }
  } catch (error) {
    console.error('Error suspending user:', error);
  }
}

async function activateUser(userId, username) {
  if (!confirm(`Activate ${username}'s account?`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/users/${userId}/activate`, {
      method: 'POST'
    });

    const data = await response.json();

    if (data.ok) {
      alert(`${username} has been activated`);
      loadPlayers();
    }
  } catch (error) {
    console.error('Error activating user:', error);
  }
}

async function deleteUser(userId, username) {
  if (!confirm(`Are you sure you want to DELETE ${username}'s account? This cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/users/${userId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.ok) {
      alert(`${username}'s account has been deleted`);
      loadPlayers();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}

async function showDisqualifyModal(userId, username) {
  const eventsResponse = await fetch('/events');
  const eventsData = await eventsResponse.json();

  if (!eventsData.ok || eventsData.events.length === 0) {
    alert('No events available for disqualification');
    return;
  }

  const eventOptions = eventsData.events
    .filter(e => e.status !== 'finished')
    .map(e => `${e.name} (${e.date})`)
    .join('\n');

  const eventName = prompt(`Select event to disqualify ${username} from:\n\n${eventOptions}\n\nEnter event name:`);
  if (!eventName) return;

  const event = eventsData.events.find(e => e.name === eventName);
  if (!event) {
    alert('Invalid event name');
    return;
  }

  await disqualifyUser(userId, username, event.id);
}

async function disqualifyUser(userId, username, eventId) {
  try {
    const response = await fetch(`/admin/users/${userId}/disqualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId })
    });

    const data = await response.json();

    if (data.ok) {
      alert(`${username} has been disqualified from the event. Entry fee is NOT refunded.`);
      loadPlayers();
      loadEvents();
    }
  } catch (error) {
    console.error('Error disqualifying user:', error);
  }
}

// TEAMS TAB
async function loadTeams() {
  try {
    const response = await fetch('/admin/teams');
    const data = await response.json();

    if (data.ok) {
      displayTeams(data.teams);
    }
  } catch (error) {
    console.error('Error loading teams:', error);
  }
}

function displayTeams(teams) {
  const teamsList = document.getElementById('teamsList');
  if (!teamsList) return;

  if (teams.length === 0) {
    teamsList.innerHTML = '<p>No teams created yet.</p>';
    return;
  }

  teamsList.innerHTML = teams.map(team => `
    <div class="admin-card">
      <div class="card-header">
        <h3>${team.name}</h3>
        <span style="color: var(--gray);">Code: ${team.inviteCode}</span>
      </div>
      <div class="card-body">
        <p><strong>Description:</strong> ${team.description || 'None'}</p>
        <p><strong>Motto:</strong> ${team.motto || 'None'}</p>
        <p><strong>Captain:</strong> ${team.captainName}</p>
        <p><strong>Members (${team.members.length}):</strong></p>
        <ul style="margin-top: 8px; color: var(--gray);">
          ${team.memberDetails.map(m => `<li>${m.username}${m.id === team.captainId ? ' (Captain)' : ''}</li>`).join('')}
        </ul>
        <p><strong>Created:</strong> ${new Date(team.createdAt).toLocaleDateString()}</p>
      </div>
      <div class="card-actions">
        <button class="btn btn-delete" onclick="deleteTeam('${team.id}', '${team.name}')">Delete Team</button>
      </div>
    </div>
  `).join('');
}

async function deleteTeam(teamId, teamName) {
  if (!confirm(`Are you sure you want to DELETE team "${teamName}"? All members will be removed from the team. This cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/teams/${teamId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.ok) {
      alert(`Team "${teamName}" has been deleted`);
      loadTeams();
      loadPlayers();
    }
  } catch (error) {
    console.error('Error deleting team:', error);
    alert('Failed to delete team');
  }
}

// EVENTS TAB
async function loadEvents() {
  try {
    const response = await fetch('/events');
    const data = await response.json();

    if (data.ok) {
      displayAdminEvents(data.events);
    }
  } catch (error) {
    console.error('Error loading events:', error);
  }
}

function displayAdminEvents(events) {
  const eventsList = document.getElementById('eventsList');
  if (!eventsList) return;

  if (events.length === 0) {
    eventsList.innerHTML = '<p>No events created yet.</p>';
    return;
  }

  eventsList.innerHTML = events.map(event => `
    <div class="admin-card" draggable="true" ondragstart="drag(event)" id="event-${event.id}" data-event-id="${event.id}">
      <div class="card-header">
        <h3>${event.name}</h3>
        <span class="event-status ${event.status}">${event.status.toUpperCase()}</span>
      </div>
      <div class="card-body">
        <p>${event.description || 'No description'}</p>
        <p><strong>Date:</strong> ${event.date} at ${event.time}</p>
        <p><strong>Mode:</strong> ${event.mode.toUpperCase()}</p>
        <p><strong>Elimination:</strong> ${event.eliminationType}</p>
        ${event.teamSize ? `<p><strong>Team Size:</strong> ${event.teamSize}v${event.teamSize}</p>` : ''}
        ${event.entryFee > 0 ? `<p><strong>Entry Fee:</strong> ${event.entryFee} credits</p>` : '<p><strong>Entry:</strong> Free</p>'}
        ${event.prizePool && (event.prizePool.first > 0 || event.prizePool.second > 0 || event.prizePool.third > 0) ? `<p><strong>Prize Pool:</strong> 1st: ${event.prizePool.first}, 2nd: ${event.prizePool.second}, 3rd: ${event.prizePool.third}</p>` : ''}
        <p><strong>Registrations:</strong> ${event.registrations.length}</p>
        ${event.streamUrl ? `<p><strong>Stream URL:</strong> ${event.streamUrl}</p>` : ''}
        ${event.lobbyUrl ? `<p><strong>Lobby URL:</strong> ${event.lobbyUrl}</p>` : ''}
        ${event.winner ? `<p><strong>Winner:</strong> ${event.winner.name}</p>` : ''}
        <div style="margin-top: 10px;">
          <img src="${event.iconUrl || '../images/Background.png'}" alt="${event.name}" style="max-width: 200px; border-radius: 8px;" onerror="this.src='../images/Background.png'">
        </div>
      </div>
      <div class="card-actions">
        ${event.status === 'upcoming' ? `
          <button class="btn btn-start" onclick="updateEventStatus('${event.id}', 'live')">Start Event</button>
          <button class="btn btn-edit" onclick="setStreamUrl('${event.id}', '${event.streamUrl || ''}')">Set Stream URL</button>
          <button class="btn btn-edit" onclick="setLobbyUrl('${event.id}', '${event.lobbyUrl || ''}')">Set Lobby URL</button>
          <button class="btn btn-edit" onclick="setEventImage('${event.id}', '${event.iconUrl || ''}')">Set Image URL</button>
        ` : ''}
        ${event.status === 'live' ? `
          <button class="btn btn-finish" onclick="updateEventStatus('${event.id}', 'finished')">Finish Event</button>
          <button class="btn btn-edit" onclick="announceWinner('${event.id}')">Announce Winner</button>
        ` : ''}
        ${event.status === 'finished' && !event.winner ? `
          <button class="btn btn-edit" onclick="announceWinner('${event.id}')">Announce Winner</button>
        ` : ''}
        ${event.status === 'finished' ? `
          <button class="btn btn-edit" onclick="showAwardPrizeModal('${event.id}')">Award Prize</button>
        ` : ''}
        <button class="btn btn-delete" onclick="deleteEvent('${event.id}', '${event.name}')">Delete</button>
      </div>
    </div>
  `).join('');
  
  // Add drop zone functionality to container
  eventsList.addEventListener('drop', drop);
  eventsList.addEventListener('dragover', allowDrop);
}

// Drag and Drop functions
function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
  ev.preventDefault();
  var data = ev.dataTransfer.getData("text");
  var draggedElement = document.getElementById(data);
  var dropTarget = ev.target.closest('.admin-card');
  
  if (dropTarget && draggedElement !== dropTarget) {
      const container = document.getElementById('eventsList');
      const children = Array.from(container.children);
      const draggedIndex = children.indexOf(draggedElement);
      const targetIndex = children.indexOf(dropTarget);
      
      if (draggedIndex < targetIndex) {
          container.insertBefore(draggedElement, dropTarget.nextSibling);
      } else {
          container.insertBefore(draggedElement, dropTarget);
      }
  }
}

async function createEvent(e) {
  e.preventDefault();

  const name = document.getElementById('eventName').value;
  const date = document.getElementById('eventDate').value;
  const time = document.getElementById('eventTime').value;
  const mode = document.getElementById('eventMode').value;
  const eliminationType = document.getElementById('eventElimination').value;
  const description = document.getElementById('eventDescription').value;
  const teamSize = document.getElementById('eventTeamSize').value;
  const entryFee = document.getElementById('eventEntryFee').value;
  const firstPrize = document.getElementById('eventFirstPrize').value;
  const secondPrize = document.getElementById('eventSecondPrize').value;
  const thirdPrize = document.getElementById('eventThirdPrize').value;
  
  // Get image URL based on selection
  const imageSelect = document.getElementById('eventImageSelect').value;
  let iconUrl = EVENT_IMAGES['default'];
  
  if (imageSelect === 'custom') {
    iconUrl = document.getElementById('eventIconUrl').value || EVENT_IMAGES['default'];
  } else if (EVENT_IMAGES[imageSelect]) {
    iconUrl = EVENT_IMAGES[imageSelect];
  }

  try {
    const response = await fetch('/events/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        date, 
        time, 
        mode, 
        eliminationType, 
        description, 
        teamSize: teamSize || null,
        iconUrl: iconUrl,
        entryFee: parseInt(entryFee) || 0,
        firstPrize: parseInt(firstPrize) || 0,
        secondPrize: parseInt(secondPrize) || 0,
        thirdPrize: parseInt(thirdPrize) || 0
      })
    });

    const data = await response.json();

    if (data.ok) {
      alert('Event created successfully!');
      document.getElementById('createEventForm').reset();
      document.getElementById('teamSizeGroup').style.display = 'none';
      document.getElementById('customUrlGroup').style.display = 'none';
      loadEvents();
      loadEventManagement();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error creating event:', error);
    alert('Failed to create event');
  }
}

async function showAwardPrizeModal(eventId) {
  const eventsResponse = await fetch('/events');
  const eventsData = await eventsResponse.json();
  const event = eventsData.events.find(e => e.id === eventId);

  if (!event) {
    alert('Event not found');
    return;
  }

  const participants = event.registrations.map(r => 
    r.username || r.teamName
  ).join('\n');

  const winnerName = prompt(`Select participant to award prize:\n\n${participants}\n\nEnter name:`);
  if (!winnerName) return;

  const amount = prompt('Enter prize amount (credits):');
  if (!amount || isNaN(amount)) return;

  const registration = event.registrations.find(r => 
    r.username === winnerName || r.teamName === winnerName
  );

  if (!registration) {
    alert('Invalid participant name');
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}/award-prize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: registration.userId || registration.teamId,
        amount: parseInt(amount)
      })
    });

    const data = await response.json();

    if (data.ok) {
      alert(`Awarded ${amount} credits to ${winnerName}`);
      loadEvents();
    }
  } catch (error) {
    console.error('Error awarding prize:', error);
    alert('Failed to award prize');
  }
}

async function setEventImage(eventId, currentUrl) {
  const iconUrl = prompt('Enter event image URL:', currentUrl);
  if (iconUrl === null) return;

  try {
    const response = await fetch(`/events/${eventId}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iconUrl })
    });

    const data = await response.json();

    if (data.ok) {
      alert('Event image updated successfully!');
      loadEvents();
    }
  } catch (error) {
    console.error('Error setting event image:', error);
    alert('Failed to set event image');
  }
}

async function setStreamUrl(eventId, currentUrl) {
  const streamUrl = prompt('Enter live stream URL (YouTube, Twitch, etc.):', currentUrl);
  if (streamUrl === null) return;

  try {
    const response = await fetch(`/events/${eventId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'upcoming', streamUrl })
    });

    const data = await response.json();

    if (data.ok) {
      alert('Stream URL set successfully!');
      loadEvents();
    }
  } catch (error) {
    console.error('Error setting stream URL:', error);
    alert('Failed to set stream URL');
  }
}

async function setLobbyUrl(eventId, currentUrl) {
    const lobbyUrl = prompt('Enter lobby URL (e.g., Discord invite, game server link):', currentUrl);
    if (lobbyUrl === null) return;
  
    try {
      const response = await fetch(`/events/${eventId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'upcoming', lobbyUrl })
      });
  
      const data = await response.json();
  
      if (data.ok) {
        alert('Lobby URL set successfully!');
        loadEvents();
      }
    } catch (error) {
      console.error('Error setting lobby URL:', error);
      alert('Failed to set lobby URL');
    }
  }

async function announceWinner(eventId) {
  const eventsResponse = await fetch('/events');
  const eventsData = await eventsResponse.json();
  const event = eventsData.events.find(e => e.id === eventId);

  if (!event) {
    alert('Event not found');
    return;
  }

  const participants = event.registrations.map(r => 
    r.username || r.teamName
  ).join('\n');

  const winnerName = prompt(`Select winner:\n\n${participants}\n\nEnter winner name:`);
  if (!winnerName) return;

  const registration = event.registrations.find(r => 
    r.username === winnerName || r.teamName === winnerName
  );

  if (!registration) {
    alert('Invalid winner name');
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}/winner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        winnerId: registration.userId || registration.teamId,
        winnerName: winnerName
      })
    });

    const data = await response.json();

    if (data.ok) {
      alert(`Winner announced: ${winnerName}`);
      loadEvents();
      loadEventManagement();
      
      // Send notification to all users
      await fetch('/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${event.name} Winner Announced!`,
          message: `Congratulations to ${winnerName} for winning ${event.name}!`
        })
      });
    }
  } catch (error) {
    console.error('Error announcing winner:', error);
    alert('Failed to announce winner');
  }
}

async function updateEventStatus(eventId, status) {
  try {
    const response = await fetch(`/events/${eventId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (data.ok) {
      alert(`Event status updated to ${status}`);
      loadEvents();
      loadEventManagement();
      
      // Send notification
      const eventsResponse = await fetch('/events');
      const eventsData = await eventsResponse.json();
      const event = eventsData.events.find(e => e.id === eventId);
      
      if (event && status === 'live') {
        await fetch('/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${event.name} is now LIVE!`,
            message: `Join now and compete in ${event.name}!`
          })
        });
      }
    }
  } catch (error) {
    console.error('Error updating event status:', error);
  }
}

async function deleteEvent(eventId, eventName) {
  if (!confirm(`Are you sure you want to delete "${eventName}"? This cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.ok) {
      alert('Event deleted successfully');
      loadEvents();
      loadEventManagement();
    }
  } catch (error) {
    console.error('Error deleting event:', error);
  }
}

// SUPPORT TAB
async function loadTickets() {
  try {
    const response = await fetch('/tickets');
    const data = await response.json();

    if (data.ok) {
      displayTickets(data.tickets);
      updateTicketNotificationBadge();
    }
  } catch (error) {
    console.error('Error loading tickets:', error);
  }
}

function displayTickets(tickets) {
  const ticketsList = document.getElementById('ticketsList');
  if (!ticketsList) return;

  if (tickets.length === 0) {
    ticketsList.innerHTML = '<p>No support tickets yet.</p>';
    return;
  }

  ticketsList.innerHTML = tickets.map(ticket => `
    <div class="admin-card">
      <div class="card-header">
        <h3>${ticket.subject}</h3>
        <span style="color: ${ticket.status === 'open' ? 'var(--accent-red)' : 'var(--gray)'};">
          ${ticket.status.toUpperCase()}
        </span>
      </div>
      <div class="card-body">
        <p><strong>From:</strong> ${ticket.username}</p>
        <p><strong>Message:</strong> ${ticket.message}</p>
        <p><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
        ${ticket.closedAt ? `<p><strong>Closed:</strong> ${new Date(ticket.closedAt).toLocaleString()}</p>` : ''}
        
        <div id="chat-area-${ticket.id}" style="display:none; margin-top: 15px; background: var(--black); padding: 10px; border-radius: 6px;">
            <div id="chat-history-${ticket.id}" style="height: 200px; overflow-y: auto; margin-bottom: 10px; border-bottom: 1px solid var(--gray);"></div>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="chat-input-${ticket.id}" placeholder="Type a response..." style="flex: 1; padding: 8px; border-radius: 4px; border: none;">
                <button class="btn btn-edit" onclick="sendTicketResponse('${ticket.id}')">Send</button>
            </div>
        </div>

      </div>
      <div class="card-actions">
        <button class="btn btn-edit" onclick="openTicketChat('${ticket.id}')">Open Chat</button>
        ${ticket.status === 'open' ? `
          <button class="btn btn-finish" onclick="closeTicket('${ticket.id}')">Close</button>
        ` : `
          <button class="btn btn-activate" onclick="reopenTicket('${ticket.id}')">Reopen</button>
        `}
      </div>
    </div>
  `).join('');
}

function openTicketChat(ticketId) {
    // Hide other chat areas
    document.querySelectorAll('[id^="chat-area-"]').forEach(el => el.style.display = 'none');
    
    // Show this chat area
    const chatArea = document.getElementById(`chat-area-${ticketId}`);
    if (chatArea) {
        chatArea.style.display = 'block';
        
        // Join WebSocket room
        joinTicketRoom(ticketId);
        
        // Focus input
        setTimeout(() => document.getElementById(`chat-input-${ticketId}`).focus(), 100);
    }
}

function displayTicketChatHistory(messages) {
    if (!currentTicketChatId) return;
    
    const historyDiv = document.getElementById(`chat-history-${currentTicketChatId}`);
    if (!historyDiv) return;
    
    historyDiv.innerHTML = messages.map(msg => `
        <div style="margin-bottom: 8px; text-align: ${msg.isAdmin ? 'right' : 'left'};">
            <span style="font-weight: bold; color: ${msg.isAdmin ? 'var(--accent-red)' : 'var(--white)'};">${msg.username}:</span>
            <span style="color: var(--gray);">${msg.message}</span>
            <div style="font-size: 0.7rem; color: #666;">${new Date(msg.timestamp).toLocaleTimeString()}</div>
        </div>
    `).join('');
    
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

function displayTicketMessage(message) {
    if (!currentTicketChatId) return;
    
    const historyDiv = document.getElementById(`chat-history-${currentTicketChatId}`);
    if (!historyDiv) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '8px';
    msgDiv.style.textAlign = message.isAdmin ? 'right' : 'left';
    msgDiv.innerHTML = `
        <span style="font-weight: bold; color: ${message.isAdmin ? 'var(--accent-red)' : 'var(--white)'};">${message.username}:</span>
        <span style="color: var(--gray);">${message.message}</span>
        <div style="font-size: 0.7rem; color: #666;">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;
    
    historyDiv.appendChild(msgDiv);
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

function sendTicketResponse(ticketId) {
    const input = document.getElementById(`chat-input-${ticketId}`);
    const message = input.value.trim();
    
    if (message) {
        sendTicketMessage(ticketId, message);
        input.value = '';
    }
}


async function closeTicket(ticketId) {
  if (!confirm('Close this ticket?')) {
    return;
  }

  try {
    const response = await fetch(`/tickets/${ticketId}/close`, {
      method: 'POST'
    });

    const data = await response.json();

    if (data.ok) {
      alert('Ticket closed');
      loadTickets();
    }
  } catch (error) {
    console.error('Error closing ticket:', error);
  }
}

async function reopenTicket(ticketId) {
  if (!confirm('Reopen this ticket?')) {
    return;
  }



  try {
    const response = await fetch(`/tickets/${ticketId}/reopen`, {
      method: 'POST'
    });

    const data = await response.json();

    if (data.ok) {
      alert('Ticket reopened');
      loadTickets();
    }
  } catch (error) {
    console.error('Error reopening ticket:', error);
  }
}

// EVENT MANAGEMENT TAB
async function loadEventManagement() {
  try {
    const response = await fetch('/events');
    const data = await response.json();

    if (data.ok) {
      displayEventManagement(data.events);
    }
  } catch (error) {
    console.error('Error loading event management:', error);
  }
}

function displayEventManagement(events) {
  const eventManagement = document.getElementById('eventManagement');
  if (!eventManagement) return;

  if (events.length === 0) {
    eventManagement.innerHTML = '<p>No events available.</p>';
    return;
  }

  eventManagement.innerHTML = events.map(event => {
    const soloRegistrations = event.registrations.filter(r => r.type === 'solo');
    const teamRegistrations = event.registrations.filter(r => r.type === 'team');

    // Generate Bracket HTML if bracket exists
    let bracketHtml = '';
    if (event.bracket) {
        bracketHtml = `
            <div class="bracket-admin-view" style="margin-top: 20px; overflow-x: auto;">
                <h4 style="color: var(--accent-red); margin-bottom: 10px;">Winner Bracket</h4>
                <div style="display: flex; gap: 20px;">
                    ${event.bracket.map((round, rIndex) => `
                        <div class="round-column" style="min-width: 200px;">
                            <h5 style="text-align: center; margin-bottom: 10px;">Round ${rIndex + 1}</h5>
                            ${round.map(match => `
                                <div class="match-card" style="background: var(--black); padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid var(--gray);">
                                    <div style="font-size: 0.8rem; color: #888; margin-bottom: 5px;">${match.matchId}</div>
                                    
                                    <div class="participant p1" onclick="sendLobbyLink('${event.id}', '${match.participant1?.id}', '${match.participant1?.name}')" style="cursor: pointer; padding: 4px; border-bottom: 1px solid #333; ${match.winner?.id === match.participant1?.id ? 'color: #0f0;' : ''}">
                                        ${match.participant1 ? `🎮 ${match.participant1.name}` : 'TBD'}
                                    </div>
                                    
                                    <div class="participant p2" onclick="sendLobbyLink('${event.id}', '${match.participant2?.id}', '${match.participant2?.name}')" style="cursor: pointer; padding: 4px; ${match.winner?.id === match.participant2?.id ? 'color: #0f0;' : ''}">
                                        ${match.participant2 ? `🎮 ${match.participant2.name}` : 'TBD'}
                                    </div>

                                    <div style="margin-top: 5px; font-size: 0.8rem;">
                                        <button onclick="quickUpdateResult('${event.id}', '${match.matchId}', '${match.participant1?.id}')" style="padding: 2px 5px; font-size: 0.7rem;">Win P1</button>
                                        <button onclick="quickUpdateResult('${event.id}', '${match.matchId}', '${match.participant2?.id}')" style="padding: 2px 5px; font-size: 0.7rem;">Win P2</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
                ${event.loserBracket ? `
                <h4 style="color: var(--accent-red); margin: 20px 0 10px;">Loser Bracket</h4>
                <div style="display: flex; gap: 20px;">
                    ${event.loserBracket.map((round, rIndex) => `
                        <div class="round-column" style="min-width: 200px;">
                            <h5 style="text-align: center; margin-bottom: 10px;">LB Round ${rIndex + 1}</h5>
                            ${round.map(match => `
                                <div class="match-card" style="background: var(--black); padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid var(--gray);">
                                    <div style="font-size: 0.8rem; color: #888; margin-bottom: 5px;">${match.matchId}</div>
                                    
                                    <div class="participant p1" style="padding: 4px; border-bottom: 1px solid #333; ${match.winner?.id === match.participant1?.id ? 'color: #0f0;' : ''}">
                                        ${match.participant1 ? `🎮 ${match.participant1.name}` : 'TBD'}
                                    </div>
                                    
                                    <div class="participant p2" style="padding: 4px; ${match.winner?.id === match.participant2?.id ? 'color: #0f0;' : ''}">
                                        ${match.participant2 ? `🎮 ${match.participant2.name}` : 'TBD'}
                                    </div>

                                    <div style="margin-top: 5px; font-size: 0.8rem;">
                                        <button onclick="quickUpdateResult('${event.id}', '${match.matchId}', '${match.participant1?.id}')" style="padding: 2px 5px; font-size: 0.7rem;">Win P1</button>
                                        <button onclick="quickUpdateResult('${event.id}', '${match.matchId}', '${match.participant2?.id}')" style="padding: 2px 5px; font-size: 0.7rem;">Win P2</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                <p style="font-size: 0.8rem; color: var(--gray); margin-top: 10px;">* Click on a participant to send them a lobby link.</p>
            </div>
        `;
    }

    return `
      <div class="admin-card">
        <div class="card-header">
          <h3>${event.name}</h3>
          <span class="event-status ${event.status}">${event.status.toUpperCase()}</span>
        </div>
        <div class="card-body">
          <p><strong>Date:</strong> ${event.date} at ${event.time}</p>
          <p><strong>Mode:</strong> ${event.mode.toUpperCase()}</p>
          <p><strong>Elimination:</strong> ${event.eliminationType}</p>
          ${event.teamSize ? `<p><strong>Team Size:</strong> ${event.teamSize}v${event.teamSize}</p>` : ''}
          <p><strong>Total Registrations:</strong> ${event.registrations.length}</p>
          
          ${soloRegistrations.length > 0 ? `
            <div style="margin-top: 15px;">
              <strong>Solo Players (${soloRegistrations.length}):</strong>
              <ul style="margin-top: 8px; color: var(--gray);">
                ${soloRegistrations.map(r => `
                    <li>
                        ${r.username} 

                        ${r.checkedIn ? '<span style="color: #0f0; font-weight: bold;">(Checked In)</span>' : '<span style="color: #f00;">(Not Checked In)</span>'}
                    </li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${teamRegistrations.length > 0 ? `
            <div style="margin-top: 15px;">
              <strong>Teams (${teamRegistrations.length}):</strong>
              <ul style="margin-top: 8px; color: var(--gray);">
                ${teamRegistrations.map(r => `
                    <li>
                        ${r.teamName} (${r.memberCount} members)
                        ${r.checkedIn ? '<span style="color: #0f0; font-weight: bold;">(Checked In)</span>' : '<span style="color: #f00;">(Not Checked In)</span>'}
                    </li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${event.disqualified && event.disqualified.length > 0 ? `
            <div style="margin-top: 15px;">
              <strong>Disqualified (${event.disqualified.length}):</strong>
              <ul style="margin-top: 8px; color: var(--accent-red);">
                ${event.disqualified.map(d => `<li>${d.username}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${bracketHtml}

        </div>
        <div class="card-actions">
          ${!event.bracket && event.registrations.length > 0 ? `
            <button class="btn btn-activate" onclick="generateBracket('${event.id}')">Generate Bracket (Auto)</button>
          ` : ''}
          ${event.bracket ? `
            <button class="btn btn-edit" onclick="showBracketModal('${event.id}', '${event.name}')" style="background: var(--accent-red); font-size: 1.1rem; padding: 12px 24px;">🏆 View Brackets</button>
            <button class="btn btn-edit" onclick="scheduleMatches('${event.id}')">Schedule Matches</button>
            <button class="btn btn-edit" onclick="editBracket('${event.id}')">Edit Bracket (Manual)</button>
            <button class="btn btn-edit" onclick="updateMatchResults('${event.id}')">Update Results</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function sendLobbyLink(eventId, participantId, participantName) {
    if (!participantId || participantId === 'undefined') return;
    
    const lobbyLink = prompt(`Send lobby link to ${participantName}:`, '');
    if (!lobbyLink) return;
    
    try {
        await fetch('/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: participantId,
                title: 'Lobby Invite',
                message: `Please join the lobby: ${lobbyLink}`
            })
        });
        alert(`Lobby link sent to ${participantName}`);
    } catch (error) {
        console.error('Error sending lobby link:', error);
        alert('Failed to send link');
    }
}

async function quickUpdateResult(eventId, matchId, winnerId) {
    if (!winnerId || winnerId === 'undefined') return;
    if (!confirm('Confirm winner?')) return;
    
    try {
        const response = await fetch(`/events/${eventId}/matches/${matchId}/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ winnerId })
        });
    
        const data = await response.json();
    
        if (data.ok) {
          loadEventManagement();
        } else {
          alert(data.message);
        }
      } catch (error) {
        console.error('Error updating match result:', error);
        alert('Failed to update match result');
      }
}

async function generateBracket(eventId) {
  if (!confirm('Generate tournament bracket for this event? This will automatically seed all registered participants.')) {
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}/bracket/generate`, {
      method: 'POST'
    });

    const data = await response.json();

    if (data.ok) {
      alert('Bracket generated successfully!');
      loadEventManagement();
    }
  } catch (error) {
    console.error('Error generating bracket:', error);
    alert('Failed to generate bracket');
  }
}

async function scheduleMatches(eventId) {

  const eventsResponse = await fetch('/events');
  const eventsData = await eventsResponse.json();
  const event = eventsData.events.find(e => e.id === eventId);

  if (!event || !event.bracket) {
    alert('Event or bracket not found');
    return;
  }

  const matchId = prompt('Enter match ID to schedule (e.g., R0-M0):');
  if (!matchId) return;

  const scheduledTime = prompt('Enter scheduled time (YYYY-MM-DD HH:MM):');
  if (!scheduledTime) return;

  try {
    const response = await fetch(`/events/${eventId}/matches/${matchId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledTime })
    });

    const data = await response.json();

    if (data.ok) {
      alert('Match scheduled successfully!');
      loadEventManagement();
    }
  } catch (error) {
    console.error('Error scheduling match:', error);
    alert('Failed to schedule match');
  }
}

async function editBracket(eventId) {
    const eventsResponse = await fetch('/events');
    const eventsData = await eventsResponse.json();
    const event = eventsData.events.find(e => e.id === eventId);
  
    if (!event || !event.bracket) {
      alert('Event or bracket not found');
      return;
    }
  
    const matchId = prompt('Enter match ID to edit (e.g., R0-M0):');
    if (!matchId) return;
  
    // Find the match
    let match = null;
    for (const round of event.bracket) {
      match = round.find(m => m.matchId === matchId);
      if (match) break;
    }
  
    if (!match) {
      alert('Match not found');
      return;
    }
    
    // List all available participants
    const participants = event.registrations.map(r => ({
        id: r.userId || r.teamId,
        name: r.username || r.teamName
    }));
    
    const pList = participants.map((p, i) => `${i+1}. ${p.name}`).join('\n');
    
    const p1Index = prompt(`Select Participant 1 (Enter number, or 0 for empty):\n\n${pList}`, '');
    const p2Index = prompt(`Select Participant 2 (Enter number, or 0 for empty):\n\n${pList}`, '');
    
    if (p1Index === null || p2Index === null) return;

    const p1Id = p1Index > 0 ? participants[p1Index-1].id : null;
    const p2Id = p2Index > 0 ? participants[p2Index-1].id : null;

    try {
        const response = await fetch(`/events/${eventId}/matches/${matchId}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                participant1Id: p1Id,
                participant2Id: p2Id
            })
        });
        
        const data = await response.json();
        if (data.ok) {
            alert('Bracket updated successfully!');
            loadEventManagement();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error updating bracket:', error);
        alert('Failed to update bracket');
    }
}

async function updateMatchResults(eventId) {
  const eventsResponse = await fetch('/events');
  const eventsData = await eventsResponse.json();
  const event = eventsData.events.find(e => e.id === eventId);

  if (!event || !event.bracket) {
    alert('Event or bracket not found');
    return;
  }

  const matchId = prompt('Enter match ID to update (e.g., R0-M0):');
  if (!matchId) return;

  // Find the match
  let match = null;
  for (const round of event.bracket) {
    match = round.find(m => m.matchId === matchId);
    if (match) break;
  }

  if (!match) {
    alert('Match not found');
    return;
  }

  const p1Name = match.participant1?.name || 'TBD';
  const p2Name = match.participant2?.name || 'TBD';

  const winner = prompt(`Select winner:\n1. ${p1Name}\n2. ${p2Name}\n\nEnter 1 or 2:`);
  if (!winner) return;

  const winnerId = winner === '1' ? match.participant1?.id : match.participant2?.id;

  if (!winnerId) {
    alert('Invalid selection');
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}/matches/${matchId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerId })
    });

    const data = await response.json();

    if (data.ok) {
      alert('Match result updated!');
      loadEventManagement();
    }
  } catch (error) {
    console.error('Error updating match result:', error);
    alert('Failed to update match result');
  }
}

// TOURNAMENT CHAT TAB
async function loadTournamentChatAdmin() {
  const chatContainer = document.getElementById('tournamentChatAdmin');
  if (!chatContainer) return;

  chatContainer.innerHTML = `
    <div style="background: var(--black-light); padding: 20px; border-radius: 10px;">
      <h3 style="color: var(--accent-red); margin-bottom: 15px;">Admin Tournament Chat</h3>
      <p style="color: var(--gray); margin-bottom: 20px;">Monitor all tournament communications. You can see messages from teams and captains.</p>
      
      <div id="adminChatHistory" style="height: 400px; overflow-y: auto; background: var(--black); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 2px solid var(--black-lighter);"></div>
      
      <div style="display: flex; gap: 10px;">
        <input type="text" id="adminChatInput" placeholder="Send message to all captains..." style="flex: 1; padding: 12px; border: 2px solid var(--black-lighter); border-radius: 6px; background: var(--black); color: var(--white); font-size: 1rem;">
        <button class="btn btn-activate" onclick="sendAdminTournamentMessage()" style="padding: 12px 24px;">Send</button>
      </div>
    </div>
  `;
}

function displayTournamentChatHistory(messages) {
  const historyDiv = document.getElementById('adminChatHistory');
  if (!historyDiv) return;

  historyDiv.innerHTML = messages.map(msg => `
    <div style="margin-bottom: 12px; padding: 10px; background: ${msg.isAdmin ? 'rgba(255, 68, 68, 0.1)' : 'var(--black-lighter)'}; border-radius: 6px; border-left: 3px solid ${msg.isAdmin ? 'var(--accent-red)' : 'var(--gray)'};">
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span style="font-weight: bold; color: ${msg.isAdmin ? 'var(--accent-red)' : 'var(--white)'};">${msg.username} ${msg.isAdmin ? '(Admin)' : msg.isCaptain ? '(Captain)' : ''}</span>
        <span style="font-size: 0.8rem; color: #666;">${new Date(msg.timestamp).toLocaleTimeString()}</span>
      </div>
      <div style="color: var(--gray);">${msg.message}</div>
      ${msg.room ? `<div style="font-size: 0.75rem; color: #888; margin-top: 5px;">Room: ${msg.room}</div>` : ''}
    </div>
  `).join('');

  historyDiv.scrollTop = historyDiv.scrollHeight;
}

function appendTournamentMessage(message) {
  const historyDiv = document.getElementById('adminChatHistory');
  if (!historyDiv) return;

  const msgDiv = document.createElement('div');
  msgDiv.style.cssText = `margin-bottom: 12px; padding: 10px; background: ${message.isAdmin ? 'rgba(255, 68, 68, 0.1)' : 'var(--black-lighter)'}; border-radius: 6px; border-left: 3px solid ${message.isAdmin ? 'var(--accent-red)' : 'var(--gray)'}`;
  
  msgDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
      <span style="font-weight: bold; color: ${message.isAdmin ? 'var(--accent-red)' : 'var(--white)'};">${message.username} ${message.isAdmin ? '(Admin)' : message.isCaptain ? '(Captain)' : ''}</span>
      <span style="font-size: 0.8rem; color: #666;">${new Date(message.timestamp).toLocaleTimeString()}</span>
    </div>
    <div style="color: var(--gray);">${message.message}</div>
    ${message.room ? `<div style="font-size: 0.75rem; color: #888; margin-top: 5px;">Room: ${message.room}</div>` : ''}
  `;

  historyDiv.appendChild(msgDiv);
  historyDiv.scrollTop = historyDiv.scrollHeight;
}

function sendAdminTournamentMessage() {
  const input = document.getElementById('adminChatInput');
  const message = input.value.trim();

  if (message && tournamentChatWs && tournamentChatWs.readyState === WebSocket.OPEN) {
    tournamentChatWs.send(JSON.stringify({
      type: 'message',
      userId: currentUser.id,
      username: currentUser.username,
      message: message,
      isAdmin: true,
      room: 'tournament-admin'
    }));
    input.value = '';
  }
}