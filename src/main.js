import './style.css'

const STORAGE_KEY = 'stutrak-data-v1'
const subjectColors = ['#6d7dff', '#ee9564', '#48a889', '#be87d5', '#d1a345']
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  sparkle: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/>',
}

const icon = (name, className = '') => `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const localDate = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const shiftDate = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return localDate(date)
}

function initialData() {
  return {
    subjects: [
      { id: makeId(), name: 'Biology', color: subjectColors[0], goal: 5 },
      { id: makeId(), name: 'Mathematics', color: subjectColors[1], goal: 4 },
      { id: makeId(), name: 'History', color: subjectColors[2], goal: 3 },
    ],
    tasks: [],
    sessions: [],
  }
}

let data
let currentPage = 'dashboard'
let taskFilter = 'all'
let toastTimer

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) {
      const freshData = initialData()
      freshData.tasks = [
        { id: makeId(), title: 'Review cell structure notes', subjectId: freshData.subjects[0].id, dueDate: shiftDate(0), completed: false },
        { id: makeId(), title: 'Practice integration problems', subjectId: freshData.subjects[1].id, dueDate: shiftDate(1), completed: false },
        { id: makeId(), title: 'Read chapter 6', subjectId: freshData.subjects[2].id, dueDate: shiftDate(2), completed: false },
      ]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshData))
      return freshData
    }

    const parsed = JSON.parse(stored)
    if (
      !parsed || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.tasks) ||
      !Array.isArray(parsed.sessions) ||
      !parsed.subjects.every((item) => typeof item.id === 'string' && typeof item.name === 'string' && typeof item.color === 'string' && Number.isFinite(item.goal)) ||
      !parsed.tasks.every((item) => typeof item.id === 'string' && typeof item.title === 'string' && typeof item.subjectId === 'string' && typeof item.dueDate === 'string' && typeof item.completed === 'boolean' && (item.completedAt === undefined || item.completedAt === null || typeof item.completedAt === 'string')) ||
      !parsed.sessions.every((item) => typeof item.id === 'string' && typeof item.subjectId === 'string' && Number.isFinite(item.minutes) && typeof item.date === 'string')
    ) throw new Error('Saved study data has an unsupported format.')

    return parsed
  } catch (error) {
    if (error instanceof SyntaxError) {
      showToast('Saved data could not be read. Your browser may have cleared or changed it.')
    } else if (error instanceof Error && error.name === 'QuotaExceededError') {
      showToast('There is not enough browser storage to save your tracker.')
    } else if (error instanceof Error && error.message !== 'Saved study data has an unsupported format.') {
      showToast('Could not access browser storage. Check your browser privacy settings.')
    } else {
      showToast('Saved data has an unsupported format. Start fresh by clearing the StuTrak browser data.')
    }
    return initialData()
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Could not save StuTrak data:', error)
    showToast(error instanceof Error && error.name === 'QuotaExceededError'
      ? 'There is not enough browser storage to save your changes.'
      : 'Your changes could not be saved. Check your browser storage settings.')
    return false
  }
}

function showToast(message) {
  const toast = document.querySelector('#toast')
  if (!toast) return
  toast.textContent = message
  toast.hidden = false
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.hidden = true }, 4000)
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function getSubject(id) {
  return data.subjects.find((subject) => subject.id === id)
}

function getWeekStart(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

function sessionsThisWeek() {
  const start = getWeekStart()
  return data.sessions.filter((session) => new Date(`${session.date}T00:00:00`) >= start)
}

function formatHours(minutes) {
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1)
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`)
  if (dateString === localDate()) return 'Today'
  if (dateString === shiftDate(1)) return 'Tomorrow'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

function renderSidebar() {
  const links = [
    ['dashboard', 'grid', 'Overview'],
    ['subjects', 'book', 'My subjects'],
    ['tasks', 'check', 'Tasks'],
    ['progress', 'chart', 'Progress'],
  ]
  document.querySelector('#sidebar-nav').innerHTML = links.map(([page, symbol, label]) => `
    <button class="nav-link ${currentPage === page ? 'is-active' : ''}" data-page="${page}">
      ${icon(symbol)}<span>${label}</span>${page === 'tasks' && data.tasks.filter((task) => !task.completed).length ? `<span class="nav-count">${data.tasks.filter((task) => !task.completed).length}</span>` : ''}
    </button>
  `).join('')
}

