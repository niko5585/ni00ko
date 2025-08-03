// --- State & Storage ---
let tasks = JSON.parse(localStorage.getItem('guitarTasks') || '[]');
let history = JSON.parse(localStorage.getItem('practiceHistory') || '[]');
let currentTask = null, timerInterval = null;

// --- DOM Elements ---
const tabs = document.querySelectorAll('nav button');
const sections = document.querySelectorAll('.tab-content');
const form = document.getElementById('task-form');
const list = document.getElementById('task-list');
const histList = document.getElementById('history-list');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const alarmSound = document.getElementById('alarm-sound');
const chartCtx = document.getElementById('stats-chart').getContext('2d');
const toggleTheme = document.getElementById('toggle-theme');
const clearHistoryBtn = document.getElementById('clear-history');
const registerSwBtn = document.getElementById('register-sw');

let statsChart = null;

// --- Helpers ---
function saveAll() {
  localStorage.setItem('guitarTasks', JSON.stringify(tasks));
  localStorage.setItem('practiceHistory', JSON.stringify(history));
}
function formatTime(sec) {
  const h = String(Math.floor(sec/3600)).padStart(2,'0');
  const m = String(Math.floor((sec%3600)/60)).padStart(2,'0');
  const s = String(sec%60).padStart(2,'0');
  return `${h}:${m}:${s}`;
}
function switchTab(to) {
  tabs.forEach(b=>b.classList.toggle('active', b.dataset.tab===to));
  sections.forEach(s=>s.id===to
    ? s.classList.remove('hidden')
    : s.classList.add('hidden')
  );
}

// --- Rendering ---
function renderTasks() {
  list.innerHTML = '';
  tasks.forEach(t => {
    const li = document.createElement('li');
    li.id = `task-${t.id}`;
    if (t.status==='due') li.classList.add('due');
    li.innerHTML = `
      <span>[${t.category}] ${t.name} @ ${t.time} for ${t.duration}m</span>
      <span>
        <button data-id="${t.id}" class="start-btn" ${t.status!=='pending'?'disabled':''}>▶️</button>
        <button data-id="${t.id}" class="del-btn">🗑️</button>
      </span>`;
    list.appendChild(li);
  });
}
function renderHistory() {
  histList.innerHTML = '';
  history.slice().reverse().forEach(item=>{
    const li = document.createElement('li');
    li.textContent = `${new Date(item.doneAt).toLocaleString()}: [${item.category}] ${item.name} (${item.duration}m)`;
    histList.appendChild(li);
  });
}
function renderStats() {
  // Sum by weekday for last 7 days
  const now = new Date(), data = Array(7).fill(0), labels = [];
  for (let i=6;i>=0;i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(d.toLocaleDateString(undefined, { weekday:'short' }));
    const dayMs = history
      .filter(h=> {
        const dd=new Date(h.doneAt);
        return dd.toDateString()===d.toDateString();
      })
      .reduce((sum,h)=>sum + h.duration, 0);
    data[6-i] = dayMs;
  }
  if (statsChart) statsChart.data.datasets[0].data = data, statsChart.update();
  else statsChart = new Chart(chartCtx, {
    type: 'bar',
    data: { labels, datasets: [{ label:'Minutes', data }] },
    options: { scales: { y:{ beginAtZero:true } } }
  });
}

// --- Scheduling & Timer ---
function checkDue() {
  const now = new Date();
  tasks.forEach(t=>{
    if (t.status==='pending') {
      const [h,m]=t.time.split(':').map(Number);
      if (now.getHours()>h || (now.getHours()===h && now.getMinutes()>=m)) {
        t.status='due';
      }
    }
  });
  saveAll(); renderTasks();
}

function startTimer(task) {
  currentTask = task;
  let rem = task.remaining;
  timerDisplay.textContent = formatTime(rem);
  startBtn.disabled = true; stopBtn.disabled = false;
  timerInterval = setInterval(()=>{
    rem--; timerDisplay.textContent = formatTime(rem);
    if (rem<=0) {
      clearInterval(timerInterval);
      alarmSound.play();
      task.status='done';
      history.push({
        ...task,
        doneAt: Date.now()
      });
      saveAll();
      renderTasks(); renderHistory(); renderStats();
      startBtn.disabled=true; stopBtn.disabled=true;
      alert(`✅ "${task.name}" done!`);
    }
    currentTask.remaining = rem;
  },1000);
}
function stopTimer() {
  clearInterval(timerInterval);
  saveAll(); renderTasks();
  startBtn.disabled=false; stopBtn.disabled=true;
}

// --- Event Listeners ---
// Tab nav
tabs.forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.tab)));
// Add task
form.addEventListener('submit', e=>{
  e.preventDefault();
  const name = form['task-name'].value;
  const cat = form['task-category'].value;
  const time = form['task-time'].value;
  const dur = parseInt(form['task-duration'].value,10);
  const id = Date.now();
  tasks.push({ id, name, category:cat, time, duration:dur, remaining:dur*60, status:'pending' });
  saveAll(); renderTasks();
  form.reset();
});
// Task buttons
list.addEventListener('click', e=>{
  const id = +e.target.dataset.id;
  if (e.target.classList.contains('start-btn')) {
    startTimer(tasks.find(t=>t.id===id));
  }
  if (e.target.classList.contains('del-btn')) {
    tasks = tasks.filter(t=>t.id!==id);
    saveAll(); renderTasks();
  }
});
// Timer controls
startBtn.addEventListener('click', ()=>currentTask && startTimer(currentTask));
stopBtn.addEventListener('click', stopTimer);
// History clear
clearHistoryBtn.addEventListener('click', ()=>{
  if (confirm('Clear all history?')) {
    history = []; saveAll(); renderHistory(); renderStats();
  }
});
// Theme toggle
toggleTheme.addEventListener('change', ()=>{
  document.body.classList.toggle('dark', toggleTheme.checked);
  localStorage.setItem('darkMode', toggleTheme.checked);
});
// Service worker
registerSwBtn.addEventListener('click', ()=>{
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(()=>alert('Offline support enabled!'))
      .catch(err=>alert('SW error: '+err));
  } else alert('No SW support');
});

// --- Init ---
switchTab('practice');
if (localStorage.getItem('darkMode')==='true') {
  toggleTheme.checked = true;
  document.body.classList.add('dark');
}
renderTasks(); renderHistory(); renderStats();
checkDue(); setInterval(checkDue, 60000);
