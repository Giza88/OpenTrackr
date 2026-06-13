/**
 * OpenTrackr home page — interactive "Why Planning Works" gallery
 */
(function () {
    const topics = {
        'daily-desk': {
            title: 'Daily Planning at Your Desk',
            intro: 'A short daily planning ritual at your desk sets the tone for a focused, less stressful day.',
            tips: [
                'Spend 5–10 minutes each morning before checking email or social media.',
                'Write your top three priorities where you can see them all day.',
                'Divide your day into blocks: deep work, admin tasks, and personal time.',
                'Keep your workspace tidy — a clear desk helps you think clearly.',
                'End the day by noting one win and tomorrow\'s first task.'
            ],
            action: { label: 'Try the daily planner', href: 'tracker.html#calendar' }
        },
        'weekly-calendar': {
            title: 'Weekly Calendar Overview',
            intro: 'Seeing your whole week at a glance helps you balance commitments and avoid overload.',
            tips: [
                'Review your calendar every Sunday evening or Monday morning.',
                'Colour-code events by type: work, study, health, and social.',
                'Leave empty gaps between meetings for breaks and unexpected tasks.',
                'Block time for your most important work before filling in smaller tasks.',
                'Compare your calendar with your task list so nothing slips through.'
            ],
            action: { label: 'Open your calendar', href: 'tracker.html#calendar' }
        },
        'focused-work': {
            title: 'Focused Work Sessions',
            intro: 'Deep focus sessions produce better results than constant task-switching.',
            tips: [
                'Silence notifications during focus blocks — even brief pings break concentration.',
                'Try the Pomodoro technique: 25 minutes of work, then a 5-minute break.',
                'Work on one task at a time until it is done or you reach a natural stopping point.',
                'Define what "finished" looks like before you start, so you know when to stop.',
                'Step away for a proper lunch break — your afternoon focus will thank you.'
            ],
            action: { label: 'Add a focus task', href: 'tracker.html#calendar' }
        },
        'digital-tasks': {
            title: 'Track Tasks Digitally',
            intro: 'A digital task list keeps everything in one place and easy to update on the go.',
            tips: [
                'Capture tasks the moment they come to mind — do not rely on memory.',
                'Group tasks by context: calls, emails, errands, or study blocks.',
                'Add due dates even to small tasks so they do not pile up unnoticed.',
                'Review your list at the start and end of each day.',
                'Use OpenTrackr\'s quick to-do list and task planner on the tracker page.'
            ],
            action: { label: 'Go to task tracker', href: 'tracker.html#calendar' }
        },
        'stay-on-track': {
            title: 'Stay on Track with OpenTrackr',
            intro: 'Consistent habits beat perfect plans. OpenTrackr helps you build a routine that sticks.',
            tips: [
                'Plan at the same time each day so it becomes automatic.',
                'Celebrate completed tasks — small wins build long-term momentum.',
                'Adjust your plan when life changes; flexibility beats rigid schedules.',
                'Combine the calendar, daily planner, and task planner for a full picture.',
                'Register to save your preferences and keep your planning personal.'
            ],
            action: { label: 'Create an account', href: 'register.html' }
        }
    };

    document.addEventListener('DOMContentLoaded', initHomeGallery);

    function initHomeGallery() {
        const modal = document.getElementById('tipsModal');
        const cards = document.querySelectorAll('.gallery-card');
        if (!modal || !cards.length) return;

        const closeBtn = document.getElementById('closeTipsModal');
        const titleEl = document.getElementById('tipsModalTitle');
        const introEl = document.getElementById('tipsModalIntro');
        const listEl = document.getElementById('tipsModalList');
        const actionEl = document.getElementById('tipsModalAction');
        let previousFocus = null;

        cards.forEach(function (card) {
            card.addEventListener('click', function () {
                openTips(card.dataset.topic);
            });
        });

        closeBtn.addEventListener('click', closeTips);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeTips();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeTips();
        });

        function openTips(topicId) {
            const topic = topics[topicId];
            if (!topic) return;

            titleEl.textContent = topic.title;
            introEl.textContent = topic.intro;
            listEl.innerHTML = topic.tips.map(function (tip) {
                return '<li>' + escapeHtml(tip) + '</li>';
            }).join('');

            if (topic.action) {
                actionEl.href = topic.action.href;
                actionEl.textContent = topic.action.label;
                actionEl.classList.remove('hidden');
            } else {
                actionEl.classList.add('hidden');
            }

            previousFocus = document.activeElement;
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            closeBtn.focus();
        }

        function closeTips() {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            if (previousFocus && typeof previousFocus.focus === 'function') {
                previousFocus.focus();
            }
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