function renderApp() {
  document.querySelector('#current-date').textContent = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date())
  renderSidebar()
  const page = document.querySelector('#page-content')
  const pages = {
    dashboard: renderDashboard,
    subjects: renderSubjects,
    tasks: renderTasks,
    progress: renderProgress,
  }
  page.innerHTML = pages[currentPage]()
  document.querySelector('#page-title').textContent = {
    dashboard: 'Overview',
    subjects: 'My subjects',
    tasks: 'My tasks',
    progress: 'Your progress',
  }[currentPage]
}

function renderDashboard() {
  const weeklyMinutes = sessionsThisWeek().reduce((total, session) => total + session.minutes, 0)
  const completedToday = data.tasks.filter((task) => task.completed && task.completedAt === localDate()).length
  const upcoming = data.tasks.filter((task) => !task.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4)
  const weekDays = getWeekDays()

  return `
    <section class="welcome-row">
      <div><p class="eyebrow">${new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p><h2>${greeting()}, ready to make progress?</h2><p class="muted">A little focused time goes a long way. Let's make today count.</p></div>
      <button class="button button-primary" data-action="open-session">${icon('plus')} Log study time</button>
    </section>
    <section class="stats-grid" aria-label="Study summary">
      ${statCard('clock', 'Study time this week', `${formatHours(weeklyMinutes)}<small> hrs</small>`, `${formatHours(weeklyMinutes / 60 * 60)} hours logged`)}
      ${statCard('check', 'Tasks completed today', `${completedToday}<small> tasks</small>`, `${data.tasks.filter((task) => !task.completed).length} still on your list`)}
      ${statCard('book', 'Subjects in progress', `${data.subjects.length}<small> subjects</small>`, 'Keep your learning balanced')}
    </section>
    <section class="dashboard-grid">
      <article class="panel week-panel">
        <div class="panel-heading"><div><p class="eyebrow">Your activity</p><h3>This week</h3></div><span class="soft-badge">${formatHours(weeklyMinutes)} hrs total</span></div>
        ${renderWeekChart(weekDays)}
      </article>
      <article class="panel focus-panel">
        <div class="panel-heading"><div><p class="eyebrow">Weekly goal</p><h3>Keep your rhythm</h3></div>${icon('sparkle', 'panel-sparkle')}</div>
        ${renderGoalRing(weeklyMinutes)}
      </article>
      <article class="panel subjects-panel">
        <div class="panel-heading"><div><p class="eyebrow">Your learning</p><h3>Subject progress</h3></div><button class="text-button" data-page="subjects">See all ${icon('arrow')}</button></div>
        <div class="subject-list">${data.subjects.slice(0, 4).map(renderSubjectRow).join('') || emptyState('No subjects yet', 'Add a subject to start organizing your study time.')}</div>
      </article>
      <article class="panel tasks-panel">
        <div class="panel-heading"><div><p class="eyebrow">Stay on track</p><h3>Upcoming tasks</h3></div><button class="text-button" data-page="tasks">View all ${icon('arrow')}</button></div>
        <div class="task-list">${upcoming.map(renderTaskRow).join('') || emptyState('All caught up!', 'Add a task whenever something needs your attention.')}</div>
        <button class="add-inline" data-action="open-task">${icon('plus')} Add a task</button>
      </article>
    </section>
  `
}

