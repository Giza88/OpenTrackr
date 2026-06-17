// OpenTrackr Application
class TaskTracker {
        /*
            OpenTrackr - Single-file app logic

            Responsibilities:
                - Manage tasks and categories in-memory and in localStorage
                - Render UI (Kanban & List) into the DOM via string templates
                - Handle modals, focus trapping, and keyboard accessibility
                - Support drag-and-drop between columns
                - Schedule browser notifications for reminders
                - Provide an undo snackbar for deletes

            Quick map (where to look):
                - constructor: initial properties + debounced save
                - init(): load storage, wire events, initial render
                - LocalStorage Management: load/save/restore
                - Task Management: add/update/delete/restore
                - Category Management: add/update/delete/reorder
                - View Management: toggleView, toggleTheme
                - Notification Management: schedule/cancel/restore
                - Event Listeners: setupEventListeners()
                - Modal Management: open/close forms
                - Rendering: render(), renderKanban(), renderList(), renderTaskCard(), renderListItem()
                - Drag & Drop: setupDragAndDrop() and handlers
        */
    constructor() {
        this.tasks = [];
        this.categories = ['To Do', 'In Progress', 'Done'];
        this.viewMode = 'kanban'; // 'kanban' or 'list'
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

    /**
     * Initialize the application
     * - Loads saved data from localStorage
     * - Requests notifications (deferred until user enables)
     * - Wires up DOM event listeners
     * - Performs the initial render
     * - Starts periodic checks (e.g., overdue tasks)
     */
    init() {
        this.loadFromStorage();
        this.requestNotificationPermission();
        this.setupEventListeners();
        this.render();
        this.setupNotificationCheck();
    }

    // LocalStorage Management
    /**
     * Persist current app state to localStorage.
     * Uses a debounced wrapper (`this.debouncedSave`) to batch writes.
     */
    saveToStorage() {
        // use debounced save to reduce write frequency
        if (this.debouncedSave) this.debouncedSave();
    }

    /**
     * Load app state from localStorage into memory.
     * Restores tasks, categories, preferences and category colors.
     */
    loadFromStorage() {
        const savedTasks = localStorage.getItem('taskTracker_tasks');
        const savedCategories = localStorage.getItem('taskTracker_categories');
        const savedViewMode = localStorage.getItem('taskTracker_viewMode');
        const savedTheme = localStorage.getItem('taskTracker_theme');
        const savedNotifications = localStorage.getItem('taskTracker_notifications');
        const savedCategoryColors = localStorage.getItem('taskTracker_categoryColors');

        if (savedTasks) this.tasks = JSON.parse(savedTasks);
        if (savedCategories) this.categories = JSON.parse(savedCategories);
        if (savedViewMode) this.viewMode = savedViewMode;
        if (savedTheme) this.theme = savedTheme;
        if (savedNotifications) this.notificationsEnabled = JSON.parse(savedNotifications);
        if (savedCategoryColors) this.categoryColors = JSON.parse(savedCategoryColors);

        // Restore notification timers
        this.restoreNotifications();
    }

    // Utility: debounce
    /**
     * Returns a debounced version of `fn` that delays invocation by `ms` milliseconds.
     * Useful for reducing the frequency of expensive operations (like localStorage writes).
     */
    debounce(fn, ms = 300) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    }

    // Task Management
    /**
     * Create a new task object and persist it.
     * taskData: { title, description, category, dueDate, notification }
     * Returns the created task object.
     */
    addTask(taskData) {
        const task = {
            id: Date.now().toString(),
            title: taskData.title,
            description: taskData.description || '',
            category: taskData.category || this.categories[0],
            dueDate: taskData.dueDate || null,
            completed: false,
            notification: taskData.notification || false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveToStorage();

        if (task.notification && task.dueDate) {
            this.scheduleNotification(task);
        }

        return task;
    }

    /**
     * Update a task by ID with the provided `updates` object.
     * Handles notification rescheduling when dueDate/notification/completed change.
     */
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

    /**
     * Delete a task by ID.
     * Stores the deleted task in `this.lastDeleted` to allow undo.
     */
    deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const [task] = this.tasks.splice(taskIndex, 1);
        this.cancelNotification(taskId);
        this.lastDeleted = task;
        this.saveToStorage();
        this.render();
        this.showUndoSnackbar(`Deleted: ${task.title}`, () => this.restoreDeletedTask());
    }

    /**
     * Restore the most recently deleted task (undo operation).
     */
    restoreDeletedTask() {
        if (!this.lastDeleted) return;
        this.tasks.push(this.lastDeleted);
        this.lastDeleted = null;
        this.saveToStorage();
        this.render();
    }

    /**
     * Show the transient snackbar with an undo button.
     * `undoCallback` is executed if the user clicks Undo.
     */
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

    /**
     * Move a task to a different category (used by drag/drop).
     */
    moveTask(taskId, newCategory) {
        this.updateTask(taskId, { category: newCategory });
    }

