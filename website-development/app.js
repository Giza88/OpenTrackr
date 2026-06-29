// OpenTrackr Application
class TaskTracker {
    constructor() {
        this.tasks = [];
        this.categories = ['To Do', 'In Progress', 'Done'];
        this.viewMode = 'calendar'; // 'kanban', 'list', or 'calendar'
        this.calendarInstance = null;
        this.theme = 'light';
        this.notificationsEnabled = false;
        this.currentEditingTask = null;
        this.notificationTimers = new Map();
        this.categoryColors = {}; // mapping categoryName -> hex color
        this.palette = ['#6c5ce7','#00b894','#0984e3','#ff7675','#fdcb6e','#e17055','#00a8ff','#7b2cbf','#ff9f1c'];
        this.lastDeleted = null;
        this.undoTimeoutId = null;
        this.previousActiveElement = null;

        // debounced save to avoid excessive localStorage writes
        this.debouncedSave = this.debounce(() => {
            localStorage.setItem('taskTracker_tasks', JSON.stringify(this.tasks));
            localStorage.setItem('taskTracker_categories', JSON.stringify(this.categories));
            localStorage.setItem('taskTracker_viewMode', this.viewMode);
            localStorage.setItem('taskTracker_theme', this.theme);
            localStorage.setItem('taskTracker_notifications', JSON.stringify(this.notificationsEnabled));
            localStorage.setItem('taskTracker_categoryColors', JSON.stringify(this.categoryColors));
        }, 300);

        this.init();
    }
    init() {
        this.loadFromStorage();
        this.requestNotificationPermission();
        this.setupEventListeners();
        this.render();
        this.setupNotificationCheck();
    }

    // LocalStorage Management
    saveToStorage() {
        // use debounced save to reduce write frequency
        if (this.debouncedSave) this.debouncedSave();
    }
    loadFromStorage() {
        const savedTasks = localStorage.getItem('taskTracker_tasks');
        const savedCategories = localStorage.getItem('taskTracker_categories');
        const savedViewMode = localStorage.getItem('taskTracker_viewMode');
        const savedTheme = localStorage.getItem('taskTracker_theme');
        const savedNotifications = localStorage.getItem('taskTracker_notifications');
        const savedCategoryColors = localStorage.getItem('taskTracker_categoryColors');

        if (savedTasks) this.tasks = JSON.parse(savedTasks);
        if (savedCategories) this.categories = JSON.parse(savedCategories);
        if (savedViewMode && ['kanban', 'list', 'calendar'].includes(savedViewMode)) {
            this.viewMode = savedViewMode;
        } else {
            this.viewMode = 'calendar';
        }

        if (window.location.hash === '#calendar') {
            this.viewMode = 'calendar';
        }
        if (savedTheme) this.theme = savedTheme;
        if (savedNotifications) this.notificationsEnabled = JSON.parse(savedNotifications);
        if (savedCategoryColors) this.categoryColors = JSON.parse(savedCategoryColors);

        // Restore notification timers
        this.restoreNotifications();
    }