function statCard(symbol, label, value, detail) {
  return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon(symbol)}</span></div><p class="stat-value">${value}</p><p class="stat-detail">${detail}</p></article>`
}

function getWeekDays() {
  const monday = getWeekStart()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const key = localDate(date)
    const minutes = data.sessions.filter((session) => session.date === key).reduce((total, session) => total + session.minutes, 0)
    return { key, label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date), minutes, isToday: key === localDate() }
  })
}

function renderWeekChart(days) {
  const max = Math.max(...days.map((day) => day.minutes), 60)
  return `<div class="chart" role="img" aria-label="Study time by day this week">${days.map((day) => `
    <div class="chart-column"><span class="chart-value">${day.minutes ? `${formatHours(day.minutes)}h` : ''}</span><div class="chart-track"><div class="chart-bar ${day.isToday ? 'is-today' : ''}" style="height:${day.minutes ? Math.max(8, day.minutes / max * 100) : 0}%"></div></div><span class="chart-day ${day.isToday ? 'is-today' : ''}">${day.label}</span></div>
  `).join('')}</div>`
}

function renderGoalRing(weeklyMinutes) {
  const goalMinutes = 10 * 60
  const percent = Math.min(100, Math.round(weeklyMinutes / goalMinutes * 100))
  return `<div class="goal-content"><div class="goal-ring" style="--progress:${percent * 3.6}deg"><div><strong>${percent}%</strong><span>of weekly goal</span></div></div><div class="goal-copy"><p><strong>${formatHours(weeklyMinutes)} <span>/ 10 hrs</span></strong></p><p class="muted">${percent >= 100 ? 'Amazing work — you hit your goal!' : `${formatHours(goalMinutes - weeklyMinutes)} more hours to reach your weekly goal.`}</p></div></div>`
}

function renderSubjectRow(subject) {
  const minutes = sessionsThisWeek().filter((session) => session.subjectId === subject.id).reduce((total, session) => total + session.minutes, 0)
  const percent = Math.min(100, Math.round(minutes / (subject.goal * 60) * 100))
  return `<div class="subject-row"><span class="subject-dot" style="--subject-color:${escapeHtml(subject.color)}"></span><div class="subject-info"><div class="subject-info-top"><strong>${escapeHtml(subject.name)}</strong><span>${formatHours(minutes)} / ${subject.goal}h</span></div><div class="progress-track"><span style="width:${percent}%;--subject-color:${escapeHtml(subject.color)}"></span></div></div></div>`
}

function renderTaskRow(task) {
  const subject = getSubject(task.subjectId)
  return `<div class="task-row ${task.completed ? 'is-complete' : ''}"><button class="task-check ${task.completed ? 'is-checked' : ''}" data-action="toggle-task" data-id="${escapeHtml(task.id)}" aria-label="${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${escapeHtml(task.title)}">${task.completed ? icon('check') : ''}</button><div class="task-copy"><strong>${escapeHtml(task.title)}</strong><span>${subject ? escapeHtml(subject.name) : 'General'}<span class="task-divider">·</span>${escapeHtml(formatDate(task.dueDate))}</span></div><button class="icon-button task-delete" data-action="delete-task" data-id="${escapeHtml(task.id)}" aria-label="Delete task">${icon('close')}</button></div>`
}

function renderSubjects() {
  return `<section class="page-intro"><div><p class="muted">Keep your classes and study goals organized in one place.</p></div><button class="button button-primary" data-action="open-subject">${icon('plus')} Add subject</button></section>
    <section class="subject-cards">${data.subjects.map((subject) => {
      const minutes = sessionsThisWeek().filter((session) => session.subjectId === subject.id).reduce((total, session) => total + session.minutes, 0)
      const openTasks = data.tasks.filter((task) => task.subjectId === subject.id && !task.completed).length
      const percent = Math.min(100, Math.round(minutes / (subject.goal * 60) * 100))
      return `<article class="panel subject-card"><div class="subject-card-top"><span class="subject-dot large" style="--subject-color:${escapeHtml(subject.color)}"></span><button class="icon-button" data-action="delete-subject" data-id="${escapeHtml(subject.id)}" aria-label="Delete ${escapeHtml(subject.name)}">${icon('close')}</button></div><h3>${escapeHtml(subject.name)}</h3><p class="muted">${openTasks} open ${openTasks === 1 ? 'task' : 'tasks'}</p><div class="subject-card-progress"><div class="subject-info-top"><span>This week</span><strong>${formatHours(minutes)} / ${subject.goal} hrs</strong></div><div class="progress-track"><span style="width:${percent}%;--subject-color:${escapeHtml(subject.color)}"></span></div></div><button class="button button-secondary full-width" data-action="open-session" data-subject="${escapeHtml(subject.id)}">${icon('plus')} Log study time</button></article>`
    }).join('') || emptyState('No subjects yet', 'Add your first subject to get started.')}</section>`
}

function renderTasks() {
  const filters = [['all', 'All'], ['open', 'To do'], ['completed', 'Completed']]
  const tasks = data.tasks.filter((task) => taskFilter === 'all' || (taskFilter === 'open' && !task.completed) || (taskFilter === 'completed' && task.completed)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return `<section class="page-intro"><p class="muted">Small steps add up. Keep your next priorities close.</p><button class="button button-primary" data-action="open-task">${icon('plus')} Add task</button></section><div class="task-toolbar"><div class="filter-tabs">${filters.map(([filter, label]) => `<button class="filter-tab ${taskFilter === filter ? 'is-active' : ''}" data-filter="${filter}">${label}${filter === 'all' ? `<span>${data.tasks.length}</span>` : ''}</button>`).join('')}</div></div><section class="panel full-task-list">${tasks.map(renderTaskRow).join('') || emptyState(taskFilter === 'completed' ? 'No completed tasks yet' : 'Nothing on your list', 'Add a task to keep track of what you want to study.')}</section>`
}

function renderProgress() {
  const weeksDays = getWeekDays()
  const weeklyMinutes = weeksDays.reduce((total, day) => total + day.minutes, 0)
  const completed = data.tasks.filter((task) => task.completed).length
  const sessions = sessionsThisWeek()
  return `<section class="page-intro"><p class="muted">Every focused session is a step forward. Here's how your week is going.</p><button class="button button-primary" data-action="open-session">${icon('plus')} Log study time</button></section><section class="stats-grid progress-stats">${statCard('clock', 'Hours this week', `${formatHours(weeklyMinutes)}<small> hrs</small>`, 'Your study time, all subjects')}${statCard('calendar', 'Sessions this week', `${sessions.length}<small> sessions</small>`, `${sessions.filter((session) => session.date === localDate()).length} logged today`)}${statCard('check', 'Tasks completed', `${completed}<small> tasks</small>`, 'You are building great habits')}</section><section class="progress-grid"><article class="panel week-panel"><div class="panel-heading"><div><p class="eyebrow">Your activity</p><h3>Daily study time</h3></div><span class="soft-badge">${formatHours(weeklyMinutes)} hrs</span></div>${renderWeekChart(weeksDays)}</article><article class="panel"><div class="panel-heading"><div><p class="eyebrow">A closer look</p><h3>Time by subject</h3></div></div><div class="subject-list">${data.subjects.map(renderSubjectRow).join('') || emptyState('No subjects yet', 'Add a subject to start tracking your progress.')}</div></article></section>`
}

