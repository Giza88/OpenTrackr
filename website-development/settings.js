document.addEventListener('DOMContentLoaded', function () {
    const ACCOUNT_KEY = 'openTrackr_account';
    const SESSION_KEY = 'openTrackr_loggedIn';
    const FONT_KEY = 'openTrackr_font';
    const THEME_KEY = 'taskTracker_theme';
    const NOTIFICATIONS_KEY = 'taskTracker_notifications';
    const CATEGORIES_KEY = 'taskTracker_categories';
    const TODO_KEY = 'openTrackr_quickTodos';
    const DAILY_DRAFT_KEY = 'openTrackr_dailyPlannerDraft';
    const DAILY_NOTES_KEY = 'openTrackr_dailyPlannerNotes';
    const TASK_PLANNER_KEY = 'openTrackr_taskPlanner';

    const messageEl = document.getElementById('settingsMessage');
    const fontChoice = document.getElementById('fontChoice');
    const themeChoice = document.getElementById('themeChoice');
    const passwordForm = document.getElementById('passwordForm');
    const passwordHint = document.getElementById('passwordHint');
    const passwordLoginLink = document.getElementById('passwordLoginLink');
    const calendarProvider = document.getElementById('settingsCalendarProvider');
    const calendarHelp = document.getElementById('settingsCalendarHelp');
    const exportCalendarBtn = document.getElementById('settingsExportCalendar');
    const templatePreset = document.getElementById('templatePreset');
    const loadPresetBtn = document.getElementById('loadTemplatePreset');
    const exportTemplatesBtn = document.getElementById('exportTemplates');
    const templateImportFile = document.getElementById('templateImportFile');
    const notificationsCheckbox = document.getElementById('settingsNotifications');
    const categoryList = document.getElementById('settingsCategoryList');
    const addCategoryBtn = document.getElementById('settingsAddCategory');

    initAppearance();
    initPasswordSection();
    initCalendar();
    initTemplates();
    initNotifications();
    initCategories();

    function showMessage(text, type) {
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.className = 'settings-message' + (type ? ' ' + type : '');
    }

    function initAppearance() {
        if (fontChoice) {
            fontChoice.value = localStorage.getItem(FONT_KEY) || 'system';
            fontChoice.addEventListener('change', function () {
                localStorage.setItem(FONT_KEY, fontChoice.value);
                applyFont(fontChoice.value);
                showMessage('Font updated.', 'success');
            });
        }

        if (themeChoice) {
            themeChoice.value = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
            themeChoice.addEventListener('change', function () {
                localStorage.setItem(THEME_KEY, themeChoice.value);
                document.documentElement.setAttribute('data-theme', themeChoice.value);
                const icon = document.getElementById('themeIcon');
                if (icon) icon.textContent = themeChoice.value === 'light' ? '🌙' : '☀️';
                showMessage('Theme updated.', 'success');
            });
        }
    }

    function initPasswordSection() {
        const account = loadAccount();
        const loggedIn = localStorage.getItem(SESSION_KEY) === 'true';

        if (account && loggedIn) {
            if (passwordHint) {
                passwordHint.textContent = 'Signed in as ' + account.email + '. Enter your current password to set a new one.';
            }
            passwordForm.classList.remove('hidden');
            passwordLoginLink.classList.add('hidden');

            passwordForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const current = document.getElementById('currentPassword').value;
                const newPass = document.getElementById('newPassword').value;
                const confirm = document.getElementById('confirmNewPassword').value;

                if (account.password !== current) {
                    showMessage('Current password is incorrect.', 'error');
                    return;
                }
                if (newPass !== confirm) {
                    showMessage('New passwords do not match.', 'error');
                    return;
                }
                if (newPass.length < 6 || newPass.length > 12) {
                    showMessage('Password must be 6 to 12 characters.', 'error');
                    return;
                }

                account.password = newPass;
                localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
                passwordForm.reset();
                showMessage('Password updated successfully.', 'success');
            });
        }
    }

    function initCalendar() {
        const account = loadAccount();
        if (calendarProvider) {
            calendarProvider.value = (account && account.calendarProvider) || 'google';
            updateCalendarHelp(calendarProvider.value);

            calendarProvider.addEventListener('change', function () {
                if (account) {
                    account.calendarProvider = calendarProvider.value;
                    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
                }
                updateCalendarHelp(calendarProvider.value);
                showMessage('Calendar preference saved.', 'success');
            });
        }

        if (exportCalendarBtn && window.OpenTrackrCalendar) {
            exportCalendarBtn.addEventListener('click', function () {
                const result = OpenTrackrCalendar.exportTasks();
                showMessage(result.message, result.ok ? 'success' : 'error');
            });
        }
    }

    function updateCalendarHelp(provider) {
        if (calendarHelp && window.OpenTrackrCalendar) {
            calendarHelp.textContent = OpenTrackrCalendar.getImportHelp(provider);
        }
    }

    function initTemplates() {
        if (loadPresetBtn) {
            loadPresetBtn.addEventListener('click', function () {
                const preset = getTemplatePreset(templatePreset.value);
                applyTemplatePack(preset);
                showMessage('Loaded "' + preset.name + '" template. Open the Task Tracker to see it.', 'success');
            });
        }

        if (exportTemplatesBtn) {
            exportTemplatesBtn.addEventListener('click', function () {
                const pack = {
                    name: 'My OpenTrackr templates',
                    quickTodos: loadJson(TODO_KEY, []),
                    dailyPlanner: loadJson(DAILY_DRAFT_KEY, {}),
                    dailyPlannerNotes: loadJson(DAILY_NOTES_KEY, []),
                    taskPlanner: loadJson(TASK_PLANNER_KEY, [])
                };
                downloadJson(pack, 'opentrackr-templates.json');
                showMessage('Templates exported.', 'success');
            });
        }

        if (templateImportFile) {
            templateImportFile.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function () {
                    try {
                        const data = JSON.parse(reader.result);
                        applyTemplatePack(data);
                        showMessage('Imported "' + (data.name || 'custom') + '" template.', 'success');
                    } catch {
                        showMessage('Could not read that file. Please use a valid JSON template.', 'error');
                    }
                    templateImportFile.value = '';
                };
                reader.readAsText(file);
            });
        }
    }

    function applyTemplatePack(pack) {
        if (pack.quickTodos) localStorage.setItem(TODO_KEY, JSON.stringify(pack.quickTodos));
        if (pack.dailyPlanner) localStorage.setItem(DAILY_DRAFT_KEY, JSON.stringify(pack.dailyPlanner));
        if (pack.dailyPlannerNotes) localStorage.setItem(DAILY_NOTES_KEY, JSON.stringify(pack.dailyPlannerNotes));
        if (pack.taskPlanner) localStorage.setItem(TASK_PLANNER_KEY, JSON.stringify(pack.taskPlanner));
    }

    function getTemplatePreset(key) {
        const today = new Date().toISOString().slice(0, 10);
        const presets = {
            study: {
                name: 'Study week',
                quickTodos: [
                    { id: '1', text: 'Review lecture notes', done: false },
                    { id: '2', text: 'Complete reading for tomorrow', done: false },
                    { id: '3', text: 'Check iQualify announcements', done: false }
                ],
                dailyPlanner: {
                    plannerDate: today,
                    dailyFocus: 'Stay on top of assignments and revision.',
                    priority1: 'Finish highest-priority assessment work',
                    priority2: 'Attend or watch scheduled classes',
                    priority3: 'Organise notes for the week',
                    morningPlan: 'Review calendar and set up study blocks.',
                    afternoonPlan: 'Deep work on main assignment.',
                    eveningPlan: 'Light revision and prep for tomorrow.',
                    dailyNotes: ''
                },
                taskPlanner: [
                    { task: 'Assessment draft', due: '', priority: 'High', status: 'In progress', notes: '' },
                    { task: 'Weekly reading', due: '', priority: 'Medium', status: 'Not started', notes: '' },
                    { task: 'Group project check-in', due: '', priority: 'Medium', status: 'Not started', notes: '' },
                    { task: 'Submit lab work', due: '', priority: 'High', status: 'Not started', notes: '' },
                    { task: 'Review feedback', due: '', priority: 'Low', status: 'Not started', notes: '' }
                ]
            },
            work: {
                name: 'Work week',
                quickTodos: [
                    { id: '1', text: 'Check email and priorities', done: false },
                    { id: '2', text: 'Update task tracker', done: false },
                    { id: '3', text: 'Prepare for tomorrow\'s meetings', done: false }
                ],
                dailyPlanner: {
                    plannerDate: today,
                    dailyFocus: 'Deliver key outcomes and clear blockers.',
                    priority1: 'Complete top client or project task',
                    priority2: 'Respond to urgent messages',
                    priority3: 'Plan tomorrow\'s schedule',
                    morningPlan: 'Stand-up prep and focus block.',
                    afternoonPlan: 'Meetings and collaborative work.',
                    eveningPlan: 'Wrap up and log completed tasks.',
                    dailyNotes: ''
                },
                taskPlanner: [
                    { task: 'Project milestone', due: '', priority: 'High', status: 'In progress', notes: '' },
                    { task: 'Team meeting prep', due: '', priority: 'Medium', status: 'Not started', notes: '' },
                    { task: 'Admin and expenses', due: '', priority: 'Low', status: 'Not started', notes: '' },
                    { task: 'Client follow-up', due: '', priority: 'High', status: 'Not started', notes: '' },
                    { task: 'Weekly report', due: '', priority: 'Medium', status: 'Not started', notes: '' }
                ]
            },
            fitness: {
                name: 'Fitness & wellness week',
                quickTodos: [
                    { id: '1', text: 'Drink water — first glass', done: false },
                    { id: '2', text: '10-minute walk or stretch', done: false },
                    { id: '3', text: 'Prep healthy lunch', done: false }
                ],
                dailyPlanner: {
                    plannerDate: today,
                    dailyFocus: 'Move, rest, and stay balanced.',
                    priority1: 'Scheduled exercise session',
                    priority2: 'Balanced meals and hydration',
                    priority3: 'Wind-down routine tonight',
                    morningPlan: 'Light movement and breakfast.',
                    afternoonPlan: 'Main workout or active break.',
                    eveningPlan: 'Stretch, relax, early sleep prep.',
                    dailyNotes: ''
                },
                taskPlanner: [
                    { task: 'Gym / run session', due: '', priority: 'High', status: 'Not started', notes: '' },
                    { task: 'Meal prep', due: '', priority: 'Medium', status: 'Not started', notes: '' },
                    { task: 'Sleep by 10:30 pm', due: '', priority: 'Medium', status: 'Not started', notes: '' },
                    { task: 'Mindfulness / journal', due: '', priority: 'Low', status: 'Not started', notes: '' },
                    { task: 'Weekly weigh-in / check-in', due: '', priority: 'Low', status: 'Not started', notes: '' }
                ]
            },
            blank: {
                name: 'Blank template',
                quickTodos: [],
                dailyPlanner: {
                    plannerDate: today,
                    dailyFocus: '',
                    priority1: '',
                    priority2: '',
                    priority3: '',
                    morningPlan: '',
                    afternoonPlan: '',
                    eveningPlan: '',
                    dailyNotes: ''
                },
                taskPlanner: [
                    { task: '', due: '', priority: '', status: '', notes: '' },
                    { task: '', due: '', priority: '', status: '', notes: '' },
                    { task: '', due: '', priority: '', status: '', notes: '' }
                ]
            }
        };
        return presets[key] || presets.blank;
    }

    function initNotifications() {
        if (!notificationsCheckbox) return;
        notificationsCheckbox.checked = loadJson(NOTIFICATIONS_KEY, false) === true;

        notificationsCheckbox.addEventListener('change', function () {
            if (notificationsCheckbox.checked && 'Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().then(function (permission) {
                    if (permission !== 'granted') {
                        notificationsCheckbox.checked = false;
                        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(false));
                        showMessage('Notification permission was not granted.', 'error');
                        return;
                    }
                    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(true));
                    showMessage('Notifications enabled.', 'success');
                });
                return;
            }
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notificationsCheckbox.checked));
            showMessage(notificationsCheckbox.checked ? 'Notifications enabled.' : 'Notifications turned off.', 'success');
        });
    }

    function initCategories() {
        if (!categoryList) return;
        renderCategories();

        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', function () {
                const name = prompt('Enter a new category name:');
                if (!name) return;
                const trimmed = name.trim();
                if (!trimmed) return;

                const categories = loadCategories();
                if (categories.includes(trimmed)) {
                    showMessage('That category already exists.', 'error');
                    return;
                }
                categories.push(trimmed);
                saveCategories(categories);
                renderCategories();
                showMessage('Category added.', 'success');
            });
        }
    }

    function renderCategories() {
        const categories = loadCategories();
        categoryList.innerHTML = categories.map(function (cat, index) {
            return (
                '<div class="settings-category-item">' +
                '<input type="text" value="' + escapeAttr(cat) + '" data-index="' + index + '" aria-label="Category name">' +
                '<button type="button" class="btn-small settings-delete-category" data-name="' + escapeAttr(cat) + '" aria-label="Delete category">🗑️</button>' +
                '</div>'
            );
        }).join('');

        categoryList.querySelectorAll('input').forEach(function (input) {
            input.addEventListener('change', function () {
                const categories = loadCategories();
                const index = parseInt(input.dataset.index, 10);
                const oldName = categories[index];
                const newName = input.value.trim();
                if (!newName || newName === oldName) return;
                if (categories.includes(newName)) {
                    showMessage('That category name is already in use.', 'error');
                    input.value = oldName;
                    return;
                }
                categories[index] = newName;
                saveCategories(categories);
                renameTasksCategory(oldName, newName);
                renderCategories();
                showMessage('Category renamed.', 'success');
            });
        });

        categoryList.querySelectorAll('.settings-delete-category').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const name = btn.dataset.name;
                let categories = loadCategories();
                if (categories.length <= 1) {
                    showMessage('You need at least one category.', 'error');
                    return;
                }
                categories = categories.filter(function (c) { return c !== name; });
                saveCategories(categories);
                reassignTasksCategory(name, categories[0]);
                renderCategories();
                showMessage('Category removed.', 'success');
            });
        });
    }

    function loadCategories() {
        const saved = loadJson(CATEGORIES_KEY, null);
        if (saved && saved.length) return saved;
        return ['To Do', 'In Progress', 'Done'];
    }

    function saveCategories(categories) {
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    }

    function renameTasksCategory(oldName, newName) {
        const tasks = loadJson('taskTracker_tasks', []);
        tasks.forEach(function (task) {
            if (task.category === oldName) task.category = newName;
        });
        localStorage.setItem('taskTracker_tasks', JSON.stringify(tasks));
    }

    function reassignTasksCategory(oldName, newName) {
        const tasks = loadJson('taskTracker_tasks', []);
        tasks.forEach(function (task) {
            if (task.category === oldName) task.category = newName;
        });
        localStorage.setItem('taskTracker_tasks', JSON.stringify(tasks));
    }

    function loadAccount() {
        try {
            const raw = localStorage.getItem(ACCOUNT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function loadJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    function downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function escapeAttr(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
    }

    function applyFont(fontKey) {
        const fonts = {
            system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
            arial: 'Arial, Helvetica, sans-serif',
            verdana: 'Verdana, Geneva, sans-serif',
            georgia: 'Georgia, "Times New Roman", serif',
            permanent: '"Permanent Marker", cursive',
            comic: '"Comic Sans MS", "Comic Sans", cursive, sans-serif'
        };
        document.body.style.fontFamily = fonts[fontKey] || fonts.system;
    }
});
