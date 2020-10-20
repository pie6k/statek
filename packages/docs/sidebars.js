const fs = require('fs');

console.log(fs);

module.exports = {
  mainSidebar: {
    Introduction: [
      'introduction/home',
      'introduction/motivation',
      'introduction/installation',
      'introduction/concepts',
    ],
    'Getting Started': [
      'getting-started/intro',
      'getting-started/store',
      'getting-started/watching',
      'getting-started/selectors',
    ],
    Advanced: [
      'advanced/async-selectors',
      'advanced/async-watch',
      'advanced/warm-selectors',
      'advanced/manual-watch',
      'advanced/watch-selected',
      'advanced/optimizations',
    ],
    React: [
      'react/view',
      'react/use-watch',
      'react/utility-hooks',
      'react/3rd-party',
    ],
  },
};