    // Utility: debounce
    debounce(fn, ms = 300) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    }

    // Task Management
    mapStatusToCategory(status) {
        if (status === 'In progress') return 'In Progress';
        if (status === 'Done') return 'Done';
        return 'To Do';
    }

    mapCategoryToStatus(category) {
        if (category === 'In Progress') return 'In progress';
        if (category === 'Done') return 'Done';
        return 'Not started';
    }

    buildPlannerDescription(row) {
        const parts = [];
        if (row.priority) parts.push('Priority: ' + row.priority);
        if (row.notes) parts.push(row.notes);
        return parts.join('\n');
    }

    addTask(taskData) {
        const category = taskData.category || this.categories[0];
        const task = {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            title: taskData.title,
            description: taskData.description || '',
            category: category,
            dueDate: taskData.dueDate || null,
            completed: category === 'Done' || Boolean(taskData.completed),
            notification: taskData.notification || false,
            createdAt: new Date().toISOString(),
            plannerRowId: taskData.plannerRowId || null,
            quickTodoId: taskData.quickTodoId || null,
            priority: taskData.priority || ''
        };

        this.tasks.push(task);
        this.saveToStorage();

        if (task.notification && task.dueDate) {
            this.scheduleNotification(task);
        }

        return task;
    }

    upsertFromPlannerRow(row) {
        if (!row || !String(row.task || '').trim()) return null;

        const payload = {
            title: row.task.trim(),
            description: this.buildPlannerDescription(row),
            category: this.mapStatusToCategory(row.status),
            dueDate: row.due ? row.due + 'T09:00' : null,
            notification: false,
            plannerRowId: row.id,
            priority: row.priority || '',
            completed: row.status === 'Done'
        };

        const existing = row.boardTaskId
            ? this.tasks.find(function (t) { return t.id === row.boardTaskId; })
            : this.tasks.find(function (t) { return t.plannerRowId === row.id; });

        if (existing) {
            this.updateTask(existing.id, payload);
            return existing;
        }

        const task = this.addTask(payload);
        if (window.openTrackrPlannerSync && typeof window.openTrackrPlannerSync.onPlannerLinked === 'function') {
            window.openTrackrPlannerSync.onPlannerLinked(row.id, task.id);
        }
        return task;
    }

    upsertFromQuickTodo(todo) {
        if (!todo || !String(todo.text || '').trim()) return null;

        const category = todo.done ? 'Done' : 'To Do';
        const payload = {
            title: todo.text.trim(),
            description: '',
            category: category,
            dueDate: null,
            notification: false,
            quickTodoId: todo.id,
            completed: todo.done
        };

        const existing = todo.boardTaskId
            ? this.tasks.find(function (t) { return t.id === todo.boardTaskId; })
            : this.tasks.find(function (t) { return t.quickTodoId === todo.id; });

        if (existing) {
            this.updateTask(existing.id, payload);
            return existing;
        }

        const task = this.addTask(payload);
        if (window.openTrackrPlannerSync && typeof window.openTrackrPlannerSync.onTodoLinked === 'function') {
            window.openTrackrPlannerSync.onTodoLinked(todo.id, task.id);
        }
        return task;
    }
    updateTask(taskId, updates) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const oldTask = { ...this.tasks[taskIndex] };
        this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
        this.saveToStorage();

        // Handle notification changes
        if (updates.dueDate || updates.notification !== undefined || updates.completed) {
            this.cancelNotification(oldTask.id);
            if (this.tasks[taskIndex].notification && this.tasks[taskIndex].dueDate && !this.tasks[taskIndex].completed) {
                this.scheduleNotification(this.tasks[taskIndex]);
            }
        }

        return this.tasks[taskIndex];
    }
    deleteTask(taskId, options) {
        const opts = options || {};
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const [task] = this.tasks.splice(taskIndex, 1);
        this.cancelNotification(taskId);

        if (window.openTrackrPlannerSync && typeof window.openTrackrPlannerSync.onBoardDelete === 'function') {
            window.openTrackrPlannerSync.onBoardDelete(task);
        }

        this.saveToStorage();
        this.render();

        if (opts.silent) return;

        this.lastDeleted = task;
        this.showUndoSnackbar(`Deleted: ${task.title}`, () => this.restoreDeletedTask());
    }
    restoreDeletedTask() {
        if (!this.lastDeleted) return;
        this.tasks.push(this.lastDeleted);
        this.lastDeleted = null;
        this.saveToStorage();
        this.render();
    }
    showUndoSnackbar(message, undoCallback) {
        const sb = document.getElementById('snackbar');
        if (!sb) return;
        const msg = sb.querySelector('.snackbar-message');
        const undoBtn = document.getElementById('snackbarUndo');
        msg.textContent = message;
        sb.classList.remove('hidden');
        // remove any previous handler
        undoBtn.onclick = null;
        undoBtn.onclick = () => {
            undoCallback();
            sb.classList.add('hidden');
            clearTimeout(this.undoTimeoutId);
            this.undoTimeoutId = null;
        };
        clearTimeout(this.undoTimeoutId);
        this.undoTimeoutId = setTimeout(() => {
            sb.classList.add('hidden');
            this.lastDeleted = null;
            this.undoTimeoutId = null;
        }, 6000);
    }
    moveTask(taskId, newCategory) {
        this.updateTask(taskId, {
            category: newCategory,
            completed: newCategory === 'Done'
        });

        const task = this.tasks.find(function (t) { return t.id === taskId; });
        if (task && window.openTrackrPlannerSync && typeof window.openTrackrPlannerSync.onBoardMove === 'function') {
            window.openTrackrPlannerSync.onBoardMove(task);
        }
    }
    toggleComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const completed = !task.completed;
        const updates = { completed: completed };
        if (completed) {
            updates.category = 'Done';
        } else if (task.category === 'Done') {
            updates.category = 'To Do';
        }

        this.updateTask(taskId, updates);

        if (window.openTrackrPlannerSync && typeof window.openTrackrPlannerSync.onBoardMove === 'function') {
            window.openTrackrPlannerSync.onBoardMove(this.tasks.find(t => t.id === taskId));
        }

        this.render();
    }

    // Category Management
    addCategory(name) {
        if (!name || this.categories.includes(name)) return;
        this.categories.push(name);
        this.assignColorToCategory(name);
        this.saveToStorage();
        this.render();
    }

    assignColorToCategory(name) {
        if (!this.categoryColors[name]) {
            const index = Object.keys(this.categoryColors).length;
            this.categoryColors[name] = this.palette[index % this.palette.length];
        }
    }
    updateCategory(oldName, newName) {
        const index = this.categories.indexOf(oldName);
        if (index === -1 || this.categories.includes(newName)) return;

        this.categories[index] = newName;
        // Update all tasks in this category
        this.tasks.forEach(task => {
            if (task.category === oldName) {
                task.category = newName;
            }
        });
        this.saveToStorage();
        this.render();
    }
    deleteCategory(name) {
        if (this.categories.length <= 1) {
            alert('You must have at least one category!');
            return;
        }

        const index = this.categories.indexOf(name);
        if (index === -1) return;

        // Move tasks to first available category
        const defaultCategory = this.categories.find(c => c !== name);
        this.tasks.forEach(task => {
            if (task.category === name) {
                task.category = defaultCategory;
            }
        });

        this.categories.splice(index, 1);
        this.saveToStorage();
        this.render();
    }
    reorderCategory(fromIndex, toIndex) {
        const [moved] = this.categories.splice(fromIndex, 1);
        this.categories.splice(toIndex, 0, moved);
        this.saveToStorage();
        this.render();
    }

    // View Management
    setViewMode(mode) {
        if (!['kanban', 'list', 'calendar'].includes(mode)) return;
        this.viewMode = mode;
        this.saveToStorage();
        this.render();
        this.updateViewButtons();
    }
    updateViewButtons() {
        document.querySelectorAll('.view-switch-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.view === this.viewMode);
        }.bind(this));
    }
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        this.saveToStorage();
        this.updateThemeIcon();
    }
    updateThemeIcon() {
        const icon = document.getElementById('themeIcon');
        icon.textContent = this.theme === 'light' ? '🌙' : '☀️';
    }

    // Notification Management
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Don't request automatically, wait for user to enable in settings
        }
    }
    scheduleNotification(task) {
        if (!task.dueDate || !task.notification || task.completed) return;

        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const timeUntilDue = dueDate - now;

        if (timeUntilDue <= 0) return;

        // Schedule notification 5 minutes before due time (or at due time if less than 5 min away)
        const notificationTime = Math.min(timeUntilDue - 5 * 60 * 1000, timeUntilDue);

        const timerId = setTimeout(() => {
            this.showNotification(task);
        }, notificationTime);

        this.notificationTimers.set(task.id, timerId);
    }
    cancelNotification(taskId) {
        const timerId = this.notificationTimers.get(taskId);
        if (timerId) {
            clearTimeout(timerId);
            this.notificationTimers.delete(taskId);
        }
    }
    restoreNotifications() {
        this.tasks.forEach(task => {
            if (task.notification && task.dueDate && !task.completed) {
                this.scheduleNotification(task);
            }
        });
    }
    setupNotificationCheck() {
        // Check for overdue tasks every minute
        setInterval(() => {
            this.render(); // Re-render to update overdue styling
        }, 60000);
    }
    showNotification(task) {
        if (!this.notificationsEnabled || Notification.permission !== 'granted') return;

        new Notification(`Task Due: ${task.title}`, {
            body: task.description || 'This task is due now!',
            icon: '/favicon.ico',
            badge: '/favicon.ico'
        });

        this.cancelNotification(task.id);
    }

    // Utility Functions
    isOverdue(task) {
        if (!task.dueDate || task.completed) return false;
        return new Date(task.dueDate) < new Date();
    }

    // Focus trap for modals
    trapFocus(modal) {
        if (!modal) return;
        const focusable = modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        function keyHandler(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
            if (e.key === 'Escape') {
                modal.classList.add('hidden');
                modal.setAttribute('aria-hidden', 'true');
                document.removeEventListener('keydown', keyHandler);
            }
        }

        // attach key handler to modal
        modal.addEventListener('keydown', keyHandler);
        // ensure initial focus
        first.focus();
    }
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Add Task Button
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.openTaskModal();
        });

        // Floating FAB (mobile) handler
        const fab = document.getElementById('fabAddTask');
        if (fab) fab.addEventListener('click', () => this.openTaskModal());

        // Close Modals
        document.getElementById('closeTaskModal').addEventListener('click', () => {
            this.closeTaskModal();
        });

        document.getElementById('cancelTask').addEventListener('click', () => {
            this.closeTaskModal();
        });

        // View switcher
        document.querySelectorAll('.view-switch-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                this.setViewMode(btn.dataset.view);
            }.bind(this));
        }.bind(this));

        const exportCalendarBtn = document.getElementById('exportCalendarBtn');
        if (exportCalendarBtn && window.OpenTrackrCalendar) {
            exportCalendarBtn.addEventListener('click', () => {
                const result = OpenTrackrCalendar.exportTasks();
                const sb = document.getElementById('snackbar');
                if (!sb) {
                    alert(result.message);
                    return;
                }
                const msg = sb.querySelector('.snackbar-message');
                const undoBtn = document.getElementById('snackbarUndo');
                msg.textContent = result.message;
                if (undoBtn) undoBtn.classList.toggle('hidden', !result.ok);
                sb.classList.remove('hidden');
                clearTimeout(this.exportSnackbarTimeout);
                this.exportSnackbarTimeout = setTimeout(() => sb.classList.add('hidden'), 5000);
            });
        }

        // Task Form
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmit();
        });

        // Close modals on outside click
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') this.closeTaskModal();
        });

        // Snackbar undo click (in case user presses undo when it's visible)
        const undoBtn = document.getElementById('snackbarUndo');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.restoreDeletedTask();
                const sb = document.getElementById('snackbar');
                if (sb) sb.classList.add('hidden');
            });
        }

        this.updateViewButtons();
    }

    // Modal Management
    openTaskModal(task = null, presetDueDate = null) {
        this.currentEditingTask = task;
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        const modalTitle = document.getElementById('modalTitle');

        if (task) {
            modalTitle.textContent = 'Edit Task';
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskCategory').value = task.category;
            document.getElementById('taskDueDate').value = task.dueDate ? task.dueDate.slice(0, 16) : '';
            document.getElementById('taskNotification').checked = task.notification || false;
        } else {
            modalTitle.textContent = 'Add New Task';
            form.reset();
            document.getElementById('taskCategory').value = this.categories[0];
            if (presetDueDate) {
                document.getElementById('taskDueDate').value = presetDueDate.slice(0, 16);
            }
        }

        this.populateCategorySelect();
        this.previousActiveElement = document.activeElement;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.remove('hidden');
        this.trapFocus(modal);
    }
    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        document.getElementById('taskForm').reset();
        this.currentEditingTask = null;
        if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
            this.previousActiveElement.focus();
        }
    }
    handleTaskSubmit() {
        const formData = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            category: document.getElementById('taskCategory').value,
            dueDate: document.getElementById('taskDueDate').value || null,
            notification: document.getElementById('taskNotification').checked
        };

        if (!formData.title) {
            alert('Task title is required!');
            return;
        }

        if (this.currentEditingTask) {
            this.updateTask(this.currentEditingTask.id, formData);
        } else {
            this.addTask(formData);
        }

        this.closeTaskModal();
        this.render();
    }
    populateCategorySelect() {
        const select = document.getElementById('taskCategory');
        select.innerHTML = this.categories.map(cat => 
            `<option value="${cat}">${cat}</option>`
        ).join('');
    }

    // Rendering
    render() {
        if (this.viewMode === 'kanban') {
            this.renderKanban();
        } else if (this.viewMode === 'list') {
            this.renderList();
        } else {
            this.renderCalendar();
        }
    }
    renderKanban() {
        document.getElementById('kanbanView').classList.remove('hidden');
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');

        const columnsContainer = document.getElementById('kanbanColumns');
        if (!Array.isArray(this.categories) || this.categories.length === 0) {
            // ensure we always have default columns
            this.categories = ['To Do', 'In Progress', 'Done'];
        }

        if (!columnsContainer) {
            console.error('Kanban columns container (#kanbanColumns) not found in DOM');
            return;
        }

        columnsContainer.innerHTML = this.categories.map((category, index) => {
            const categoryTasks = this.tasks.filter(t => t.category === category);
            return `
                <div class="kanban-column" data-category="${category}" data-index="${index}">
                    <div class="column-header">
                        <div class="column-title">
                            ${category}
                            <span class="column-count">${categoryTasks.length}</span>
                        </div>
                    </div>
                    <div class="tasks-container" data-category="${category}">
                        ${categoryTasks.length > 0 
                            ? categoryTasks.map(task => this.renderTaskCard(task)).join('')
                            : '<div class="empty-state">Drop cards here or add one below</div>'
                        }
                    </div>
                    <form class="kanban-add-form" data-category="${this.escapeHtml(category)}">
                        <input type="text" class="kanban-add-input" placeholder="+ Add a card" maxlength="120" aria-label="Add task to ${this.escapeHtml(category)}">
                        <button type="submit" class="kanban-add-submit">Add</button>
                    </form>
                </div>
            `;
        }).join('');

        this.setupDragAndDrop();
        this.setupKanbanQuickAdd();
    }

    setupKanbanQuickAdd() {
        document.querySelectorAll('.kanban-add-form').forEach(function (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                const input = form.querySelector('.kanban-add-input');
                const title = input.value.trim();
                if (!title) return;

                this.addTask({
                    title: title,
                    category: form.dataset.category,
                    description: '',
                    dueDate: null,
                    notification: false
                });
                input.value = '';
                this.render();
            }.bind(this));
        }.bind(this));
    }
    renderCalendar() {
        document.getElementById('kanbanView').classList.add('hidden');
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');

        const calendarEl = document.getElementById('fullCalendar');
        if (!calendarEl || typeof FullCalendar === 'undefined') return;

        const events = this.tasks
            .filter(task => task.dueDate)
            .map(task => ({
                id: task.id,
                title: task.title,
                start: task.dueDate,
                backgroundColor: task.completed ? '#48bb78' : '#3182ce',
                borderColor: task.completed ? '#48bb78' : '#3182ce'
            }));

        if (!this.calendarInstance) {
            this.calendarInstance = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek'
                },
                events,
                dateClick: (info) => {
                    const dueDateValue = info.dateStr + 'T09:00';
                    this.openTaskModal(null, dueDateValue);
                },
                eventClick: (info) => {
                    const task = this.tasks.find(t => t.id === info.event.id);
                    if (task) this.openTaskModal(task);
                }
            });
            this.calendarInstance.render();
        } else {
            this.calendarInstance.removeAllEvents();
            events.forEach(event => this.calendarInstance.addEvent(event));
            requestAnimationFrame(() => {
                if (this.calendarInstance) this.calendarInstance.updateSize();
            });
        }
    }
    renderList() {
        document.getElementById('kanbanView').classList.add('hidden');
        document.getElementById('listView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');

        const listContainer = document.getElementById('taskListContainer');
        
        if (this.tasks.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">No tasks yet. Add your first task!</div>';
            return;
        }

        // Group by category
        const grouped = {};
        this.tasks.forEach(task => {
            if (!grouped[task.category]) grouped[task.category] = [];
            grouped[task.category].push(task);
        });

        listContainer.innerHTML = Object.keys(grouped).map(category => `
            <div style="margin-bottom: 2rem;">
                <h2 style="margin-bottom: 1rem; color: var(--text-primary);">${category}</h2>
                ${grouped[category].map(task => this.renderListItem(task)).join('')}
            </div>
        `).join('');
    }
    renderTaskCard(task) {
        const overdue = this.isOverdue(task);
        return `
            <div class="task-card ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}" 
                 draggable="true" data-task-id="${task.id}">
                <div class="task-header">
                    <div>
                        <span class="task-tag">${this.escapeHtml(task.category)}</span>
                        <div class="task-title" style="display:inline-block">${this.escapeHtml(task.title)}</div>
                    </div>
                    <div class="task-actions">
                        <button class="btn-small" onclick="app.openTaskModal(${JSON.stringify(task).replace(/"/g, '&quot;')})" title="Edit">✏️</button>
                        <button class="btn-small" onclick="app.deleteTask('${task.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                <div class="task-meta">
                    ${task.priority ? `<span class="task-priority-tag task-priority-${task.priority.toLowerCase()}">${this.escapeHtml(task.priority)}</span>` : ''}
                    ${task.plannerRowId ? '<span class="task-source-tag">📋 Planner</span>' : ''}
                    ${task.quickTodoId ? '<span class="task-source-tag">✅ Quick to-do</span>' : ''}
                    ${task.dueDate ? `
                        <div class="task-due-date ${overdue ? 'overdue' : ''}">
                            📅 ${this.formatDate(task.dueDate)}
                        </div>
                    ` : ''}
                    ${task.notification ? '<div class="task-notification">🔔 Reminder set</div>' : ''}
                    <label class="checkbox-label">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                               onchange="app.toggleComplete('${task.id}')">
                        <span>Complete</span>
                    </label>
                </div>
            </div>
        `;
    }
    renderListItem(task) {
        const overdue = this.isOverdue(task);
        return `
            <div class="list-task-item ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}" data-task-id="${task.id}">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                       onchange="app.toggleComplete('${task.id}')">
                <div class="list-task-content">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    <div class="task-meta">
                        ${task.dueDate ? `
                            <div class="task-due-date ${overdue ? 'overdue' : ''}">
                                📅 ${this.formatDate(task.dueDate)}
                            </div>
                        ` : ''}
                        ${task.notification ? '<div class="task-notification">🔔 Reminder set</div>' : ''}
                    </div>
                </div>
                <div class="list-task-category">${this.escapeHtml(task.category)}</div>
                <div class="task-actions">
                    <button class="btn-small" onclick="app.openTaskModal(${JSON.stringify(task).replace(/"/g, '&quot;')})" title="Edit">✏️</button>
                    <button class="btn-small" onclick="app.deleteTask('${task.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Drag and Drop
    setupDragAndDrop() {
        const taskCards = document.querySelectorAll('.task-card');
        const columns = document.querySelectorAll('.tasks-container');

        taskCards.forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        columns.forEach(column => {
            column.addEventListener('dragover', this.handleDragOver.bind(this));
            column.addEventListener('drop', this.handleDrop.bind(this));
            column.addEventListener('dragenter', this.handleDragEnter.bind(this));
            column.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    }
    handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.currentTarget.dataset.taskId);
        e.currentTarget.classList.add('dragging');
    }
    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.kanban-column').forEach(col => {
            col.classList.remove('drag-over');
        });
    }
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    handleDragEnter(e) {
        e.preventDefault();
        e.currentTarget.closest('.kanban-column').classList.add('drag-over');
    }
    handleDragLeave(e) {
        e.currentTarget.closest('.kanban-column').classList.remove('drag-over');
    }
    handleDrop(e) {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const newCategory = e.currentTarget.dataset.category;
        
        this.moveTask(taskId, newCategory);
        this.render();
        
        e.currentTarget.closest('.kanban-column').classList.remove('drag-over');
    }
}

window.TaskTracker = TaskTracker;
let app;

function initApp() {
    if (!document.getElementById('kanbanColumns')) return;
    if (!window.app) {
        window.app = new TaskTracker();
        app = window.app;
    }
}

document.addEventListener('DOMContentLoaded', initApp);

setTimeout(initApp, 0);

if (document.readyState !== 'loading') {
    setTimeout(initApp, 0);
}

