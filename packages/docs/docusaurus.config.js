const themeConfig = {
  googleAnalytics: {
    trackingID: 'G-TQHX49NXGR',
  },
  gtag: {
    trackingID: 'G-TQHX49NXGR',
  },
  image: 'img/ogimage.png',``
  navbar: {
    title: 'Statek',
    logo: {
      alt: 'Statek Logo',
      src: 'img/statek-logo-transparent.png',
    },
    items: [
      {
        to: 'docs',
        activeBasePath: 'docs',
        label: 'Docs',
        position: 'left',
      },

      {
        href: 'https://github.com/pie6k/statek',
        label: 'GitHub',
        position: 'right',
      },
    ],
  },
  footer: {
    // style: 'dark',
    links: [
      {
        title: 'Docs',
        items: [
          {
            label: 'Read the docs',
            to: 'docs/',
          },
          {
            label: 'Api reference',
            to: 'docs/api/statek',
          },
          {
            label: 'Api reference - React',
            to: 'docs/api/statek-react',
          },
        ],
      },
      {
        title: 'Community',
        items: [
          {
            label: 'Stack Overflow',
            href: 'https://stackoverflow.com/questions/tagged/statek',
          },
          {
            label: 'Discord',
            href: 'https://discord.gg/HpCJKka',
          },
        ],
      },
      {
        title: 'Source',
        items: [
          {
            label: 'GitHub',
            href: 'https://github.com/pie6k/statek',
          },
        ],
      },
    ],
    copyright: `Copyright © ${new Date().getFullYear()} Statek. Created by Adam Pietrasiak. Docs built with Docusaurus.`,
  },
};

module.exports = {
  title: 'Statek',
  tagline: 'Delightful state management library',
  url: 'https://statek.dev',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/statek-logo-transparent.png',
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'statek', // Usually your repo name.
  themeConfig,
  plugins: ['docusaurus-plugin-sass'],
  // themes: ['@docusaurus/theme-live-codeblock'],
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/pie6k/statek/packages/docs/',
          remarkPlugins: [
            require('@docusaurus/remark-plugin-npm2yarn'),
            require('./src/plugins/examples'),
          ],
        },

        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl: 'https://github.com/pie6k/statek/packages/docs/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.scss'),
        },
      },
    ],
  ],
};
