import { unstable_batchedUpdates } from 'react-dom';

const taskQueue = new Set<() => any>();

export const scheduler = {
  isOn: false,
  add(task: () => any) {
    if (scheduler.isOn) {
      taskQueue.add(task);
    } else {
      task();
    }
  },
  flush() {
    if (!taskQueue.size) {
      return;
    }

    const tasks = Array.from(taskQueue);
    taskQueue.clear();
    setTimeout(() => {
      unstable_batchedUpdates(() => {
        tasks.forEach(task => task());
      });
    }, 0);
  },
  on() {
    scheduler.isOn = true;
  },
  off() {
    scheduler.isOn = false;
  },
};
