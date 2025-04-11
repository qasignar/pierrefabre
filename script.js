const ticketForm = document.getElementById('ticketForm');
const ticketTableBody = document.getElementById('ticketTableBody');
const exportBtn = document.getElementById('exportBtn');
const eraseBtn = document.getElementById('eraseBtn');  // Reference to the "Erase All Data" button

let tickets = loadTickets();  // Load tickets from localStorage or initialize an empty array

// Function to check if we need to clear the data at 3 AM
function clearDataIfNeeded() {
  const currentTime = new Date();
  const lastSavedTime = localStorage.getItem('lastSavedTime');
  
  if (!lastSavedTime) {
    return;  // If no previous saved time, skip this step
  }

  const savedTime = new Date(lastSavedTime);

  // Get the date and time for 3 AM of the current day
  const threeAM = new Date(currentTime.setHours(3, 0, 0, 0));

  // If it's past 3 AM and the saved data is older than 3 AM, clear data
  if (currentTime > threeAM && savedTime < threeAM) {
    tickets = [];  // Reset tasks
    localStorage.removeItem('tickets');  // Remove tasks from localStorage
    localStorage.removeItem('lastSavedTime');  // Remove last saved time from localStorage
  }

  saveTickets();  // Update the last saved time for today
}

// Call this function immediately to check if the data should be cleared
clearDataIfNeeded();

ticketForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const projectId = document.getElementById('projectId').value;
  const member = document.getElementById('memberName').value;
  const priority = document.getElementById('priority').value;  // Get the priority value

  // Check if projectId already exists and its status is In Progress or Correction
  const existingTicketIndex = tickets.findIndex(ticket => ticket.projectId === projectId && 
    (ticket.status === 'In Progress' || ticket.status === 'Correction'));

  if (existingTicketIndex !== -1) {
    // Project ID exists and status is still In Progress or Correction, prompt the user
    const confirmContinue = confirm(`Project ID ${projectId} is still in progress or under correction. Would you like to continue with this task?`);

    if (confirmContinue) {
      // If yes, start the timer for that project ID
      const ticket = tickets[existingTicketIndex];
      ticket.isPaused = false;
      ticket.startTime = Date.now();
      ticket.status = 'In Progress';
      saveTickets();  // Save the updated ticket data
      renderTable();
    } else {
      // If no, just close the prompt and do nothing
      return;
    }
  } else {
    // Project ID does not exist, add the new ticket
    const newTicket = {
      projectId,
      member,
      priority,  // Add the priority to the ticket object
      date: new Date().toISOString().split('T')[0],
      status: 'In Progress',
      timeSpent: 0,
      isPaused: false,
      isCompleted: false,
      isCorrection: false,
      isCorrectionCompleted: false,
      startTime: Date.now(),
      liveSeconds: 0
    };

    tickets.push(newTicket);
    saveTickets();  // Save the updated tickets to localStorage
    renderTable();
  }

  ticketForm.reset();
});

// Function to clear all tickets data
function eraseAllData() {
  if (confirm("Are you sure you want to erase all data?")) {
    tickets = [];  // Reset tickets array
    localStorage.removeItem('tickets');  // Clear tickets from localStorage
    localStorage.removeItem('lastSavedTime');  // Clear last saved time from localStorage
    renderTable();  // Re-render the table after clearing the data
  }
}

// Function to save tickets to localStorage
function saveTickets() {
  localStorage.setItem('tickets', JSON.stringify(tickets));
  localStorage.setItem('lastSavedTime', new Date().toISOString()); // Store the current timestamp as last saved time
}

// Load tickets from localStorage
function loadTickets() {
  const savedTickets = localStorage.getItem('tickets');
  return savedTickets ? JSON.parse(savedTickets) : [];
}

function pauseResume(index) {
  const ticket = tickets[index];

  if (!ticket.isPaused && ticket.status !== 'Task Finished' && ticket.status !== 'Correction Completed') {
    const elapsed = (Date.now() - ticket.startTime) / 1000;
    ticket.timeSpent += elapsed / 3600;
    ticket.liveSeconds += elapsed;
    ticket.isPaused = true;
    ticket.startTime = null;
  } else {
    ticket.startTime = Date.now();
    ticket.isPaused = false;
  }

  saveTickets();  // Save after modifying
  renderTable();
}

function completeTask(index) {
  const ticket = tickets[index];

  if (!ticket.isPaused && !ticket.isCompleted) {
    const elapsed = (Date.now() - ticket.startTime) / 1000;
    ticket.timeSpent += elapsed / 3600;
    ticket.liveSeconds += elapsed;
  }

  ticket.isCompleted = true;
  ticket.isPaused = true;
  ticket.startTime = null;
  ticket.status = 'Task Finished';

  saveTickets();  // Save after completing
  renderTable();
}

function startCorrection(index) {
  const ticket = tickets[index];

  ticket.isPaused = false;
  ticket.isCorrection = true;
  ticket.startTime = Date.now();
  ticket.status = 'Correction';

  saveTickets();  // Save after starting correction
  renderTable();
}

