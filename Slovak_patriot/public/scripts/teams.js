// teams.js - Team management functionality

// Open join team modal
function openJoinTeamModal() {
  const modal = document.getElementById('joinTeamModal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('inviteCode').value = '';
    document.getElementById('joinTeamMessage').innerHTML = '';
  }
}

// Close join team modal
function closeJoinTeamModal() {
  const modal = document.getElementById('joinTeamModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Handle join team form submission
document.addEventListener('DOMContentLoaded', () => {
  const joinTeamForm = document.getElementById('joinTeamForm');
  if (joinTeamForm) {
    joinTeamForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await joinTeamWithCode();
    });
  }

  // Add click handler for join team button
  const joinTeamBtn = document.querySelector('.nav-join-team');
  if (joinTeamBtn) {
    joinTeamBtn.addEventListener('click', openJoinTeamModal);
  }

  // Close modal when clicking outside
  const modal = document.getElementById('joinTeamModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeJoinTeamModal();
      }
    });
  }
});

// Join team with invite code
async function joinTeamWithCode() {
  const inviteCode = document.getElementById('inviteCode').value.trim();
  const messageDiv = document.getElementById('joinTeamMessage');

  if (!inviteCode) {
    messageDiv.innerHTML = '<div class="error-message">Please enter an invite code</div>';
    return;
  }

  try {
    const response = await fetch('/teams/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode })
    });

    const data = await response.json();

    if (data.ok) {
      messageDiv.innerHTML = `<div class="success-message">Successfully joined team: ${data.team.name}!</div>`;
      setTimeout(() => {
        closeJoinTeamModal();
        window.location.reload();
      }, 1500);
    } else {
      messageDiv.innerHTML = `<div class="error-message">${data.message}</div>`;
    }
  } catch (error) {
    console.error('Error joining team:', error);
    messageDiv.innerHTML = '<div class="error-message">Failed to join team. Please try again.</div>';
  }
}

// Leave team
async function leaveTeam() {
  if (!confirm('Are you sure you want to leave your team?')) {
    return;
  }

  try {
    const response = await fetch('/teams/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.ok) {
      alert('You have left the team');
      window.location.reload();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error leaving team:', error);
    alert('Failed to leave team');
  }
}

// Kick member (captain only)
async function kickMember(teamId, memberId, memberName) {
  if (!confirm(`Are you sure you want to kick ${memberName} from the team?`)) {
    return;
  }

  try {
    const response = await fetch(`/teams/${teamId}/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId })
    });

    const data = await response.json();

    if (data.ok) {
      alert(`${memberName} has been kicked from the team`);
      window.location.reload();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error kicking member:', error);
    alert('Failed to kick member');
  }
}