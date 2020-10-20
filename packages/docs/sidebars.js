const fs = require('fs');

console.log(fs);

module.exports = {
  core: {
    Introduction: [
      'core/introduction/home',
      'core/introduction/motivation',
      'core/introduction/installation',
      'core/introduction/concepts',
    ],
    'Getting Started': [
      'core/getting-started/intro',
      'core/getting-started/store',
      'core/getting-started/watching',
      'core/getting-started/selectors',
    ],
    Advanced: [
      'core/advanced/async-selectors',
      'core/advanced/warm-selectors',
      'core/advanced/async-watch',
      'core/advanced/caveats',
      'core/advanced/manual-watch',
      'core/advanced/watch-all-changes',
      'core/advanced/optimizations',
    ],
  },
  react: [
    'react/introduction',
    'react/view',
    'react/using-selectors',
    'react/hooks',
    'react/3rd-party',
  ],
};