function completeCorrection(index) {
  const ticket = tickets[index];

  if (!ticket.isCorrection || ticket.isCorrectionCompleted) return;

  const elapsed = (Date.now() - ticket.startTime) / 1000;
  ticket.timeSpent += elapsed / 3600;
  ticket.liveSeconds += elapsed;

  ticket.isCorrectionCompleted = true;
  ticket.isPaused = true;
  ticket.startTime = null;
  ticket.status = 'Correction Completed';

  saveTickets();  // Save after completing correction
  renderTable();
}

function startTask(index) {
  const ticket = tickets[index];

  if (ticket.status === 'Correction Completed') {
    ticket.timeSpent += ticket.liveSeconds / 3600;
    ticket.liveSeconds = 0;
    ticket.startTime = Date.now();
    ticket.status = 'In Progress';
    ticket.isPaused = false;
    ticket.isCorrection = false;
    ticket.isCorrectionCompleted = false;
    ticket.isCompleted = false;
  }

  saveTickets();  // Save after starting the task
  renderTable();
}

function editTicket(index) {
  const ticket = tickets[index];

  const newId = prompt("Edit Project ID:", ticket.projectId);
  const newMember = prompt("Edit Member Name:", ticket.member);
  const newStatus = prompt("Edit Status:", ticket.status);
  const newPriority = prompt("Edit Priority:", ticket.priority);  // Edit priority

  if (newId) ticket.projectId = newId;
  if (newMember) ticket.member = newMember;
  if (newStatus) ticket.status = newStatus;
  if (newPriority) ticket.priority = newPriority;  // Update priority

  saveTickets();  // Save after editing
  renderTable();
}

function renderTable() {
  ticketTableBody.innerHTML = '';

  tickets.forEach((ticket, index) => {
    let liveDuration = ticket.liveSeconds;

    if (!ticket.isPaused && ticket.startTime) {
      liveDuration += (Date.now() - ticket.startTime) / 1000;
    }

    let totalHours = ticket.timeSpent;
    if (!ticket.isPaused && ticket.startTime) {
      totalHours += (Date.now() - ticket.startTime) / (1000 * 60 * 60);
    }

    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${ticket.projectId}</td>
      <td>${ticket.member}</td>
      <td>${ticket.priority}</td> <!-- Display Priority -->
      <td>${ticket.date}</td>
      <td>${ticket.status}</td>
      <td class="time-spent" data-index="${index}">${totalHours.toFixed(2)}</td>
      <td class="live-timer" data-index="${index}">${formatSeconds(liveDuration)}</td>
      <td>
        <button onclick="pauseResume(${index})" ${ticket.status === 'Task Finished' || ticket.status === 'Correction Completed' ? 'disabled' : ''}>
          ${ticket.isPaused ? 'Resume' : 'Pause'}
        </button>
        <button onclick="completeTask(${index})" ${ticket.isCompleted ? 'disabled' : ''}>Complete</button>
        <button onclick="startCorrection(${index})" 
          ${!(ticket.status === 'Task Finished' || ticket.status === 'In Progress') || ticket.isCorrection ? 'disabled' : ''}>
          Start Correction
        </button>
        <button onclick="completeCorrection(${index})" 
          ${ticket.status !== 'Correction' ? 'disabled' : ''}>
          Correction Completed
        </button>
        <button onclick="startTask(${index})" 
          ${ticket.status !== 'Correction Completed' ? 'disabled' : ''}>
          Start Task
        </button>
        <button onclick="editTicket(${index})">Edit</button>
      </td>
    `;

    ticketTableBody.appendChild(row);
  });

  // Update total number of tickets
  document.getElementById('totalTickets').textContent = tickets.length;
}

function formatSeconds(sec) {
  const hrs = Math.floor(sec / 3600);
  const min = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${pad(hrs)}:${pad(min)}:${pad(s)}`;
}

function pad(n) {
  return n < 10 ? '0' + n : n;
}

// Periodically update the live timer and time spent columns
setInterval(() => {
  document.querySelectorAll('.time-spent').forEach(cell => {
    const index = parseInt(cell.dataset.index);
    const ticket = tickets[index];

    let total = ticket.timeSpent;
    if (!ticket.isPaused && ticket.startTime) {
      total += (Date.now() - ticket.startTime) / (1000 * 60 * 60);
    }

    cell.textContent = total.toFixed(2);  // Rounded to 2 decimal places
  });

  document.querySelectorAll('.live-timer').forEach(cell => {
    const index = parseInt(cell.dataset.index);
    const ticket = tickets[index];

    let duration = ticket.liveSeconds;
    if (!ticket.isPaused && ticket.startTime) {
      duration += (Date.now() - ticket.startTime) / 1000;
    }

    cell.textContent = formatSeconds(duration);  // Live time update
  });
}, 1000);

// Export to Excel
exportBtn.addEventListener('click', () => {
  const ws = XLSX.utils.json_to_sheet(tickets);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tickets");
  XLSX.writeFile(wb, "tickets.xlsx");
});

// Handle erase all data button click
eraseBtn.addEventListener('click', eraseAllData);

renderTable();  // Initialize the table when page loads
