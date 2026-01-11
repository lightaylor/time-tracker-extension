let viewDate = new Date();
let currentDay = new Date().getDate();
let timerInterval;

function getLocalDay(dateObj) {
    const offset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj - offset).toISOString().split('T')[0];
}

function makeDateStr(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatToHHMM(totalHours) {
    const totalMinutes = Math.round(totalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return h === 0 ? `${m}m` : `${h}:${String(m).padStart(2, '0')}`;
}

function filterLogs(logs) {
    const now = new Date();
    const oneYearAgo = new Date().setFullYear(now.getFullYear() - 1);
    const oneYearLater = new Date().setFullYear(now.getFullYear() + 1);
    return logs.filter(log => {
        const logDate = new Date(log.date).getTime();
        return logDate >= oneYearAgo && logDate <= oneYearLater;
    });
}

function updateDisplay() {
    chrome.storage.local.get(["startTime", "isRunning"], (data) => {
        if (data.isRunning && data.startTime) {
            const diff = Date.now() - data.startTime;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            document.getElementById('timerDisplay').innerText =
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    });
}

document.getElementById('startBtn').onclick = () => {
    chrome.storage.local.set({ startTime: Date.now(), isRunning: true }, () => {
        clearInterval(timerInterval);
        timerInterval = setInterval(updateDisplay, 1000);
    });
};

document.getElementById('stopBtn').onclick = () => {
    chrome.storage.local.get(["startTime", "isRunning"], (data) => {
        if (data.isRunning && data.startTime) {
            clearInterval(timerInterval);
            const hours = (Date.now() - data.startTime) / 3600000;
            const todayStr = getLocalDay(new Date());
            chrome.storage.local.get({ logs: [] }, (storage) => {
                let logs = storage.logs || [];
                logs.push({ id: Date.now(), date: todayStr, hours: hours });
                chrome.storage.local.set({ logs: filterLogs(logs), isRunning: false, startTime: null }, () => {
                    document.getElementById('timerDisplay').innerText = "00:00:00";
                    render();
                });
            });
        }
    });
};

document.getElementById('manualSaveBtn').onclick = () => {
    const val = parseFloat(document.getElementById('manualHours').value);
    const targetDate = makeDateStr(viewDate.getFullYear(), viewDate.getMonth(), currentDay);
    chrome.storage.local.get({ logs: [] }, (data) => {
        let logs = data.logs.filter(l => l.date !== targetDate);
        if (val > 0) logs.push({ id: Date.now(), date: targetDate, hours: val });
        chrome.storage.local.set({ logs: filterLogs(logs) }, () => render());
    });
};

function render() {
    chrome.storage.local.get({ logs: [] }, (data) => {
        const logs = data.logs || [];
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        let monthlyTotal = 0;

        document.getElementById('currentMonthLabel').innerText = `${String(month + 1).padStart(2, '0')}. ${year}`;
        document.getElementById('selectedDateLabel').innerText = makeDateStr(year, month, currentDay);

        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';

        ['S','M','T','W','T','F','S'].forEach(d => {
            const el = document.createElement('div');
            el.className = 'day-header'; el.innerText = d; grid.appendChild(el);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();
        if (currentDay > lastDate) currentDay = lastDate;

        for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

        for (let i = 1; i <= lastDate; i++) {
            const dateStr = makeDateStr(year, month, i);
            const daySum = logs.filter(l => l.date === dateStr).reduce((s, r) => s + r.hours, 0);
            monthlyTotal += daySum;

            const dayEl = document.createElement('div');
            dayEl.className = `calendar-day ${daySum > 0.008 ? 'active' : ''} ${i === currentDay ? 'selected' : ''}`;
            dayEl.innerHTML = `<span class="day-num">${i}</span>${daySum > 0.008 ? `<span class="day-hours">${formatToHHMM(daySum)}</span>` : ''}`;
            dayEl.onclick = () => { currentDay = i; render(); };
            grid.appendChild(dayEl);
        }
        document.getElementById('monthlyTotal').innerText = formatToHHMM(monthlyTotal);
    });
}

document.getElementById('prevMonth').onclick = () => { viewDate.setMonth(viewDate.getMonth() - 1); render(); };
document.getElementById('nextMonth').onclick = () => { viewDate.setMonth(viewDate.getMonth() + 1); render(); };

document.addEventListener('DOMContentLoaded', () => {
    render();
    updateDisplay();
    setInterval(updateDisplay, 1000);
});