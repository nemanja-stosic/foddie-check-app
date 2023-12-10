//reminderWorker.js enables app to run in background and send notifitications even when phone is locked.

let isReminderOn = false;
let timerId;

self.addEventListener("message", (event) => {
  if (event.data === "startReminder") {
    isReminderOn = true;
    startReminder();
  } else if (event.data === "stopReminder") {
    isReminderOn = false;
    stopReminder();
  }
});

function startReminder() {
  const interval = 180000; // 3 minutes || 180000
  timerId = setInterval(() => {
    if (isReminderOn) {
      self.postMessage("sendNotification");
    } else {
      clearInterval(timerId);
    }
  }, interval);
}

function stopReminder() {
  clearInterval(timerId);
}

self.postMessage("workerReady");
