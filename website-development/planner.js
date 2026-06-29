(function () {
    const TODO_KEY = 'openTrackr_quickTodos';
    const TODO_INPUT_DRAFT_KEY = 'openTrackr_quickTodoInputDraft';
    const DAILY_DRAFT_KEY = 'openTrackr_dailyPlannerDraft';
    const DAILY_NOTES_KEY = 'openTrackr_dailyPlannerNotes';
    const LEGACY_DAILY_KEY = 'openTrackr_dailyPlanner';
    const TASK_PLANNER_KEY = 'openTrackr_taskPlanner';

    let quickTodoSync = null;
    let taskPlannerSync = null;

    window.openTrackrPlannerSync = {
        onBoardMove: function (task) {
            if (quickTodoSync && quickTodoSync.onBoardMove) quickTodoSync.onBoardMove(task);
            if (taskPlannerSync && taskPlannerSync.onBoardMove) taskPlannerSync.onBoardMove(task);
        },
        onBoardDelete: function (task) {
            if (quickTodoSync && quickTodoSync.onBoardDelete) quickTodoSync.onBoardDelete(task);
            if (taskPlannerSync && taskPlannerSync.onBoardDelete) taskPlannerSync.onBoardDelete(task);
        },
        onPlannerLinked: function (rowId, boardTaskId) {
            if (taskPlannerSync && taskPlannerSync.onPlannerLinked) {
                taskPlannerSync.onPlannerLinked(rowId, boardTaskId);
            }
        },
        onTodoLinked: function (todoId, boardTaskId) {
            if (quickTodoSync && quickTodoSync.onTodoLinked) {
                quickTodoSync.onTodoLinked(todoId, boardTaskId);
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlanner);
    } else {
        initPlanner();
    }

    function initPlanner() {
        if (!document.getElementById('planningWorkspace')) return;

        initQuickTodos();
        initDailyPlanner();
        initTaskPlanner();
    }

    function flushAutosave(handlers) {
        handlers.forEach(function (handler) {
            try {
                handler();
            } catch (err) {
                console.warn('OpenTrackr autosave failed:', err);
            }
        });
    }

    function bindPageAutosave(handlers) {
        if (!handlers.length) return;

        function runAutosave() {
            flushAutosave(handlers);
        }

        window.addEventListener('pagehide', runAutosave);
        window.addEventListener('beforeunload', runAutosave);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') {
                runAutosave();
            }
        });
    }

    function generateId() {
        return Date.now().toString() + Math.random().toString(36).slice(2, 7);
    }

    function getBoardApp() {
        return window.app && typeof window.app.upsertFromPlannerRow === 'function' ? window.app : null;
    }

    function whenBoardReady(callback) {
        if (getBoardApp()) {
            callback();
            return;
        }
        let attempts = 0;
        const timer = setInterval(function () {
            attempts += 1;
            if (getBoardApp()) {
                clearInterval(timer);
                callback();
            } else if (attempts >= 30) {
                clearInterval(timer);
            }
        }, 50);
    }

    function showBoardToast(message) {
        const sb = document.getElementById('snackbar');
        if (!sb) return;
        const msg = sb.querySelector('.snackbar-message');
        const undoBtn = document.getElementById('snackbarUndo');
        if (msg) msg.textContent = message;
        if (undoBtn) undoBtn.classList.add('hidden');
        sb.classList.remove('hidden');
        clearTimeout(showBoardToast._timer);
        showBoardToast._timer = setTimeout(function () {
            sb.classList.add('hidden');
        }, 3500);
    }

    function goToKanbanBoard() {
        if (window.app && typeof window.app.setViewMode === 'function') {
            window.app.setViewMode('kanban');
        }
        const kanbanView = document.getElementById('kanbanView');
        if (kanbanView) {
            kanbanView.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    function saveJson(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    /* ----- Quick to-do list ----- */
    function initQuickTodos() {
        const form = document.getElementById('quickTodoForm');
        const input = document.getElementById('quickTodoInput');
        const list = document.getElementById('quickTodoList');
        if (!form || !input || !list) return;

        let todos = loadJson(TODO_KEY, []);

        function normalizeTodos(data) {
            if (!Array.isArray(data)) return [];
            return data.map(function (item) {
                if (!item || typeof item !== 'object') {
                    return { id: generateId(), text: '', done: false, boardTaskId: null };
                }
                return {
                    id: item.id || generateId(),
                    text: String(item.text || ''),
                    done: Boolean(item.done),
                    boardTaskId: item.boardTaskId || null
                };
            });
        }

        todos = normalizeTodos(todos);

        const savedInputDraft = localStorage.getItem(TODO_INPUT_DRAFT_KEY);
        if (savedInputDraft) {
            input.value = savedInputDraft;
        }

        function persist() {
            saveJson(TODO_KEY, todos);
        }

        function syncTodoToBoard(todo) {
            const app = getBoardApp();
            if (!app) return;
            const task = app.upsertFromQuickTodo(todo);
            if (task && !todo.boardTaskId) {
                todo.boardTaskId = task.id;
                persist();
            }
        }

        function persistInputDraft() {
            localStorage.setItem(TODO_INPUT_DRAFT_KEY, input.value);
        }

        function renderTodos() {
            if (todos.length === 0) {
                list.innerHTML = '<li class="quick-todo-empty">No items yet — add a to-do and it appears on the Kanban board.</li>';
                return;
            }

            list.innerHTML = todos.map(function (item) {
                return (
                    '<li class="quick-todo-item' + (item.done ? ' completed' : '') + '" data-id="' + item.id + '">' +
                    '<label class="checkbox-label">' +
                    '<input type="checkbox"' + (item.done ? ' checked' : '') + ' aria-label="Mark complete">' +
                    '<span>' + escapeHtml(item.text) + '</span>' +
                    '</label>' +
                    (item.boardTaskId ? '<span class="quick-todo-board-badge" title="On Kanban board">Board</span>' : '') +
                    '<button type="button" class="btn-small quick-todo-delete" aria-label="Delete to-do">🗑️</button>' +
                    '</li>'
                );
            }).join('');

            list.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
                checkbox.addEventListener('change', function (e) {
                    const id = e.target.closest('.quick-todo-item').dataset.id;
                    const todo = todos.find(function (t) { return t.id === id; });
                    if (todo) {
                        todo.done = e.target.checked;
                        persist();
                        syncTodoToBoard(todo);
                        if (window.app) window.app.render();
                        renderTodos();
                    }
                });
            });

            list.querySelectorAll('.quick-todo-delete').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    const id = e.target.closest('.quick-todo-item').dataset.id;
                    const todo = todos.find(function (t) { return t.id === id; });
                    if (todo && todo.boardTaskId && window.app) {
                        window.app.deleteTask(todo.boardTaskId, { silent: true });
                    }
                    todos = todos.filter(function (t) { return t.id !== id; });
                    persist();
                    renderTodos();
                });
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            const todo = {
                id: generateId(),
                text: text,
                done: false,
                boardTaskId: null
            };
            todos.push(todo);
            input.value = '';
            localStorage.removeItem(TODO_INPUT_DRAFT_KEY);
            persist();
            syncTodoToBoard(todo);
            if (window.app) window.app.render();
            renderTodos();
            showBoardToast('Added to Kanban → To Do column');
        });

        ['input', 'change', 'keyup', 'blur'].forEach(function (eventName) {
            input.addEventListener(eventName, persistInputDraft);
        });

        bindPageAutosave([persistInputDraft]);

        whenBoardReady(function () {
            todos.forEach(function (todo) {
                syncTodoToBoard(todo);
            });
            window.app.render();
            renderTodos();
        });

        renderTodos();

        quickTodoSync = {
            onBoardMove: function (task) {
                if (!task.quickTodoId) return;
                const todo = todos.find(function (t) { return t.id === task.quickTodoId; });
                if (!todo) return;
                todo.done = task.category === 'Done';
                todo.boardTaskId = task.id;
                persist();
                renderTodos();
            },
            onBoardDelete: function (task) {
                if (!task.quickTodoId) return;
                const todo = todos.find(function (t) { return t.id === task.quickTodoId; });
                if (!todo) return;
                todo.boardTaskId = null;
                persist();
                renderTodos();
            },
            onTodoLinked: function (todoId, boardTaskId) {
                const todo = todos.find(function (t) { return t.id === todoId; });
                if (!todo) return;
                todo.boardTaskId = boardTaskId;
                persist();
                renderTodos();
            }
        };
    }

    /* ----- Daily planner template ----- */
    function initDailyPlanner() {
        const form = document.getElementById('dailyPlannerForm');
        const board = document.getElementById('dailyPlannerNotesBoard');
        const emptyMsg = document.getElementById('dailyPlannerNotesEmpty');
        const saveBtn = document.getElementById('saveDailyPlanner');
        const clearBtn = document.getElementById('clearDailyPlanner');
        const deleteBtn = document.getElementById('deleteDailyPlanner');
        const statusEl = document.getElementById('dailyPlannerStatus');
        if (!form || !board) return;

        migrateDailyPlannerData();

        const fields = ['plannerDate', 'dailyFocus', 'priority1', 'priority2', 'priority3',
            'morningPlan', 'afternoonPlan', 'eveningPlan', 'dailyNotes'];
        let notes = loadJson(DAILY_NOTES_KEY, []);
        let editingNoteId = null;

        loadDraftIntoForm();
        renderNotes();
        updateFormActions();

        form.addEventListener('input', onFormChange);
        form.addEventListener('change', onFormChange);

        fields.forEach(function (fieldId) {
            const el = document.getElementById(fieldId);
            if (!el) return;
            ['input', 'change', 'keyup', 'blur'].forEach(function (eventName) {
                el.addEventListener(eventName, onFormChange);
            });
        });

        bindPageAutosave([saveDraftFromForm]);

        function onFormChange() {
            saveDraftFromForm();
            updateFormActions();
        }

        function saveDailyPlan() {
            const data = readFormData();
            if (!hasDailyContent(data)) {
                setStatus('Add a focus, priority, or plan before saving.', 'error');
                return;
            }

            if (editingNoteId) {
                const note = notes.find(function (n) { return n.id === editingNoteId; });
                if (note) {
                    Object.assign(note, data);
                    note.updatedAt = new Date().toISOString();
                }
                setStatus('Daily plan updated.', 'success');
            } else {
                notes.push({
                    id: Date.now().toString(),
                    x: 4 + (notes.length * 6) % 40,
                    y: 8 + (notes.length * 5) % 30,
                    savedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    plannerDate: data.plannerDate,
                    dailyFocus: data.dailyFocus,
                    priority1: data.priority1,
                    priority2: data.priority2,
                    priority3: data.priority3,
                    morningPlan: data.morningPlan,
                    afternoonPlan: data.afternoonPlan,
                    eveningPlan: data.eveningPlan,
                    dailyNotes: data.dailyNotes
                });
                setStatus('Daily plan saved — see your note in Saved daily plans above.', 'success');
            }

            persistNotes();
            clearForm(true);
            renderNotes();
            updateFormActions();

            if (window.app && typeof window.app.setViewMode === 'function') {
                window.app.setViewMode('calendar');
            }

            const notesSection = document.getElementById('savedDailyPlansSection');
            if (notesSection) {
                notesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                saveDailyPlan();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                clearForm(true);
                setStatus('Form cleared.', '');
                updateFormActions();
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', function () {
                if (!editingNoteId) return;
                notes = notes.filter(function (n) { return n.id !== editingNoteId; });
                persistNotes();
                clearForm(true);
                renderNotes();
                setStatus('Saved note deleted.', 'success');
                updateFormActions();
            });
        }

        function migrateDailyPlannerData() {
            if (localStorage.getItem(DAILY_DRAFT_KEY) || localStorage.getItem(DAILY_NOTES_KEY)) return;
            const legacy = loadJson(LEGACY_DAILY_KEY, null);
            if (legacy && hasDailyContent(legacy)) {
                saveJson(DAILY_DRAFT_KEY, legacy);
            }
        }

        function readFormData() {
            const data = {};
            fields.forEach(function (id) {
                const el = document.getElementById(id);
                data[id] = el ? el.value : '';
            });
            return data;
        }

        function writeFormData(data) {
            fields.forEach(function (id) {
                const el = document.getElementById(id);
                if (el) el.value = data[id] || '';
            });
        }

        function loadDraftIntoForm() {
            const draft = loadJson(DAILY_DRAFT_KEY, {});
            writeFormData(draft);
            const dateInput = document.getElementById('plannerDate');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().slice(0, 10);
            }
            saveDraftFromForm();
        }

        function saveDraftFromForm() {
            saveJson(DAILY_DRAFT_KEY, readFormData());
        }

        function hasDailyContent(data) {
            return fields.some(function (id) {
                if (id === 'plannerDate') return false;
                return String(data[id] || '').trim().length > 0;
            });
        }

        function clearForm(resetEditing) {
            if (resetEditing) editingNoteId = null;
            writeFormData({
                plannerDate: new Date().toISOString().slice(0, 10),
                dailyFocus: '',
                priority1: '',
                priority2: '',
                priority3: '',
                morningPlan: '',
                afternoonPlan: '',
                eveningPlan: '',
                dailyNotes: ''
            });
            saveDraftFromForm();
        }

        function openNoteForEdit(noteId) {
            const note = notes.find(function (n) { return n.id === noteId; });
            if (!note) return;
            editingNoteId = note.id;
            writeFormData(note);
            saveDraftFromForm();
            updateFormActions();
            setStatus('Editing saved note — change fields and click Save as note, or Delete saved note.', '');
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function updateFormActions() {
            const hasContent = hasDailyContent(readFormData());
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = editingNoteId ? 'Save changes' : 'Save as note';
                saveBtn.classList.toggle('btn-ready', hasContent);
                saveBtn.setAttribute('aria-disabled', hasContent ? 'false' : 'true');
            }
            if (deleteBtn) deleteBtn.classList.toggle('hidden', !editingNoteId);
            if (clearBtn) clearBtn.textContent = editingNoteId ? 'Cancel edit' : 'Clear form';
        }

        function setStatus(message, type) {
            if (!statusEl) return;
            statusEl.textContent = message;
            statusEl.className = 'planner-form-status' + (type ? ' ' + type : '');
        }

        function persistNotes() {
            saveJson(DAILY_NOTES_KEY, notes);
        }

        function formatDisplayDate(dateStr) {
            if (!dateStr) return 'Daily plan';
            const d = new Date(dateStr + 'T12:00:00');
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
        }

        function renderNotes() {
            board.querySelectorAll('.daily-planner-note').forEach(function (el) { el.remove(); });

            if (emptyMsg) {
                emptyMsg.classList.toggle('hidden', notes.length > 0);
            }

            notes.forEach(function (note) {
                const el = document.createElement('article');
                el.className = 'daily-planner-note';
                el.dataset.id = note.id;
                el.style.left = (note.x || 0) + '%';
                el.style.top = (note.y || 0) + '%';

                const previewFocus = note.dailyFocus || note.priority1 || 'Daily plan saved';
                const previewLine = note.priority1 && note.dailyFocus ? note.priority1 : '';

                el.innerHTML =
                    '<div class="daily-planner-note-drag" title="Drag to move">' +
                    '<strong>' + escapeHtml(formatDisplayDate(note.plannerDate)) + '</strong>' +
                    '<span class="daily-planner-note-actions">' +
                    '<button type="button" class="btn-small daily-planner-note-edit" aria-label="Edit note">✏️</button>' +
                    '<button type="button" class="btn-small daily-planner-note-delete" aria-label="Delete note">✕</button>' +
                    '</span></div>' +
                    '<button type="button" class="daily-planner-note-open">' +
                    '<span class="daily-planner-note-focus">' + escapeHtml(previewFocus) + '</span>' +
                    (previewLine ? '<span class="daily-planner-note-line">' + escapeHtml(previewLine) + '</span>' : '') +
                    '</button>';

                board.appendChild(el);
                makeNoteDraggable(el, note);
                bindNoteActions(el, note);
            });
        }

        function bindNoteActions(el, note) {
            el.querySelector('.daily-planner-note-edit').addEventListener('click', function (e) {
                e.stopPropagation();
                openNoteForEdit(note.id);
            });

            el.querySelector('.daily-planner-note-open').addEventListener('click', function () {
                openNoteForEdit(note.id);
            });

            el.querySelector('.daily-planner-note-delete').addEventListener('click', function (e) {
                e.stopPropagation();
                if (!confirm('Delete this saved daily plan?')) return;
                notes = notes.filter(function (n) { return n.id !== note.id; });
                if (editingNoteId === note.id) clearForm(true);
                persistNotes();
                renderNotes();
                updateFormActions();
                setStatus('Saved note deleted.', 'success');
            });
        }

        function makeNoteDraggable(el, note) {
            const handle = el.querySelector('.daily-planner-note-drag');
            let dragging = false;
            let startX = 0;
            let startY = 0;
            let originLeft = 0;
            let originTop = 0;

            handle.addEventListener('pointerdown', function (e) {
                if (e.target.closest('button')) return;
                dragging = true;
                el.setPointerCapture(e.pointerId);
                el.classList.add('dragging');
                startX = e.clientX;
                startY = e.clientY;
                originLeft = note.x || 0;
                originTop = note.y || 0;
            });

            el.addEventListener('pointermove', function (e) {
                if (!dragging) return;
                const rect = board.getBoundingClientRect();
                const dx = ((e.clientX - startX) / rect.width) * 100;
                const dy = ((e.clientY - startY) / rect.height) * 100;
                const maxX = 72;
                const maxY = 78;
                note.x = Math.max(0, Math.min(maxX, originLeft + dx));
                note.y = Math.max(0, Math.min(maxY, originTop + dy));
                el.style.left = note.x + '%';
                el.style.top = note.y + '%';
            });

            el.addEventListener('pointerup', function (e) {
                if (!dragging) return;
                dragging = false;
                el.classList.remove('dragging');
                el.releasePointerCapture(e.pointerId);
                persistNotes();
            });

            el.addEventListener('pointercancel', function () {
                dragging = false;
                el.classList.remove('dragging');
            });
        }
    }

    /* ----- Task planner template ----- */
    function initTaskPlanner() {
        const tbody = document.getElementById('taskPlannerBody');
        const addBtn = document.getElementById('addPlannerRow');
        const addFooterBtn = document.getElementById('addPlannerRowFooter');
        const emptyEl = document.getElementById('taskPlannerEmpty');
        const rowCountEl = document.getElementById('taskPlannerRowCount');
        const tableWrap = document.querySelector('.task-planner-table-wrap');
        if (!tbody) return;

        let rows = loadTaskPlannerRows();

        function emptyTaskRow() {
            return { id: generateId(), task: '', due: '', priority: '', status: '', notes: '', boardTaskId: null };
        }

        function createDefaultTaskRows(count) {
            const list = [];
            for (let i = 0; i < count; i++) {
                list.push(emptyTaskRow());
            }
            return list;
        }

        function loadTaskPlannerRows() {
            const stored = loadJson(TASK_PLANNER_KEY, null);
            if (stored === null) {
                return createDefaultTaskRows(3);
            }
            return normalizeTaskRows(stored);
        }

        function normalizeTaskRows(data) {
            if (!Array.isArray(data)) {
                return [];
            }
            return data.map(function (row) {
                if (!row || typeof row !== 'object') {
                    return emptyTaskRow();
                }
                return {
                    id: row.id || generateId(),
                    task: String(row.task || ''),
                    due: String(row.due || ''),
                    priority: String(row.priority || ''),
                    status: String(row.status || ''),
                    notes: String(row.notes || ''),
                    boardTaskId: row.boardTaskId || null
                };
            });
        }

        function persist() {
            saveJson(TASK_PLANNER_KEY, rows);
            updateRowCount();
        }

        function updateRowCount() {
            if (!rowCountEl) return;
            const count = rows.length;
            rowCountEl.textContent = count === 1 ? '1 task' : count + ' tasks';
        }

        function updateEmptyState() {
            const hasRows = rows.length > 0;
            if (emptyEl) {
                emptyEl.classList.toggle('hidden', hasRows);
            }
            if (tableWrap) {
                tableWrap.classList.toggle('task-planner-table-wrap--empty', !hasRows);
            }
        }

        function applySelectStyle(select) {
            if (!select || !select.dataset.field) return;
            const value = select.value;
            const field = select.dataset.field;
            select.classList.remove(
                'priority-high', 'priority-medium', 'priority-low',
                'status-not-started', 'status-in-progress', 'status-done'
            );
            if (field === 'priority') {
                if (value === 'High') select.classList.add('priority-high');
                else if (value === 'Medium') select.classList.add('priority-medium');
                else if (value === 'Low') select.classList.add('priority-low');
            } else if (field === 'status') {
                if (value === 'Not started') select.classList.add('status-not-started');
                else if (value === 'In progress') select.classList.add('status-in-progress');
                else if (value === 'Done') select.classList.add('status-done');
            }
        }

        function syncRowToBoard(index, showFeedback) {
            const row = rows[index];
            if (!row || !String(row.task || '').trim()) return false;
            const app = getBoardApp();
            if (!app) {
                showBoardToast('Open the Task Tracker page to use the Kanban board.');
                return false;
            }
            const task = app.upsertFromPlannerRow(row);
            if (task) {
                row.boardTaskId = task.id;
                persist();
                if (showFeedback !== false) {
                    showBoardToast('Sent to Kanban → ' + app.mapStatusToCategory(row.status));
                    goToKanbanBoard();
                }
                if (window.app) window.app.render();
                return true;
            }
            return false;
        }

        function renderBoardCell(row, index) {
            if (row.boardTaskId) {
                return '<span class="board-linked-badge" title="Synced with Kanban board">On board</span>';
            }
            const disabled = String(row.task || '').trim() ? '' : ' disabled';
            return '<button type="button" class="btn-small send-to-board"' + disabled + ' data-index="' + index + '">Add to board</button>';
        }

        function renderRows() {
            tbody.innerHTML = rows.map(function (row, index) {
                return (
                    '<tr data-index="' + index + '"' + (row.boardTaskId ? ' class="task-planner-row-linked"' : '') + '>' +
                    '<td><input type="text" class="planner-cell planner-cell-task" data-field="task" value="' + escapeAttr(row.task) + '" placeholder="What needs doing?" aria-label="Task name"></td>' +
                    '<td><input type="date" class="planner-cell planner-cell-date" data-field="due" value="' + escapeAttr(row.due) + '" aria-label="Due date"></td>' +
                    '<td><select class="planner-cell planner-cell-priority" data-field="priority" aria-label="Priority">' +
                    priorityOptions(row.priority) +
                    '</select></td>' +
                    '<td><select class="planner-cell planner-cell-status" data-field="status" aria-label="Status">' +
                    statusOptions(row.status) +
                    '</select></td>' +
                    '<td><input type="text" class="planner-cell planner-cell-notes" data-field="notes" value="' + escapeAttr(row.notes) + '" placeholder="Add notes..." aria-label="Notes"></td>' +
                    '<td class="task-planner-board-cell">' + renderBoardCell(row, index) + '</td>' +
                    '<td class="task-planner-actions-cell"><button type="button" class="btn-small remove-planner-row" aria-label="Remove task">✕</button></td>' +
                    '</tr>'
                );
            }).join('');

            tbody.querySelectorAll('.planner-cell').forEach(function (cell) {
                cell.addEventListener('input', onCellChange);
                cell.addEventListener('change', onCellChange);
                applySelectStyle(cell);
            });

            tbody.querySelectorAll('.send-to-board').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    const index = parseInt(btn.dataset.index, 10);
                    syncRowToBoard(index, true);
                    renderRows();
                });
            });

            tbody.querySelectorAll('.remove-planner-row').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    const tr = e.target.closest('tr');
                    if (!tr) return;
                    const index = parseInt(tr.dataset.index, 10);
                    const row = rows[index];
                    if (row && row.boardTaskId && window.app) {
                        window.app.deleteTask(row.boardTaskId, { silent: true });
                    }
                    rows.splice(index, 1);
                    persist();
                    renderRows();
                });
            });

            updateEmptyState();
            updateRowCount();
        }

        function syncRowsFromDom() {
            tbody.querySelectorAll('tr').forEach(function (tr) {
                const index = parseInt(tr.dataset.index, 10);
                if (Number.isNaN(index) || !rows[index]) return;
                tr.querySelectorAll('.planner-cell').forEach(function (cell) {
                    const field = cell.dataset.field;
                    if (field) {
                        rows[index][field] = cell.value;
                    }
                });
            });
        }

        function onCellChange(e) {
            const tr = e.target.closest('tr');
            if (!tr) return;
            const index = parseInt(tr.dataset.index, 10);
            const field = e.target.dataset.field;
            if (Number.isNaN(index) || !field || !rows[index]) return;
            rows[index][field] = e.target.value;
            applySelectStyle(e.target);
            persist();

            if (rows[index].boardTaskId && getBoardApp()) {
                getBoardApp().upsertFromPlannerRow(rows[index]);
                if (window.app) window.app.render();
                renderRows();
            } else if (field === 'task') {
                const sendBtn = tr.querySelector('.send-to-board');
                if (sendBtn) {
                    sendBtn.disabled = !String(e.target.value || '').trim();
                }
            }
        }

        function flushTaskPlanner() {
            syncRowsFromDom();
            persist();
        }

        function priorityOptions(selected) {
            const opts = ['', 'High', 'Medium', 'Low'];
            return opts.map(function (opt) {
                const label = opt || 'Set priority';
                return '<option value="' + opt + '"' + (opt === selected ? ' selected' : '') + '>' + label + '</option>';
            }).join('');
        }

        function statusOptions(selected) {
            const opts = ['', 'Not started', 'In progress', 'Done'];
            return opts.map(function (opt) {
                const label = opt || 'Set status';
                return '<option value="' + opt + '"' + (opt === selected ? ' selected' : '') + '>' + label + '</option>';
            }).join('');
        }

        function addRow() {
            rows.push(emptyTaskRow());
            persist();
            renderRows();
            const newIndex = rows.length - 1;
            const taskInput = tbody.querySelector('tr[data-index="' + newIndex + '"] input[data-field="task"]');
            if (taskInput) {
                taskInput.focus();
                taskInput.closest('tr').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        if (addBtn) addBtn.addEventListener('click', addRow);
        if (addFooterBtn) addFooterBtn.addEventListener('click', addRow);

        const sendAllBtn = document.getElementById('sendAllToBoard');
        if (sendAllBtn) {
            sendAllBtn.addEventListener('click', function () {
                syncRowsFromDom();
                let sent = 0;
                rows.forEach(function (row, index) {
                    if (!row.boardTaskId && String(row.task || '').trim()) {
                        if (syncRowToBoard(index, false)) sent++;
                    }
                });
                renderRows();
                if (sent > 0) {
                    showBoardToast(sent + ' task' + (sent === 1 ? '' : 's') + ' sent to Kanban board');
                    goToKanbanBoard();
                } else {
                    showBoardToast('Add task names first, or they are already on the board.');
                }
            });
        }

        bindPageAutosave([flushTaskPlanner]);
        renderRows();

        taskPlannerSync = {
            onBoardMove: function (task) {
                if (!task.plannerRowId) return;
                const row = rows.find(function (r) { return r.id === task.plannerRowId; });
                if (!row) return;
                row.status = getBoardApp() ? getBoardApp().mapCategoryToStatus(task.category) : row.status;
                row.boardTaskId = task.id;
                persist();
                renderRows();
            },
            onBoardDelete: function (task) {
                if (!task.plannerRowId) return;
                const row = rows.find(function (r) { return r.id === task.plannerRowId; });
                if (!row) return;
                row.boardTaskId = null;
                persist();
                renderRows();
            },
            onPlannerLinked: function (rowId, boardTaskId) {
                const row = rows.find(function (r) { return r.id === rowId; });
                if (!row) return;
                row.boardTaskId = boardTaskId;
                persist();
                renderRows();
            }
        };
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeAttr(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
    }
})();