    /**
     * Toggle the completed state of a task.
     */
    toggleComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.updateTask(taskId, { completed: !task.completed });
    }

    // Category Management
    /**
     * Add a new category name and assign a color.
     */
    addCategory(name) {
        if (!name || this.categories.includes(name)) return;
        this.categories.push(name);
        // assign a color for the new category
        this.assignColorToCategory(name);
        this.saveToStorage();
        this.render();
    }

    /**
     * Rename a category and migrate tasks that used the old name.
     */
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

    /**
     * Delete a category and migrate its tasks to a remaining category.
     */
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

    /**
     * Reorder categories array and persist the change.
     */
    reorderCategory(fromIndex, toIndex) {
        const [moved] = this.categories.splice(fromIndex, 1);
        this.categories.splice(toIndex, 0, moved);
        this.saveToStorage();
        this.render();
    }

    // View Management
    /**
     * Toggle between Kanban and List view and re-render.
     */
    toggleView() {
        this.viewMode = this.viewMode === 'kanban' ? 'list' : 'kanban';
        this.saveToStorage();
        this.render();
        this.updateViewIcon();
    }

    /**
     * Update the small UI icon that indicates the current view mode.
     */
    updateViewIcon() {
        const icon = document.getElementById('viewIcon');
        icon.textContent = this.viewMode === 'kanban' ? '📊' : '📋';
    }

    /**
     * Toggle light/dark theme by setting `data-theme` on <html>.
     */
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        this.saveToStorage();
        this.updateThemeIcon();
    }

    /**
     * Refresh the theme icon to reflect the current theme.
     */
    updateThemeIcon() {
        const icon = document.getElementById('themeIcon');
        icon.textContent = this.theme === 'light' ? '🌙' : '☀️';
    }

    // Notification Management
    /**
     * Placeholder for requesting Notification permission.
     * We avoid auto-requesting; the user toggles notifications in the settings.
     */
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Don't request automatically, wait for user to enable in settings
        }
    }

    /**
     * Schedule a browser notification for the given task.
     * Stores timeout IDs in `this.notificationTimers` so they can be cancelled.
     */
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

    /**
     * Cancel a scheduled notification for a task by clearing the timeout.
     */
    cancelNotification(taskId) {
        const timerId = this.notificationTimers.get(taskId);
        if (timerId) {
            clearTimeout(timerId);
            this.notificationTimers.delete(taskId);
        }
    }

    /**
     * Recreate notification timers for tasks stored in localStorage.
     * Called on initialization after loading tasks.
     */
    restoreNotifications() {
        this.tasks.forEach(task => {
            if (task.notification && task.dueDate && !task.completed) {
                this.scheduleNotification(task);
            }
        });
    }

    /**
     * Periodic background check to refresh UI (used to update overdue styles).
     */
    setupNotificationCheck() {
        // Check for overdue tasks every minute
        setInterval(() => {
            this.render(); // Re-render to update overdue styling
        }, 60000);
    }

    /**
     * Immediately fire a browser notification for the provided task.
     */
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
    /**
     * Return true if the task has a dueDate in the past and is not completed.
     */
    isOverdue(task) {
        if (!task.dueDate || task.completed) return false;
        return new Date(task.dueDate) < new Date();
    }

    // Focus trap for modals
    /**
     * Keep keyboard focus inside the provided modal element until it is closed.
     * Handles Tab and Shift+Tab cycling and Escape to close.
     */
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

    /**
     * Format a stored ISO date string into a readable local datetime string.
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    // Event Listeners Setup
    /**
     * Wire the global DOM event handlers for buttons, forms, modals, and settings.
     * Keeps the constructor small and centralizes DOM wiring.
     */
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

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettingsModal();
        });

        document.getElementById('cancelTask').addEventListener('click', () => {
            this.closeTaskModal();
        });

        // View Toggle
        document.getElementById('viewToggle').addEventListener('click', () => {
            this.toggleView();
        });

        // Theme Toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });

        // Task Form
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmit();
        });

        // Settings
        document.getElementById('enableNotifications').addEventListener('change', (e) => {
            this.notificationsEnabled = e.target.checked;
            if (this.notificationsEnabled && Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission !== 'granted') {
                        this.notificationsEnabled = false;
                        e.target.checked = false;
                    }
                });
            }
            this.saveToStorage();
        });

        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            const name = prompt('Enter category name:');
            if (name) this.addCategory(name.trim());
            this.renderSettings();
        });

        // Close modals on outside click
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') this.closeTaskModal();
        });

        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') this.closeSettingsModal();
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

        // Set initial theme
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();
        this.updateViewIcon();
    }

    // Modal Management
    /**
     * Open the Add/Edit Task modal and populate fields when editing.
     * Stores the previously focused element to restore focus when modal closes.
     */
    openTaskModal(task = null) {
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
        }

        this.populateCategorySelect();
        this.previousActiveElement = document.activeElement;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.remove('hidden');
        this.trapFocus(modal);
    }

    /**
     * Close the task modal and reset form state.
     */
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

    /**
     * Open settings modal and populate current settings values.
     */
    openSettingsModal() {
        document.getElementById('enableNotifications').checked = this.notificationsEnabled;
        this.renderSettings();
        const modal = document.getElementById('settingsModal');
        this.previousActiveElement = document.activeElement;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.remove('hidden');
        this.trapFocus(modal);
    }

    /**
     * Close settings modal and restore focus to previous element.
     */
    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
            this.previousActiveElement.focus();
        }
    }

    /**
     * Read the form values and either create a new task or update an existing one.
     * Performs simple validation (title required).
     */
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

    /**
     * Populate the category <select> used in the task form.
     */
    populateCategorySelect() {
        const select = document.getElementById('taskCategory');
        select.innerHTML = this.categories.map(cat => 
            `<option value="${cat}">${cat}</option>`
        ).join('');
    }

    /**
     * Render the category management UI inside the Settings modal.
     * Uses inline onchange/onclick handlers that call `app.*` helpers.
     */
    renderSettings() {
        const categoryList = document.getElementById('categoryList');
        categoryList.innerHTML = this.categories.map((cat, index) => `
            <div class="category-item">
                <input type="text" value="${cat}" data-index="${index}" 
                    onchange="app.updateCategoryFromInput('${cat}', this.value)">
                <div>
                    <button class="btn-small" onclick="app.deleteCategory('${cat}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Helper used by the inline onchange handler to rename categories.
     */
    updateCategoryFromInput(oldName, newName) {
        if (newName && newName !== oldName) {
            this.updateCategory(oldName, newName);
        }
    }

    // Rendering
    /**
     * Top-level render function: dispatches to Kanban or List rendering
     * based on `this.viewMode`.
     */
    render() {
        if (this.viewMode === 'kanban') {
            this.renderKanban();
        } else {
            this.renderList();
        }
    }

    /**
     * Build the Kanban columns and task cards as HTML strings and inject into DOM.
     * After injection we call setupDragAndDrop() to attach handlers to created nodes.
     */
    renderKanban() {
        document.getElementById('kanbanView').classList.remove('hidden');
        document.getElementById('listView').classList.add('hidden');

        const columnsContainer = document.getElementById('kanbanColumns');
        if (!Array.isArray(this.categories) || this.categories.length === 0) {
            // ensure we always have default columns
            this.categories = ['To Do', 'In Progress', 'Done'];
        }

        if (!columnsContainer) {
            console.error('Kanban columns container (#kanbanColumns) not found in DOM');
            return;
        }

        console.log('OpenTrackr: rendering kanban for categories=', this.categories);

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
                            : '<div class="empty-state">No tasks</div>'
                        }
                    </div>
                </div>
            `;
        }).join('');

        this.setupDragAndDrop();
    }

    /**
     * Render the alternate List view grouped by category.
     */
    renderList() {
        document.getElementById('kanbanView').classList.add('hidden');
        document.getElementById('listView').classList.remove('hidden');

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

    /**
     * Return an HTML string for a single task card used in the Kanban board.
     * The string includes: title, category tag, description, due date, notification,
     * edit/delete buttons and a complete checkbox.
     */
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

    /**
     * Return an HTML string for a single task row in the List view.
     */
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

    /**
     * Escape text for safe HTML insertion by using a detached DOM node.
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Drag and Drop
    /**
     * Attach drag/drop listeners to the rendered task cards and column containers.
     * These handlers use HTML5 drag & drop APIs and update task.category on drop.
     */
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

    /**
     * dragstart handler: store the task id in the dataTransfer payload
     * and add a visual "dragging" class.
     */
    handleDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.currentTarget.dataset.taskId);
        e.currentTarget.classList.add('dragging');
    }

    /**
     * dragend handler: clean up dragging state and column highlights.
     */
    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.kanban-column').forEach(col => {
            col.classList.remove('drag-over');
        });
    }

    /**
     * dragover handler: required to allow dropping (preventDefault).
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    /**
     * dragenter handler: visually indicate a column is an available drop target.
     */
    handleDragEnter(e) {
        e.preventDefault();
        e.currentTarget.closest('.kanban-column').classList.add('drag-over');
    }

    /**
     * dragleave handler: remove visual drop indicator from column.
     */
    handleDragLeave(e) {
        e.currentTarget.closest('.kanban-column').classList.remove('drag-over');
    }

    /**
     * drop handler: read the dragged task id and move the task into the
     * column's category, then re-render.
     */
    handleDrop(e) {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const newCategory = e.currentTarget.dataset.category;
        
        this.moveTask(taskId, newCategory);
        this.render();
        
        e.currentTarget.closest('.kanban-column').classList.remove('drag-over');
    }
}

// Initialize the app and expose it on `window` so inline handlers work
window.TaskTracker = TaskTracker;
let app;

// Initialize immediately if DOM is ready, else wait for DOMContentLoaded
function initApp() {
    if (!window.app) {
        window.app = new TaskTracker();
        app = window.app;
    }
}

// Approach 1: DOMContentLoaded (fires when HTML is parsed)
document.addEventListener('DOMContentLoaded', initApp);

// Approach 2: Fallback via setTimeout (if DOMContentLoaded already fired)
setTimeout(initApp, 0);

// Approach 3: Interactive state (DOM ready but resources may still load)
if (document.readyState !== 'loading') {
    setTimeout(initApp, 0);
}

