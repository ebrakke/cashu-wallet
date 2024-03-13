import type { Site, SocialObjects } from "./types";

export const SITE: Site = {
  website: "https://cashu.how", // replace this with your deployed domain
  author: "Erik Brakke",
  desc: "An interactive site to learn how to use cashu",
  title: "Cashu How",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: false,
  postPerPage: 3,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
};

export const LOCALE = {
  lang: "en", // html lang code. Set this empty and default will be "en"
  langTag: ["en-EN"], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46,
};

export const SOCIALS: SocialObjects = [
  {
    name: "Github",
    href: "https://github.com/cashubtc",
    linkTitle: ` ${SITE.title} on Github`,
    active: true,
  },
];
