/**
 * Everything that differs between the documentation sites of the organisation.
 *
 * The site follows aiviarium/docs-base. This file and public/brand/ hold what is
 * Nocturne's; the values below describe Nocturne.
 */

export interface NavLink {
  text: string;
  url: string;
  /** Opens outside the site. Links that start with http are external anyway. */
  external?: boolean;
}

export interface Feature {
  title: string;
  description: string;
  url?: string;
}

/** One image in a dark and a light version, as paths under public/. */
export interface Themed {
  dark: string;
  light: string;
}

export interface DocsConfig {
  /** The name in title case, as it appears in prose: "Hatchery". */
  name: string;
  /** The lowercase name used in URLs, packages and commands: "hatchery". */
  slug: string;
  /** One sentence, shown under the wordmark and in the page metadata. */
  description: string;
  /** The area after "Aiviarium /" in the small label above the wordmark. */
  area: string;
  /** The project colour. `light` is the darker tone that passes 4.5:1 on white. */
  colour: Themed;
  /** The repository, linked from the header and the "Edit on GitHub" links. */
  repo: string;
  /** The folder of the docs inside the repository, for "Edit on GitHub". */
  repoDocsPath: string;
  /**
   * The badge beside the name in the header, such as the version. Drawn like the
   * organisation's badges: the label on a dark field, the value on the project
   * colour. Leave it out to hide it.
   */
  chip?: { label: string; value: string };
  /**
   * Badges from the organisation's badge endpoint, shown on the landing page and
   * in the README.
   */
  badges: {
    /** The badge endpoint. */
    host: string;
    /** The file name of a GitHub Actions workflow, for a CI badge. */
    ci?: string;
    /** Show the latest GitHub release. */
    release?: boolean;
  };
  install: {
    label: string;
    command: string;
  };
  /** The two buttons under the description. The first one is outlined in the project colour. */
  actions: [NavLink, NavLink];
  assets: {
    /** The detailed icon, shown at 128 px on the landing page. */
    icon: Themed;
    /** The `-icon` file, drawn for 24 to 48 px, used in the header lockup. */
    navIcon: Themed;
    /** The `-16` file, drawn on the pixel grid for 16 px: the favicon. */
    favicon: Themed;
    /** The faceted wordmark, for word sizes of 24 px and above. */
    wordmark: Themed;
    /** The plain wordmark in `currentColor` (`-mono`), for the 18 px header lockup. */
    wordmarkSolid: string;
  };
  /** Links in the header, after the name. */
  nav: NavLink[];
  /** Cards on the landing page. Leave the list empty to hide them. */
  features: Feature[];
}

const config: DocsConfig = {
  name: 'Nocturne',
  slug: 'nocturne',
  description: 'A dark-first design system for dense tool interfaces, with its SolidJS components.',
  area: 'Design system',
  // Iris, Nocturne's default accent family.
  colour: { dark: '#8F8FFA', light: '#4A4AC8' },
  repo: 'https://github.com/aiviarium/nocturne',
  repoDocsPath: 'site/content/docs',
  chip: { label: 'version', value: 'v0.1' },
  badges: {
    host: 'https://aiviarium-badges.helight.workers.dev',
    ci: 'ci.yml',
  },
  install: {
    label: 'Add it from a checkout',
    command: 'bun add solid-js @aiviarium/nocturne@file:../nocturne',
  },
  actions: [
    { text: 'Get started', url: '/docs' },
    { text: 'Which part for what', url: '/docs/parts' },
  ],
  assets: {
    icon: { dark: '/brand/nocturne.svg', light: '/brand/nocturne-light.svg' },
    navIcon: { dark: '/brand/nocturne-icon.svg', light: '/brand/nocturne-icon-light.svg' },
    favicon: { dark: '/brand/nocturne-16.svg', light: '/brand/nocturne-16-light.svg' },
    wordmark: {
      dark: '/brand/nocturne-wordmark.svg',
      light: '/brand/nocturne-wordmark-light.svg',
    },
    wordmarkSolid: '/brand/nocturne-wordmark-mono.svg',
  },
  nav: [
    { text: 'Guide', url: '/docs' },
    { text: 'Tokens', url: '/docs/tokens' },
    { text: 'Parts', url: '/docs/parts' },
  ],
  features: [
    {
      title: 'Tokens',
      description: 'Colours for dark and light, type, spacing, radii, sizes and shadows.',
      url: '/docs/tokens',
    },
    {
      title: 'Which part for what',
      description: 'The part to use for each thing a view shows, with its sizes and rules.',
      url: '/docs/parts',
    },
    {
      title: 'Phones',
      description: 'Every part takes the compact phone scale by itself.',
      url: '/docs/phones',
    },
    {
      title: 'Live examples',
      description: 'The part pages show the components from the gallery, in the theme of the page.',
      url: '/docs/parts/actions',
    },
  ],
};

export default config;
