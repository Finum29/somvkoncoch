// brackets.js - Tournament bracket visualization
function generateBracketHTML(bracket, eventId, currentUserId) {
  if (!bracket || bracket.length === 0) {
    return '<p style="color: var(--gray);">No bracket generated yet</p>';
  }

  let html = '<div class="bracket-container" style="overflow-x: auto; padding: 20px;">';
  html += '<div class="bracket-rounds" style="display: flex; gap: 40px;">';

  bracket.forEach((round, roundIndex) => {
    html += `<div class="bracket-round" style="min-width: 250px;">`;
    html += `<h3 style="text-align: center; margin-bottom: 20px; color: var(--accent-red);">`;
    
    if (roundIndex === bracket.length - 1) {
      html += 'Final';
    } else if (roundIndex === bracket.length - 2) {
      html += 'Semi-Finals';
    } else if (roundIndex === bracket.length - 3) {
      html += 'Quarter-Finals';
    } else {
      html += `Round ${roundIndex + 1}`;
    }
    
    html += '</h3>';

    round.forEach(match => {
      const p1Name = match.participant1?.name || 'TBD';
      const p2Name = match.participant2?.name || 'TBD';
      const winner = match.winner?.name;
      
      const p1Id = match.participant1?.id;
      const p2Id = match.participant2?.id;
      
      // Highlight if current user is in the match
      const isUserInP1 = currentUserId && p1Id === currentUserId;
      const isUserInP2 = currentUserId && p2Id === currentUserId;
      
      const isP1Winner = winner === p1Name;
      const isP2Winner = winner === p2Name;

      html += `
        <div class="bracket-match" style="background: var(--black); border: 2px solid var(--black-lighter); border-radius: 8px; margin-bottom: 20px; padding: 10px;">
          <div class="match-id" style="text-align: center; color: var(--gray); font-size: 0.85rem; margin-bottom: 8px;">
            ${match.matchId}
          </div>
          ${match.scheduledTime ? `
            <div class="match-time" style="text-align: center; color: var(--accent-red); font-size: 0.85rem; margin-bottom: 8px;">
              ${new Date(match.scheduledTime).toLocaleString()}
            </div>
          ` : ''}
          <div class="match-participant ${isP1Winner ? 'winner' : ''}" style="padding: 8px; background: ${isUserInP1 ? 'rgba(255, 0, 0, 0.2)' : (isP1Winner ? 'var(--accent-red)' : 'var(--black-lighter)')}; border: ${isUserInP1 ? '1px solid var(--accent-red)' : 'none'}; border-radius: 4px; margin-bottom: 5px; color: var(--white);">
            ${p1Name}
          </div>
          <div class="match-participant ${isP2Winner ? 'winner' : ''}" style="padding: 8px; background: ${isUserInP2 ? 'rgba(255, 0, 0, 0.2)' : (isP2Winner ? 'var(--accent-red)' : 'var(--black-lighter)')}; border: ${isUserInP2 ? '1px solid var(--accent-red)' : 'none'}; border-radius: 4px; color: var(--white);">
            ${p2Name}
          </div>
        </div>
      `;
    });

    html += '</div>';
  });

  html += '</div></div>';
  return html;
}

function showBracketModal(eventId, eventName) {
  // Fetch session to get current user ID for highlighting
  Promise.all([
      fetch(`/events`),
      fetch(`/session`)
  ])
    .then(async ([eventsRes, sessionRes]) => {
      const eventsData = await eventsRes.json();
      const sessionData = await sessionRes.json();
      
      const currentUserId = sessionData.loggedIn ? sessionData.user.id : null;
      const currentUserTeamId = sessionData.loggedIn ? sessionData.user.teamId : null;
      
      // Use team ID if applicable, otherwise user ID
      const highlightId = currentUserTeamId || currentUserId;

      const event = eventsData.events.find(e => e.id === eventId);
      if (!event) {
        alert('Event not found');
        return;
      }

      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      `;

      const content = document.createElement('div');
      content.style.cssText = `
        background: var(--black-lighter);
        border-radius: 12px;
        max-width: 1200px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        padding: 30px;
        position: relative;
      `;

      content.innerHTML = `
        <button onclick="this.closest('[style*=\\'position: fixed\\']').remove()" style="position: absolute; top: 20px; right: 20px; background: var(--accent-red); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 1rem;">Close</button>
        <h2 style="margin-bottom: 20px; color: var(--white);">${eventName} - Tournament Bracket</h2>
        ${event.bracket ? generateBracketHTML(event.bracket, eventId, highlightId) : '<p style="color: var(--gray);">No bracket generated yet</p>'}
      `;

      modal.appendChild(content);
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    })
    .catch(error => {
      console.error('Error loading bracket:', error);
      alert('Failed to load bracket');
    });
}

// Export for use in other scripts
window.showBracketModal = showBracketModal;
window.generateBracketHTML = generateBracketHTML;