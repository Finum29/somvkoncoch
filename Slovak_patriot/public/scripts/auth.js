// auth.js - Authentication and navigation management
document.addEventListener('DOMContentLoaded', async () => {
  await refreshNav();
  initializeCheckInListener();
});

async function refreshNav() {
  try {
    const response = await fetch('/session');
    const data = await response.json();

    const navAuth = document.querySelector('.nav-auth');
    const navAdmin = document.querySelector('.nav-admin');
    const navChat = document.querySelector('.nav-chat');
    const navTickets = document.querySelector('.nav-tickets');
    const navUser = document.querySelector('.nav-user');

    if (data.loggedIn) {
      // Hide login/signup buttons
      const loginBtn = document.querySelector('.nav-login');
      const signupBtn = document.querySelector('.nav-signup');
      if (loginBtn) loginBtn.style.display = 'none';
      if (signupBtn) signupBtn.style.display = 'none';

      // Show user info
      if (navUser) {
        navUser.textContent = data.user.username;
        navUser.style.display = 'inline';
      }

      // Show wallet balance
      let walletDisplay = document.querySelector('.nav-wallet');
      if (!walletDisplay && navAuth) {
        walletDisplay = document.createElement('span');
        walletDisplay.className = 'nav-wallet';
        navAuth.insertBefore(walletDisplay, navUser);
      }
      if (walletDisplay) {
        walletDisplay.innerHTML = `💰 <strong>${data.user.wallet || 0}</strong> credits`;
        walletDisplay.style.display = 'inline';
        walletDisplay.style.marginRight = '15px';
        walletDisplay.style.color = '#FFD700';
        walletDisplay.style.fontWeight = 'bold';
      }

      // Show check-in button placeholder (will be shown when applicable)
      let checkInBtn = document.querySelector('.nav-checkin');
      if (!checkInBtn && navAuth) {
        checkInBtn = document.createElement('button');
        checkInBtn.className = 'nav-checkin';
        checkInBtn.textContent = 'Check In';
        checkInBtn.style.display = 'none';
        checkInBtn.style.background = '#2ecc71';
        checkInBtn.style.color = 'white';
        checkInBtn.style.border = 'none';
        checkInBtn.style.padding = '10px 20px';
        checkInBtn.style.borderRadius = '6px';
        checkInBtn.style.cursor = 'pointer';
        checkInBtn.style.fontWeight = '600';
        checkInBtn.style.marginRight = '10px';
        navAuth.insertBefore(checkInBtn, navUser);
      }

      // Show message notification badge
      let messageBadge = document.querySelector('.nav-message-badge');
      if (!messageBadge && navTickets) {
        messageBadge = document.createElement('span');
        messageBadge.className = 'nav-message-badge';
        messageBadge.style.display = 'none';
        messageBadge.style.position = 'absolute';
        messageBadge.style.top = '-5px';
        messageBadge.style.right = '-5px';
        messageBadge.style.background = '#FF4444';
        messageBadge.style.color = 'white';
        messageBadge.style.borderRadius = '50%';
        messageBadge.style.width = '20px';
        messageBadge.style.height = '20px';
        messageBadge.style.fontSize = '12px';
        messageBadge.style.display = 'flex';
        messageBadge.style.alignItems = 'center';
        messageBadge.style.justifyContent = 'center';
        messageBadge.style.fontWeight = 'bold';
        navTickets.style.position = 'relative';
        navTickets.appendChild(messageBadge);
      }

      // Show admin panel link if admin
      if (navAdmin && data.user.isAdmin) {
        navAdmin.style.display = 'inline-block';
      }

      // Show chat link
      if (navChat) {
        navChat.style.display = 'inline-block';
      }

      // Show tickets link
      if (navTickets) {
        navTickets.style.display = 'inline-block';
      }

      // Show team buttons
      const createTeamBtn = document.querySelector('.nav-create-team');
      const joinTeamBtn = document.querySelector('.nav-join-team');
      const viewTeamBtn = document.querySelector('.nav-view-team');

      if (data.user.teamId) {
        if (createTeamBtn) createTeamBtn.style.display = 'none';
        if (joinTeamBtn) joinTeamBtn.style.display = 'none';
        if (viewTeamBtn) {
          viewTeamBtn.style.display = 'inline-block';
          viewTeamBtn.onclick = () => window.location.href = 'undersites/team-management.html';
        }
      } else {
        if (createTeamBtn) {
          createTeamBtn.style.display = 'inline-block';
          createTeamBtn.onclick = showCreateTeamModal;
        }
        if (joinTeamBtn) {
          joinTeamBtn.style.display = 'inline-block';
          joinTeamBtn.onclick = openJoinTeamModal;
        }
        if (viewTeamBtn) viewTeamBtn.style.display = 'none';
      }

      // Show logout button
      const logoutBtn = document.querySelector('.nav-logout');
      if (logoutBtn) {
        logoutBtn.style.display = 'inline-block';
        logoutBtn.onclick = logout;
      }

      // Check if banned
      if (data.user.status === 'banned') {
        alert('Your account has been banned. You will be logged out.');
        await logout();
      }

      // Check if suspended
      if (data.user.status === 'suspended') {
        const eventCards = document.querySelectorAll('.event-card');
        eventCards.forEach(card => {
          card.style.opacity = '0.5';
          card.style.pointerEvents = 'none';
        });
      }

      // Check for events that need check-in
      await checkForCheckInEvents(data.user);

      // Check for unread messages
      await checkUnreadMessages(data.user);

    } else {
      // Show login/signup buttons
      const loginBtn = document.querySelector('.nav-login');
      const signupBtn = document.querySelector('.nav-signup');
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (signupBtn) signupBtn.style.display = 'inline-block';

      // Hide user elements
      if (navUser) navUser.style.display = 'none';
      if (navAdmin) navAdmin.style.display = 'none';
      if (navChat) navChat.style.display = 'none';
      if (navTickets) navTickets.style.display = 'none';
      
      const walletDisplay = document.querySelector('.nav-wallet');
      const checkInBtn = document.querySelector('.nav-checkin');
      const createTeamBtn = document.querySelector('.nav-create-team');
      const joinTeamBtn = document.querySelector('.nav-join-team');
      const viewTeamBtn = document.querySelector('.nav-view-team');
      const logoutBtn = document.querySelector('.nav-logout');
      
      if (walletDisplay) walletDisplay.style.display = 'none';
      if (checkInBtn) checkInBtn.style.display = 'none';
      if (createTeamBtn) createTeamBtn.style.display = 'none';
      if (joinTeamBtn) joinTeamBtn.style.display = 'none';
      if (viewTeamBtn) viewTeamBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('Error refreshing nav:', error);
  }
}

async function checkForCheckInEvents(user) {
  try {
    const response = await fetch('/events');
    const data = await response.json();
    
    if (data.ok) {
      const now = new Date();
      const checkInBtn = document.querySelector('.nav-checkin');
      
      // Find events user is registered for and check-in is open
      const eligibleEvents = data.events.filter(event => {
        const registration = event.registrations.find(r => 
          r.userId === user.id || (r.teamId && r.teamId === user.teamId)
        );
        
        if (!registration || registration.checkedIn) return false;
        
        const eventDateTime = new Date(`${event.date}T${event.time}`);
        const minutesDiff = (eventDateTime - now) / (1000 * 60);
        
        // Check-in opens 10 mins before
        return minutesDiff <= 10 && minutesDiff > -60;
      });
      
      if (eligibleEvents.length > 0 && checkInBtn) {
        checkInBtn.style.display = 'inline-block';
        checkInBtn.onclick = () => showCheckInModal(eligibleEvents);
      } else if (checkInBtn) {
        checkInBtn.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error checking for check-in events:', error);
  }
}

async function checkUnreadMessages(user) {
  try {
    const response = await fetch('/tickets/my');
    const data = await response.json();
    
    if (data.ok) {
      const unreadCount = data.tickets.filter(t => t.hasUnreadResponse && t.status === 'open').length;
      const messageBadge = document.querySelector('.nav-message-badge');
      
      if (messageBadge) {
        if (unreadCount > 0) {
          messageBadge.textContent = unreadCount;
          messageBadge.style.display = 'flex';
        } else {
          messageBadge.style.display = 'none';
        }
      }
    }
  } catch (error) {
    console.error('Error checking unread messages:', error);
  }
}

function showCheckInModal(events) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.style.display = 'flex';
  
  const eventsList = events.map(e => `
    <div style="padding: 10px; background: var(--black); margin: 10px 0; border-radius: 6px; cursor: pointer; border: 2px solid var(--gray);" 
         onclick="checkInToEvent('${e.id}', '${e.name}')">
      <h4 style="color: var(--accent-red);">${e.name}</h4>
      <p style="color: var(--gray);">${e.date} at ${e.time}</p>
    </div>
  `).join('');
  
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Check In to Event</h3>
      <p>Select an event to check in:</p>
      ${eventsList}
      <button class="btn-cancel" onclick="this.closest('.modal').remove()" style="margin-top: 20px; width: 100%;">Cancel</button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function checkInToEvent(eventId, eventName) {
  try {
    const response = await fetch(`/events/${eventId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.ok) {
      alert(`Successfully checked in to ${eventName}!`);
      document.querySelector('.modal')?.remove();
      await refreshNav();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error checking in:', error);
    alert('Failed to check in');
  }
}

function initializeCheckInListener() {
  // Listen for WebSocket check-in updates
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}`);
  
  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'checkin_update') {
        await refreshNav();
      } else if (data.type === 'new_message' || data.type === 'new_ticket') {
        await refreshNav();
        // Play notification sound
        playNotificationSound();
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  };
}

function playNotificationSound() {
  // Create a simple beep sound
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

async function logout() {
  try {
    await fetch('/logout');
    window.location.href = '/index.html';
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

function showCreateTeamModal() {
  const name = prompt('Enter team name:');
  if (!name) return;


  const description = prompt('Enter team description (optional):') || '';
  const motto = prompt('Enter team motto (optional):') || '';

  createTeam(name, description, motto);
}

async function createTeam(name, description, motto) {
  try {
    const response = await fetch('/teams/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, motto })
    });

    const data = await response.json();

    if (data.ok) {
      alert(`Team "${name}" created successfully!\nInvite Code: ${data.team.inviteCode}\n\nShare this code with your friends to invite them!`);
      await refreshNav();
      window.location.href = 'undersites/team-management.html';
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error creating team:', error);
    alert('Failed to create team');
  }
}

async function viewTeam(teamId) {
  try {
    const response = await fetch(`/teams/${teamId}`);
    const data = await response.json();

    if (data.ok) {
      displayTeam(data.team);
    } else {
      alert('Failed to load team');
    }
  } catch (error) {
    console.error('Error viewing team:', error);
  }
}

function displayTeam(team) {
  const teamDisplay = document.getElementById('teamDisplay');
  if (!teamDisplay) return;

  const membersHTML = team.memberDetails.map(member => `
    <div class="member-card ${member.isCaptain ? 'captain' : ''}">
      <p>${member.username}</p>
      ${member.isCaptain ? '<small>Captain</small>' : ''}
    </div>
  `).join('');

  teamDisplay.innerHTML = `
    <div class="team-container">
      <div class="team-header">
        <h2>${team.name}</h2>
        <p>${team.description}</p>
        ${team.motto ? `<p><em>"${team.motto}"</em></p>` : ''}
      </div>
      <div class="team-members">
        ${membersHTML}
      </div>
      <div class="invite-section">
        <h3>Invite Code</h3>
        <div class="invite-code">${team.inviteCode}</div>
        <p>Share this code with players to join your team</p>
      </div>
    </div>
  `;

  teamDisplay.scrollIntoView({ behavior: 'smooth' });
}

// Make checkInToEvent global
window.checkInToEvent = checkInToEvent;