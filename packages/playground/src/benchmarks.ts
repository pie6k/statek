// import { ReactionCallback } from '../src/observable';
// import { observable } from '../src/observable/observable';
// import { autoRun } from '../src/observable/observer';

// interface Row {
//   id: string;
//   index: number;
//   guid: string;
//   age: number;
//   eyeColor: string;
//   name: string;
//   company: string;
// }

// type Data = Row[];

// const data: Data = require('./data.json');

// declare global {
//   var b: any;
// }

// function measureTime(label: string) {
//   const start = Date.now();

//   function end() {
//     const end = Date.now();
//     const time = end - start;

//     console.info(`${label} - ${time}ms`);
//   }

//   return end;
// }

// function createBenchmark(
//   label: string,
//   process: (row: Row) => void,
//   setup?: (observable: Data, raw: Data) => (() => void) | undefined,
// ) {
//   function runWithInput(input: Data, subLabel: string) {
//     const end = measureTime(`${label} - ${subLabel}`);
//     input.forEach(process);
//     end();
//   }
//   function run() {
//     const observableData = observable(data);

//     const cleanSetup = setup?.(observableData, data);
//     runWithInput(data, 'Raw');
//     runWithInput(observable(data), 'Store');

//     cleanSetup?.();
//   }

//   return run;
// }

// createBenchmark('Read - No reactions', row => {
//   row.age;
//   row.eyeColor;
// });

// createBenchmark(
//   'Read - Reaction',
//   row => {
//     row.age;
//     row.eyeColor;
//   },
//   observable => {
//     autoRun(() => {
//       observable.forEach(row => {
//         row.age;
//       });
//     });
//   },
// );

// createBenchmark(
//   'Write - Reaction - No Scheduler',
//   row => {
//     row.age = Math.random();
//     row.index = Math.random();
//   },
//   observable => {
//     const reaction = autoRun(() => {
//       observable.forEach(row => {
//         row.age;
//         row.index;
//       });
//     });

//     return () => {
//       reaction.unsubscribe();
//     };
//   },
// );

// document.getElementById('run')?.addEventListener('click', () => {
//   console.log('a');
//   run();
// });

// export const run = createBenchmark(
//   'Write - Reaction - Scheduler',
//   row => {
//     JSON.stringify(row);
//     row.age = Math.random();
//     row.index = Math.random();
//   },
//   observable => {
//     const reaction = autoRun(
//       () => {
//         console.log('re');
//         observable.forEach(row => {
//           row.age;
//         });
//       },
//       { scheduler: createBasicScheduler() },
//     );

//     return () => {
//       reaction.unsubscribe();
//     };
//   },
// );

// type Timeout = ReturnType<typeof setTimeout>;

// function createBasicScheduler() {
//   const queueSet = new Set<ReactionCallback>();
//   let timeout: Timeout | null = null;

//   function enqueueFlush() {
//     if (timeout) {
//       return;
//     }

//     timeout = setTimeout(() => {
//       console.log('flush');
//       timeout = null;
//       const callbacks = Array.from(queueSet);
//       queueSet.clear();

//       callbacks.forEach(callback => {
//         callback();
//       });
//     }, 0);
//   }

//   return function schedule(reaction: ReactionCallback) {
//     queueSet.add(reaction);
//     enqueueFlush();
//   };
// }