function emptyState(title, message) {
  return `<div class="empty-state">${icon('sparkle')}<strong>${title}</strong><p>${message}</p></div>`
}

function renderModal(type, selectedSubjectId = '') {
  const overlay = document.querySelector('#modal-root')
  const subjectOptions = data.subjects.map((subject) => `<option value="${escapeHtml(subject.id)}" ${subject.id === selectedSubjectId ? 'selected' : ''}>${escapeHtml(subject.name)}</option>`).join('')
  let content = ''

  if (type === 'session') {
    content = `<p class="eyebrow">A little progress adds up</p><h2 id="modal-title">Log study time</h2><p class="modal-description">Capture a focused session and see your progress grow.</p><form id="session-form" class="modal-form"><label>Subject<select name="subjectId" ${data.subjects.length ? 'required' : 'disabled'}>${subjectOptions || '<option value="">Add a subject first</option>'}</select></label><div class="form-row"><label>Duration<input name="minutes" type="number" min="1" max="1440" placeholder="e.g. 45" required></label><label>Date<input name="date" type="date" value="${localDate()}" required></label></div><label>Notes <span class="optional-label">Optional</span><input name="note" type="text" maxlength="120" placeholder="What did you work on?"></label><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary" ${data.subjects.length ? '' : 'disabled'}>Save session</button></div></form>`
  } else if (type === 'task') {
    content = `<p class="eyebrow">One thing at a time</p><h2 id="modal-title">Add a task</h2><p class="modal-description">Give yourself a clear next step.</p><form id="task-form" class="modal-form"><label>Task name<input name="title" type="text" maxlength="100" placeholder="What do you need to study?" required autofocus></label><label>Subject<select name="subjectId"><option value="">General</option>${subjectOptions}</select></label><label>Due date<input name="dueDate" type="date" value="${shiftDate(1)}" required></label><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary">Add task</button></div></form>`
  } else {
    content = `<p class="eyebrow">Make it your own</p><h2 id="modal-title">Add a subject</h2><p class="modal-description">Organize your study sessions by class.</p><form id="subject-form" class="modal-form"><label>Subject name<input name="name" type="text" maxlength="40" placeholder="e.g. Chemistry" required autofocus></label><label>Weekly goal <span class="optional-label">hours</span><input name="goal" type="number" min="1" max="80" value="3" required></label><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary">Add subject</button></div></form>`
  }

  overlay.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${content}<button class="modal-close icon-button" data-action="close-modal" aria-label="Close">${icon('close')}</button></section></div>`
  const firstInput = overlay.querySelector('input:not([disabled]), select:not([disabled])')
  firstInput?.focus()
}

function closeModal() {
  document.querySelector('#modal-root').innerHTML = ''
}

function commitChange() {
  if (saveData()) renderApp()
}

data = loadData()
renderApp()

document.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  const pageButton = target.closest('[data-page]')
  if (pageButton) {
    currentPage = pageButton.dataset.page
    renderApp()
    return
  }

  const filterButton = target.closest('[data-filter]')
  if (filterButton) {
    taskFilter = filterButton.dataset.filter
    renderApp()
    return
  }

  const button = target.closest('[data-action]')
  if (!button) return
  const { action, id } = button.dataset

  if (action === 'open-session') renderModal('session', button.dataset.subject || '')
  if (action === 'open-task') renderModal('task')
  if (action === 'open-subject') renderModal('subject')
  if (action === 'close-modal' && (target === button || button.classList.contains('modal-backdrop'))) closeModal()
  if (action === 'toggle-task') {
    const task = data.tasks.find((item) => item.id === id)
    if (task) {
      task.completed = !task.completed
      task.completedAt = task.completed ? localDate() : null
      commitChange()
    }
  }
  if (action === 'delete-task') {
    data.tasks = data.tasks.filter((task) => task.id !== id)
    commitChange()
  }
  if (action === 'delete-subject') {
    const subject = getSubject(id)
    if (subject && window.confirm(`Delete ${subject.name} and its study sessions? Tasks will be kept as general tasks.`)) {
      data.subjects = data.subjects.filter((item) => item.id !== id)
      data.sessions = data.sessions.filter((session) => session.subjectId !== id)
      data.tasks = data.tasks.map((task) => task.subjectId === id ? { ...task, subjectId: '' } : task)
      commitChange()
    }
  }
})

document.addEventListener('submit', (event) => {
  const form = event.target
  if (!(form instanceof HTMLFormElement)) return
  event.preventDefault()
  const values = new FormData(form)

  if (form.id === 'session-form') {
    const minutes = Number(values.get('minutes'))
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || !getSubject(String(values.get('subjectId')))) {
      showToast('Choose a subject and enter a session duration from 1 to 1,440 minutes.')
      return
    }
    data.sessions.push({
      id: makeId(),
      subjectId: String(values.get('subjectId')),
      minutes,
      date: String(values.get('date')),
      note: String(values.get('note') || '').trim(),
    })
  } else if (form.id === 'task-form') {
    const title = String(values.get('title') || '').trim()
    if (!title) {
      showToast('Enter a task name before saving.')
      return
    }
    data.tasks.push({
      id: makeId(),
      title,
      subjectId: String(values.get('subjectId') || ''),
      dueDate: String(values.get('dueDate')),
      completed: false,
      completedAt: null,
    })
  } else if (form.id === 'subject-form') {
    const name = String(values.get('name') || '').trim()
    const goal = Number(values.get('goal'))
    if (!name || !Number.isInteger(goal) || goal < 1 || goal > 80) {
      showToast('Enter a subject name and a weekly goal from 1 to 80 hours.')
      return
    }
    if (data.subjects.some((subject) => subject.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      showToast('That subject is already on your list.')
      return
    }
    data.subjects.push({
      id: makeId(),
      name,
      color: subjectColors[data.subjects.length % subjectColors.length],
      goal,
    })
  }

  if (saveData()) {
    closeModal()
    renderApp()
    showToast('Saved — nice work!')
  }
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal()
})

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    data = loadData()
    renderApp()
    showToast('Tracker updated in another tab.')
  }
})
