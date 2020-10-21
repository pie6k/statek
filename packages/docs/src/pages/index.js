import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const features = [
  {
    title: 'Declarative data',
    imageUrl: 'img/undraw_docusaurus_mountain.svg',
    description: (
      <>
        Statek connects reactive data reactions with declarative style of
        expressing desired results inspired by react.
      </>
    ),
  },
  {
    title: 'Read asyns data using sync functions',
    imageUrl: 'img/undraw_docusaurus_tree.svg',
    description: (
      <>
        It is possible to read async selectors data in sync-like way inside
        store reactions and react components
      </>
    ),
  },
  {
    title: 'No boilerplate',
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        It is nearly trivial to start working with statek. Data store created
        with statek works like plain js-object.
      </>
    ),
  },
  {
    title: 'Non-react suspense mode',
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Inspired by react suspense - the same thing is possible inside store
        change reactions, allowing easy access to async data
      </>
    ),
  },
  {
    title: 'Works with or without React',
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Most of the concepts of Statek works nearly identical inside or outside
        of react world.
      </>
    ),
  },
  {
    title: 'Data (async) selectors',
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Use selectors to perform expensive calculations or async requestes and
        reuse results multiple times.
      </>
    ),
  },
];

function Feature({ imageUrl, title, description }) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={clsx('col col--4', styles.feature)}>
      {/* {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )} */}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const logoUrl = useBaseUrl('img/statek-logo-transparent.png');

  const { siteConfig = {} } = context;
  return (
    <Layout
      title={`${siteConfig.tagline}`}
      description="Description will go into a meta tag in <head />"
    >
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <img src={logoUrl} className={clsx(styles.logo)} />
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className={clsx(
                'button button--outline button--secondary button--lg',
                styles.getStarted,
              )}
              to={useBaseUrl('docs/')}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main>
        {features && features.length > 0 && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

export default Home;
