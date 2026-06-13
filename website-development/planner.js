/**
 * OpenTrackr — quick to-do list and fill-in planner templates
 * Persists to localStorage on the tracker page.
 */
(function () {
    const TODO_KEY = 'openTrackr_quickTodos';
    const DAILY_KEY = 'openTrackr_dailyPlanner';
    const TASK_PLANNER_KEY = 'openTrackr_taskPlanner';

    document.addEventListener('DOMContentLoaded', initPlanner);

    function initPlanner() {
        if (!document.getElementById('planningWorkspace')) return;

        initQuickTodos();
        initDailyPlanner();
        initTaskPlanner();
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

        function persist() {
            saveJson(TODO_KEY, todos);
        }

        function renderTodos() {
            if (todos.length === 0) {
                list.innerHTML = '<li class="quick-todo-empty">No items yet — add your first to-do above.</li>';
                return;
            }

            list.innerHTML = todos.map(function (item) {
                return (
                    '<li class="quick-todo-item' + (item.done ? ' completed' : '') + '" data-id="' + item.id + '">' +
                    '<label class="checkbox-label">' +
                    '<input type="checkbox"' + (item.done ? ' checked' : '') + ' aria-label="Mark complete">' +
                    '<span>' + escapeHtml(item.text) + '</span>' +
                    '</label>' +
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
                        renderTodos();
                    }
                });
            });

            list.querySelectorAll('.quick-todo-delete').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    const id = e.target.closest('.quick-todo-item').dataset.id;
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
            todos.push({
                id: Date.now().toString(),
                text: text,
                done: false
            });
            input.value = '';
            persist();
            renderTodos();
        });

        renderTodos();
    }

    /* ----- Daily planner template ----- */
    function initDailyPlanner() {
        const form = document.getElementById('dailyPlannerForm');
        if (!form) return;

        const fields = ['plannerDate', 'dailyFocus', 'priority1', 'priority2', 'priority3',
            'morningPlan', 'afternoonPlan', 'eveningPlan', 'dailyNotes'];
        const saved = loadJson(DAILY_KEY, {});

        fields.forEach(function (id) {
            const el = document.getElementById(id);
            if (el && saved[id]) el.value = saved[id];
        });

        if (!document.getElementById('plannerDate').value) {
            document.getElementById('plannerDate').value = new Date().toISOString().slice(0, 10);
        }

        form.addEventListener('input', function () {
            const data = {};
            fields.forEach(function (id) {
                const el = document.getElementById(id);
                if (el) data[id] = el.value;
            });
            saveJson(DAILY_KEY, data);
        });
    }

    /* ----- Task planner template ----- */
    function initTaskPlanner() {
        const tbody = document.getElementById('taskPlannerBody');
        const addBtn = document.getElementById('addPlannerRow');
        if (!tbody) return;

        let rows = loadJson(TASK_PLANNER_KEY, null);
        if (!rows) {
            rows = createDefaultTaskRows(5);
        }

        function createDefaultTaskRows(count) {
            const list = [];
            for (let i = 0; i < count; i++) {
                list.push({ task: '', due: '', priority: '', status: '', notes: '' });
            }
            return list;
        }

        function persist() {
            saveJson(TASK_PLANNER_KEY, rows);
        }

        function renderRows() {
            tbody.innerHTML = rows.map(function (row, index) {
                return (
                    '<tr data-index="' + index + '">' +
                    '<td><input type="text" class="planner-cell" data-field="task" value="' + escapeAttr(row.task) + '" placeholder="Task name"></td>' +
                    '<td><input type="date" class="planner-cell" data-field="due" value="' + escapeAttr(row.due) + '"></td>' +
                    '<td><select class="planner-cell" data-field="priority">' +
                    priorityOptions(row.priority) +
                    '</select></td>' +
                    '<td><select class="planner-cell" data-field="status">' +
                    statusOptions(row.status) +
                    '</select></td>' +
                    '<td><input type="text" class="planner-cell" data-field="notes" value="' + escapeAttr(row.notes) + '" placeholder="Notes"></td>' +
                    '<td><button type="button" class="btn-small remove-planner-row" aria-label="Remove row">✕</button></td>' +
                    '</tr>'
                );
            }).join('');

            tbody.querySelectorAll('.planner-cell').forEach(function (cell) {
                cell.addEventListener('input', onCellChange);
                cell.addEventListener('change', onCellChange);
            });

            tbody.querySelectorAll('.remove-planner-row').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    const index = parseInt(e.target.closest('tr').dataset.index, 10);
                    if (rows.length <= 1) {
                        rows[0] = { task: '', due: '', priority: '', status: '', notes: '' };
                    } else {
                        rows.splice(index, 1);
                    }
                    persist();
                    renderRows();
                });
            });
        }

        function onCellChange(e) {
            const tr = e.target.closest('tr');
            const index = parseInt(tr.dataset.index, 10);
            const field = e.target.dataset.field;
            rows[index][field] = e.target.value;
            persist();
        }

        function priorityOptions(selected) {
            const opts = ['', 'High', 'Medium', 'Low'];
            return opts.map(function (opt) {
                const label = opt || 'Priority';
                return '<option value="' + opt + '"' + (opt === selected ? ' selected' : '') + '>' + label + '</option>';
            }).join('');
        }

        function statusOptions(selected) {
            const opts = ['', 'Not started', 'In progress', 'Done'];
            return opts.map(function (opt) {
                const label = opt || 'Status';
                return '<option value="' + opt + '"' + (opt === selected ? ' selected' : '') + '>' + label + '</option>';
            }).join('');
        }

        if (addBtn) {
            addBtn.addEventListener('click', function () {
                rows.push({ task: '', due: '', priority: '', status: '', notes: '' });
                persist();
                renderRows();
            });
        }

        renderRows();
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
