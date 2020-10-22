const transformExampleNode = node => {
  const codeWithGroups = node.value;

  const groupsInfo = fullTrim(codeWithGroups)
    // `//// example-name`
    .split(/\/\/\/\/ *(.+)/);
  groupsInfo.shift();

  const tabs = [];

  for (let i = 0; i < groupsInfo.length; i += 2) {
    const label = groupsInfo[i];
    const value = label;
    const content = groupsInfo[i + 1].trim();

    tabs.push({ label, value, content });
  }

  const defaultTab = tabs[0].value;

  return [
    {
      type: 'jsx',
      value: `
        <Tabs 
          groupId="examples"
          defaultValue="${defaultTab}"
          values={[${tabs
            .map(tab => {
              return `{ label: '${tab.label}', value: '${tab.value}' }`;
            })
            .join(', ')}]}
        >
      `,
    },
    ...tabs
      .map(tab => {
        return [
          {
            type: 'jsx',
            value: `<TabItem value="${tab.value}">`,
          },
          {
            type: node.type,
            lang: node.lang,
            value: tab.content,
            meta: node.meta.replace('examples', '').trim(),
          },
          {
            type: 'jsx',
            value: `</TabItem>`,
          },
        ];
      })
      .flat(),
    {
      type: 'jsx',
      value: '</Tabs>',
    },
  ];
};

function hasTabsImported(rootNode) {
  return rootNode.children.some(child => {
    return child.type === 'import' && child.value.includes('@theme/Tabs');
  });
}

const matchExamplesNode = node => {
  return node.type === 'code' && node.meta && node.meta.includes('examples');
};

const importTabsNode = {
  type: 'import',
  value: fullTrim(`
    import Tabs from '@theme/Tabs';
    import TabItem from '@theme/TabItem';
  `),
};

module.exports = () => {
  let hasAnyExampleNode = false;
  const transformer = node => {
    if (matchExamplesNode(node)) {
      hasAnyExampleNode = true;
      return transformExampleNode(node);
    }
    if (Array.isArray(node.children)) {
      let index = 0;
      while (index < node.children.length) {
        const result = transformer(node.children[index]);
        if (result) {
          node.children.splice(index, 1, ...result);
          index += result.length;
        } else {
          index += 1;
        }
      }
    }
    if (node.type === 'root' && hasAnyExampleNode && !hasTabsImported(node)) {
      node.children.unshift(importTabsNode);
    }
    return null;
  };
  return transformer;
};

function fullTrim(input) {
  return input.replace(/^\s+|\s+$/g, '');
}
