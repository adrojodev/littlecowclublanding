import type { ImageMetadata } from 'astro';

import miniBriefsIcon from '../assets/projects/mini-briefs-icon.png';
import miniBriefs1 from '../assets/projects/mini-briefs-1.jpg';
import miniBriefs2 from '../assets/projects/mini-briefs-2.jpg';
import miniBriefs3 from '../assets/projects/mini-briefs-3.jpg';
import dineIcon from '../assets/projects/dine-icon.jpg';
import dine1 from '../assets/projects/dine-1.jpg';
import dine2 from '../assets/projects/dine-2.jpg';
import dine3 from '../assets/projects/dine-3.jpg';
import happyPlacesIcon from '../assets/projects/happy-places-icon.jpg';
import happyPlaces1 from '../assets/projects/happy-places-1.jpg';
import happyPlaces2 from '../assets/projects/happy-places-2.jpg';
import keepItShortIcon from '../assets/projects/keep-it-short-icon.png';
import keepItShortShare from '../assets/projects/keep-it-short-share.png';

export interface ProjectLink {
  label: string;
  href: string;
}

export interface ProjectShot {
  src: ImageMetadata;
  alt: string;
}

export interface Project {
  id: string;
  name: string;
  /** One line, in the product's own words. */
  tagline: string;
  /** Even shorter, for menus and the app list. */
  short: string;
  platform: string;
  year: string;
  status: string;
  about: string[];
  features: string[];
  links: ProjectLink[];
  /** App icon. `tile` is the colour behind icons that ship without one. */
  icon: { src: ImageMetadata; tile?: string; inset?: boolean };
  shots: ProjectShot[];
  /** `phone` = tall App Store captures, `wide` = landscape artwork. */
  shotShape: 'phone' | 'wide';
  note?: string;
}

export const projects: Project[] = [
  {
    id: 'mini-briefs',
    name: 'Mini Briefs',
    tagline: 'A little less scrolling. A little more understanding.',
    short: 'Daily news to read or listen to. Then it ends.',
    platform: 'Web & iOS',
    year: '2025–present',
    status: 'Live',
    about: [
      'Mini Briefs is a daily news product for the web and iPhone. It turns the day into short summaries you can read or listen to, in English and Spanish.',
      'The point is that it ends. Pick your sections, hear them back to back, and get on with your day.',
    ],
    features: [
      'A dated daily edition with a clear, finite scope',
      'Audio for every section, with the text following along',
      'Sections for Politics, Tech, Science, Mexico, Sports, AI, Business and Good News',
      'A personal “For You” brief built from your topics',
      'Daily games: Sudoku, Wordle and Word Soup',
      'Siri, widgets and Control Center playback',
    ],
    links: [
      { label: 'Open minibriefs.news', href: 'https://www.minibriefs.news/' },
      { label: 'App Store', href: 'https://apps.apple.com/app/mini-briefs/id6769941337' },
    ],
    icon: { src: miniBriefsIcon, tile: '#f97316', inset: true },
    shots: [
      { src: miniBriefs1, alt: 'Mini Briefs on iPhone: a Favorites edition with three sections and a Listen to all button' },
      { src: miniBriefs2, alt: 'Mini Briefs on iPhone: listening to a brief while the text follows along' },
      { src: miniBriefs3, alt: 'Mini Briefs on iPhone: the daily games' },
    ],
    shotShape: 'phone',
  },
  {
    id: 'dine',
    name: 'Dine',
    tagline: 'Shared expenses, in three seconds.',
    short: 'Personal and shared money, sorted on your iPhone.',
    platform: 'iOS',
    year: '2026–present',
    status: 'Live on the App Store',
    about: [
      'Dine is a native iPhone app for personal and shared finances. Adding an expense takes an amount and a description, nothing else.',
      'A model on the phone files each expense under the right budget. When it isn’t sure, the expense waits in an inbox instead of being guessed.',
    ],
    features: [
      'Budgets shared with a partner or a group over iCloud',
      'Trips with currency conversion',
      'Savings spaces with goals',
      'Subscriptions and purchases paid in installments',
      'Classification and summaries run on the device',
    ],
    links: [
      { label: 'App Store', href: 'https://apps.apple.com/us/app/dine/id6799501885' },
      { label: 'Visit the site', href: 'https://adrojodev.github.io/dine-site/' },
    ],
    icon: { src: dineIcon },
    shots: [
      { src: dine1, alt: 'Dine on iPhone: an overview of a trip, savings goals and budgets' },
      { src: dine2, alt: 'Dine on iPhone: adding an expense' },
      { src: dine3, alt: 'Dine on iPhone: a budget with its expenses' },
    ],
    shotShape: 'phone',
    note: 'Screens are shown in Spanish, as published.',
  },
  {
    id: 'happy-places',
    name: 'Happy Places',
    tagline: 'Every happy place on one map.',
    short: 'A map of the places you have been.',
    platform: 'iPhone & iPad',
    year: 'Since 2024',
    status: 'Live on the App Store',
    about: [
      'Happy Places is a map-first journal. Save the places that matter with an icon, a color, a story and photos, and they all live on one map.',
      'There is a bucket list too, for the places you haven’t reached yet.',
    ],
    features: [
      'Your photos become pins on the map',
      'A bucket list for where you’ll go next',
      'Save straight from Apple Maps or Google Maps',
      'Share a place as a postcard or a story',
      'Widgets, Siri and iCloud sync',
    ],
    links: [
      { label: 'App Store', href: 'https://apps.apple.com/app/happy-places-ive-been/id6478132857' },
      { label: 'Source on GitHub', href: 'https://github.com/adrojodev/Happy-Places' },
    ],
    icon: { src: happyPlacesIcon },
    shots: [
      { src: happyPlaces1, alt: 'Happy Places on iPhone: photo pins on a map of San Francisco' },
      { src: happyPlaces2, alt: 'Happy Places on iPhone: a list of visited places, each with a photo and a title' },
    ],
    shotShape: 'phone',
  },
  {
    id: 'keep-it-short',
    name: 'Keep it short',
    tagline: 'To short, or not to short?',
    short: 'Is today a shorts day? It checks.',
    platform: 'Web',
    year: '2023',
    status: 'Still running',
    about: [
      'Keep it short answers one question: should you wear shorts today? It reads the forecast where you are and lets an AI make the call.',
      'Made with Jules.',
    ],
    features: [
      'Uses the forecast for your location',
      'An AI decides: shorts or pants',
      'English and Spanish',
      'Installs to your home screen',
    ],
    links: [
      { label: 'Open keepitshort.xyz', href: 'https://www.keepitshort.xyz/' },
      { label: 'Source on GitHub', href: 'https://github.com/adrojodev/Keep-it-short' },
    ],
    icon: { src: keepItShortIcon, tile: '#ffffff' },
    shots: [{ src: keepItShortShare, alt: 'Keep it short artwork' }],
    shotShape: 'wide',
  },
];

/** Snowcut runs inside the site, so it is described here but rendered as an app. */
export const snowcut = {
  id: 'snowflakes',
  name: 'Snowflakes',
  short: 'A paper snowflake maker. It runs right here.',
  platform: 'Web',
};

export const contact = {
  email: 'ad_rojo@outlook.com',
  portfolio: 'https://www.adrojo.com/',
  github: 'https://github.com/adrojodev',
  linkedin: 'https://www.linkedin.com/in/david-hernández-45690112a',
  instagram: 'https://www.instagram.com/ad_rojo/',
};
