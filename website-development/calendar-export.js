// Export OpenTrackr tasks as .ics for Google, Outlook, Apple, and other calendar apps
window.OpenTrackrCalendar = {
    TASKS_KEY: 'taskTracker_tasks',

    loadTasks: function () {
        try {
            var raw = localStorage.getItem(this.TASKS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    },

    escapeICS: function (text) {
        return String(text || '')
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    },

    toICSDate: function (dateInput) {
        var d = new Date(dateInput);
        if (isNaN(d.getTime())) return null;

        var pad = function (n) {
            return String(n).padStart(2, '0');
        };

        return (
            d.getFullYear() +
            pad(d.getMonth() + 1) +
            pad(d.getDate()) +
            'T' +
            pad(d.getHours()) +
            pad(d.getMinutes()) +
            pad(d.getSeconds())
        );
    },

    buildICS: function (tasks) {
        var lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//OpenTrackr//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:OpenTrackr Tasks'
        ];

        tasks
            .filter(function (task) {
                return task.dueDate && !task.completed;
            })
            .forEach(function (task) {
                var start = OpenTrackrCalendar.toICSDate(task.dueDate);
                if (!start) return;

                var endDate = new Date(task.dueDate);
                endDate.setHours(endDate.getHours() + 1);
                var end = OpenTrackrCalendar.toICSDate(endDate.toISOString());

                lines.push('BEGIN:VEVENT');
                lines.push('UID:' + task.id + '@opentrackr.local');
                lines.push('DTSTAMP:' + OpenTrackrCalendar.toICSDate(new Date().toISOString()));
                lines.push('DTSTART:' + start);
                lines.push('DTEND:' + end);
                lines.push('SUMMARY:' + OpenTrackrCalendar.escapeICS(task.title));

                var description = task.description || '';
                if (task.category) {
                    description = (description ? description + '\\n\\n' : '') + 'Category: ' + task.category;
                }
                if (description) {
                    lines.push('DESCRIPTION:' + OpenTrackrCalendar.escapeICS(description));
                }

                lines.push('END:VEVENT');
            });

        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
    },

    exportTasks: function () {
        var tasks = this.loadTasks();
        var exportable = tasks.filter(function (task) {
            return task.dueDate && !task.completed;
        });

        if (exportable.length === 0) {
            return {
                ok: false,
                message: 'No tasks with due dates to export yet. Add tasks on the Task Tracker first.'
            };
        }

        var ics = this.buildICS(tasks);
        var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'opentrackr-tasks.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return {
            ok: true,
            count: exportable.length,
            message: 'Downloaded ' + exportable.length + ' task(s). Import the file into your calendar app.'
        };
    },

    getProviderLabel: function (provider) {
        var labels = {
            google: 'Google Calendar',
            outlook: 'Microsoft Outlook',
            apple: 'Apple Calendar',
            other: 'your calendar app'
        };
        return labels[provider] || labels.other;
    },

    getImportHelp: function (provider) {
        var helps = {
            google: 'Google Calendar: Settings → Import & export → Import, then choose opentrackr-tasks.ics.',
            outlook: 'Outlook: File → Open & export → Import/Export → Import an iCalendar (.ics) file.',
            apple: 'Apple Calendar: double-click the .ics file, or use File → Import.',
            other: 'Open the .ics file with your calendar app, or use its Import option.'
        };
        return helps[provider] || helps.other;
    }
};
