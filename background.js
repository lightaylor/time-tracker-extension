chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onSuspend.addListener(() => {
    chrome.storage.local.get(["startTime", "isRunning", "logs"], (data) => {
        if (data.isRunning && data.startTime) {
            const durationMs = Date.now() - data.startTime;
            const hours = durationMs / 3600000;
            const today = new Date().toISOString().split('T')[0];

            const logs = data.logs || [];
            logs.push({ id: Date.now(), date: today, hours: hours });

            chrome.storage.local.set({
                logs: logs,
                isRunning: false,
                startTime: null
            });
        }
    });
});