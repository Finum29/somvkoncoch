// events.js - Event display and registration
document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
});

async function loadEvents() {
  try {
    const response = await fetch('/events');
    const data = await response.json();

    if (data.ok) {
      displayEvents(data.events);
    }
  } catch (error) {
    console.error('Error loading events:', error);
  }
}

function displayEvents(events) {
  const eventScroll = document.getElementById('eventScroll');
  if (!eventScroll) return;

  if (events.length === 0) {
    eventScroll.innerHTML = '<p style="color: var(--gray); text-align: center; width: 100%;">No events available at the moment.</p>';
    return;
  }

  eventScroll.innerHTML = events.map(event => {
    const statusClass = event.status;
    const iconUrl = event.iconUrl || '../images/Background.png';
    const entryFeeText = event.entryFee > 0 ? `<p><strong>Entry Fee:</strong> ${event.entryFee} credits</p>` : '';

    return `
      <div class="event-card" 
           data-event-id="${event.id}" 
           onclick="openEventModal('${event.id}')">
        <div class="event-img-container">
          <img src="${iconUrl}" alt="${event.name}" onerror="this.src='../images/Background.png'">
        </div>
        <div class="event-info">
          <h3>${event.name}</h3>
          <p><strong>Date:</strong> ${event.date}</p>
          <p><strong>Time:</strong> ${event.time}</p>
          <p><strong>Mode:</strong> ${event.mode.toUpperCase()}</p>
          ${entryFeeText}
          <p><strong>Registrations:</strong> ${event.registrations ? event.registrations.length : 0}</p>
          <span class="event-status ${statusClass}">${event.status.toUpperCase()}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function openEventModal(eventId) {
  try {
    const [eventResponse, sessionResponse] = await Promise.all([
      fetch('/events'),
      fetch('/session')
    ]);

    const eventData = await eventResponse.json();
    const sessionData = await sessionResponse.json();

    const event = eventData.events.find(e => e.id === eventId);
    if (!event) return;

    const modal = document.getElementById('eventModal');
    const modalEventName = document.getElementById('modalEventName');
    const modalEventDetails = document.getElementById('modalEventDetails');
    const modalButtons = document.getElementById('modalButtons');

    const prizeInfo = event.prizePool && (event.prizePool.first > 0 || event.prizePool.second > 0 || event.prizePool.third > 0) 
      ? `<p><strong>Prize Pool:</strong> 1st: ${event.prizePool.first}, 2nd: ${event.prizePool.second}, 3rd: ${event.prizePool.third} credits</p>` 
      : '';

    modalEventName.textContent = event.name;
    modalEventDetails.innerHTML = `
      <p>${event.description || 'No description available'}</p>
      <p><strong>Date:</strong> ${event.date} at ${event.time}</p>
      <p><strong>Mode:</strong> ${event.mode.toUpperCase()}</p>
      <p><strong>Type:</strong> ${event.eliminationType} Elimination</p>
      ${event.entryFee > 0 ? `<p><strong>Entry Fee:</strong> ${event.entryFee} credits</p>` : ''}
      ${prizeInfo}
      <p><strong>Registrations:</strong> ${event.registrations.length}</p>
      ${event.winner ? `<p><strong>Winner:</strong> ${event.winner.name}</p>` : ''}
    `;

    // Clear previous buttons
    modalButtons.innerHTML = '';

    // Check if user is logged in
    if (!sessionData.loggedIn) {
      modalButtons.innerHTML = `
        <button class="btn-cancel" onclick="closeEventModal()">Close</button>
        <p style="color: var(--gray); margin-top: 10px;">Please login to register for events</p>
      `;
      modal.classList.add('active');
      return;
    }
    
    // Find user registration
    const registration = event.registrations.find(r => 
      r.userId === sessionData.user.id || 
      (r.teamId && r.teamId === sessionData.user.teamId)
    );
    const userRegistered = !!registration;
    const userCheckedIn = registration ? registration.checkedIn : false;

    // Check if check-in is open (10 mins before)
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);
    const isCheckInOpen = minutesDiff <= 10 && minutesDiff > -60;
    const isRegistrationOpen = minutesDiff >= -5;

    // Check if event is live (watch option)
    if (event.status === 'live') {
      modalButtons.innerHTML = `
        ${event.streamUrl ? `<button class="btn-watch" onclick="watchEvent('${event.streamUrl}')">Watch Live Stream</button>` : ''}
        ${userRegistered && event.lobbyUrl ? `<button class="btn-join-team" onclick="joinLobby('${event.lobbyUrl}')">Join Lobby</button>` : ''}
        ${event.bracket ? `<button class="btn-join-solo" onclick="showBracketModal('${event.id}', '${event.name}')">View Bracket</button>` : ''}
        <button class="btn-cancel" onclick="closeEventModal()">Close</button>
      `;
      modal.classList.add('active');
      return;
    }

    // Check if event is finished
    if (event.status === 'finished') {
      const winnerInfo = event.winner ? `<p><strong>Winner:</strong> ${event.winner.name}</p>` : '<p>Results will be announced soon</p>';
      modalButtons.innerHTML = `
        ${winnerInfo}
        ${event.bracket ? `<button class="btn-join-solo" onclick="showBracketModal('${event.id}', '${event.name}')">View Bracket</button>` : ''}
        <button class="btn-cancel" onclick="closeEventModal()">Close</button>
      `;
      modal.classList.add('active');
      return;
    }

    // Check if user is already registered
    if (userRegistered) {
      let checkInButton = '';
      if (isCheckInOpen && !userCheckedIn) {
          checkInButton = `<button class="btn-activate" onclick="checkInEvent('${event.id}')">Check In</button>`;
      } else if (userCheckedIn) {
          checkInButton = `<p style="color: #0f0; font-weight: bold;">✓ Checked In</p>`;
      } else {
          checkInButton = `<p style="color: var(--gray);">Check-in opens 10 mins before start</p>`;
      }

      modalButtons.innerHTML = `
        <p style="color: #4444FF; font-weight: bold;">You are registered for this event</p>
        ${checkInButton}
        ${userCheckedIn && event.lobbyUrl ? `<button class="btn-join-team" onclick="joinLobby('${event.lobbyUrl}')">Join Lobby</button>` : ''}
        <button class="btn-cancel" onclick="unregisterFromEvent('${event.id}')">Unregister</button>
        <button class="btn-cancel" onclick="closeEventModal()">Close</button>
      `;
      modal.classList.add('active');
      return;
    }

    // Check if user is disqualified
    const userDisqualified = event.disqualified && event.disqualified.some(d => d.userId === sessionData.user.id);
    if (userDisqualified) {
      modalButtons.innerHTML = `
        <p style="color: var(--accent-red); font-weight: bold;">You have been disqualified from this event</p>
        <button class="btn-cancel" onclick="closeEventModal()">Close</button>
      `;
      modal.classList.add('active');
      return;
    }

    // Registration options based on event mode
    if (isRegistrationOpen) {
        if (event.mode === 'solo') {
        modalButtons.innerHTML = `
            <button class="btn-join-solo" onclick="registerForEvent('${event.id}', 'solo')">Join Solo</button>
            <button class="btn-cancel" onclick="closeEventModal()">Cancel</button>
        `;
        } else if (event.mode === 'team') {
        if (sessionData.user.teamId) {
            modalButtons.innerHTML = `
            <button class="btn-join-team" onclick="registerForEvent('${event.id}', 'team')">Join with Team</button>
            <button class="btn-cancel" onclick="closeEventModal()">Cancel</button>
            `;
        } else {
            modalButtons.innerHTML = `
            <p style="color: var(--gray);">You need to be in a team to register</p>
            <button class="btn-cancel" onclick="closeEventModal()">Close</button>
            `;
        }
        } else { // both
        const teamButton = sessionData.user.teamId 
            ? '<button class="btn-join-team" onclick="registerForEvent(\'' + event.id + '\', \'team\')">Join with Team</button>'
            : '';
        
        modalButtons.innerHTML = `
            <button class="btn-join-solo" onclick="registerForEvent('${event.id}', 'solo')">Join Solo</button>
            ${teamButton}
            <button class="btn-cancel" onclick="closeEventModal()">Cancel</button>
        `;
        }
    } else {
        modalButtons.innerHTML = `
            <p style="color: var(--gray);">Registration closed</p>
            <button class="btn-cancel" onclick="closeEventModal()">Close</button>
        `;
    }

    modal.classList.add('active');
  } catch (error) {
    console.error('Error opening event modal:', error);
  }
}

function closeEventModal() {
  const modal = document.getElementById('eventModal');
  modal.classList.remove('active');
}

async function registerForEvent(eventId, type) {
  try {
    const response = await fetch(`/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });

    const data = await response.json();

    if (data.ok) {
      alert('Successfully registered for the event!');
      closeEventModal();
      loadEvents();
      // Refresh nav to update wallet
      if (window.refreshNav) window.refreshNav();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error registering for event:', error);
    alert('Failed to register for event');
  }
}

async function checkInEvent(eventId) {
    try {
      const response = await fetch(`/events/${eventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
  
      const data = await response.json();
  
      if (data.ok) {
        alert('Checked in successfully!');
        // Refresh modal to show updated status
        closeEventModal();
        openEventModal(eventId);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in');
    }
}

function joinLobby(url) {
    if (url) {
        window.open(url, '_blank');
    } else {
        alert('Lobby URL not set yet.');
    }
}

async function unregisterFromEvent(eventId) {
  if (!confirm('Are you sure you want to unregister from this event?')) {
    return;
  }

  try {
    const response = await fetch(`/events/${eventId}/unregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.ok) {
      alert('Successfully unregistered from the event');
      closeEventModal();
      loadEvents();
      // Refresh nav to update wallet
      if (window.refreshNav) window.refreshNav();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error unregistering from event:', error);
    alert('Failed to unregister from event');
  }
}

function watchEvent(streamUrl) {
  if (!streamUrl) {
    alert('Live stream link will be provided by administrators');
    return;
  }

  // Open stream in new window
  window.open(streamUrl, '_blank', 'width=1280,height=720');
  closeEventModal();
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.getElementById('eventModal');
  if (e.target === modal) {
    closeEventModal();
  }
});