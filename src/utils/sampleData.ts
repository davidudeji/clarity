// =========================================
// CLARITY — Sample/Demo Data
// =========================================

import type { Document, Concept, ResearchNote } from '../types';

export const sampleDocument: Document = {
  id: 'doc-1',
  name: 'Deep Work — Cal Newport.pdf',
  type: 'pdf',
  uploadedAt: new Date('2024-10-20'),
  progress: 34,
  totalPages: 296,
  currentPage: 101,
  outline: [
    { id: 'o1', level: 1, title: 'Introduction', sectionId: 's-intro' },
    { id: 'o2', level: 1, title: 'Part 1: The Idea', sectionId: 's-p1' },
    { id: 'o3', level: 2, title: 'Deep Work Is Valuable', sectionId: 's-p1-1' },
    { id: 'o4', level: 2, title: 'Deep Work Is Rare', sectionId: 's-p1-2' },
    { id: 'o5', level: 2, title: 'Deep Work Is Meaningful', sectionId: 's-p1-3' },
    { id: 'o6', level: 1, title: 'Part 2: The Rules', sectionId: 's-p2' },
    { id: 'o7', level: 2, title: 'Rule #1: Work Deeply', sectionId: 's-p2-1' },
    { id: 'o8', level: 2, title: 'Rule #2: Embrace Boredom', sectionId: 's-p2-2' },
    { id: 'o9', level: 2, title: 'Rule #3: Quit Social Media', sectionId: 's-p2-3' },
    { id: 'o10', level: 2, title: 'Rule #4: Drain the Shallows', sectionId: 's-p2-4' },
  ],
  content: [
    {
      id: 's-p2-1',
      title: 'Rule #1: Work Deeply',
      level: 2,
      paragraphs: [
        {
          id: 'p1',
          text: 'You have a finite amount of willpower that becomes depleted as you use it. Your will, in other words, is not a manifestation of your character that you can deploy without limit; it\'s instead like a muscle that tires.',
        },
        {
          id: 'p2',
          text: 'This reality explains why the professional habits of people like Jung and Caro make sense beyond their surface appeal of quaintness: they\'re not pretending to be characters from another era but are instead protecting themselves from the will-sapping forces of distraction that exist in the modern professional context.',
          isHighlight: true,
        },
        {
          id: 'p3',
          text: 'The key to developing a deep work habit is to move beyond good intentions and add routines and rituals to your working life designed to minimize the amount of your limited willpower necessary to transition into and maintain a state of unbroken concentration.',
        },
        {
          id: 'p4',
          text: 'The type of work that optimizes your performance is deep work. If you\'re not comfortable with deep work, you\'ll struggle to learn hard things, and if you can\'t learn hard things quickly, you\'ll struggle to remain valuable in our economy.',
        },
        {
          id: 'p5',
          text: 'The four disciplines of execution provide a useful framework here. They suggest you should focus on the wildly important, act on the lead measures, keep a compelling scoreboard, and create a cadence of accountability.',
        },
      ],
    },
    {
      id: 's-p2-2',
      title: 'Rule #2: Embrace Boredom',
      level: 2,
      paragraphs: [
        {
          id: 'p6',
          text: 'The ability to concentrate intensely is a skill that must be trained. Efforts to deepen your focus will struggle if you don\'t simultaneously wean your mind from a dependence on distraction.',
        },
        {
          id: 'p7',
          text: 'If every moment of potential boredom in your life — say, having to wait five minutes in line or sit alone in a restaurant until a friend arrives — is relieved with a quick glance at your smartphone, then your brain has likely been rewired to a point where it\'s not ready for deep work — even if you regularly schedule time to practice this skill.',
        },
      ],
    },
  ],
};

export const sampleConcepts: Concept[] = [
  {
    id: 'c1',
    documentId: 'doc-1',
    quote: 'You have a finite amount of willpower that becomes depleted as you use it.',
    title: 'Willpower as a Finite Resource',
    explanation: 'Newport draws on ego depletion research to argue that willpower is a muscle — it fatigues with use. This means scheduling deep work early in the day, before your decision-making capacity degrades, is architecturally important, not merely practical.',
    knowledgeState: 'explained',
    tags: ['willpower', 'cognitive-science', 'productivity'],
    createdAt: new Date('2024-10-21'),
    question: 'Does the ego depletion research actually hold up? What replications say?',
  },
  {
    id: 'c2',
    documentId: 'doc-1',
    quote: 'The key to developing a deep work habit is to move beyond good intentions and add routines and rituals.',
    title: 'Rituals as Willpower Conservation',
    explanation: 'By converting deep work into a ritual, you remove the need to make a fresh decision each time. The pre-commitment eliminates the "should I start now?" decision cost, preserving cognitive resources for the actual work.',
    knowledgeState: 'recalled',
    tags: ['habits', 'rituals', 'deep-work'],
    createdAt: new Date('2024-10-22'),
  },
  {
    id: 'c3',
    documentId: 'doc-1',
    quote: 'Efforts to deepen your focus will struggle if you don\'t simultaneously wean your mind from a dependence on distraction.',
    title: 'Distraction Tolerance as a Trainable Skill',
    explanation: 'Focus isn\'t just about allocating more time to concentration — it requires training the nervous system to tolerate the discomfort of not being stimulated. The boredom embrace is itself the training, not just a side effect.',
    knowledgeState: 'applied',
    tags: ['focus', 'attention', 'habit-formation'],
    createdAt: new Date('2024-10-23'),
  },
];

export const sampleResearch: ResearchNote[] = [
  {
    id: 'r1',
    conceptId: 'c1',
    documentId: 'doc-1',
    question: 'Does ego depletion research replicate?',
    source: 'Hagger et al. 2016 — pre-registered multi-site replication',
    notes: 'The large-scale replication study found weak or null effects for ego depletion across most sites. The concept is contested. However, the practical observation — that willpower fluctuates throughout the day — has separate support from decision fatigue literature (Danziger et al., 2011). Newport\'s advice stands on pragmatic grounds even if the mechanistic theory is weaker than presented.',
    createdAt: new Date('2024-10-22'),
  },
  {
    id: 'r2',
    conceptId: 'c2',
    documentId: 'doc-1',
    question: 'What is the neurological basis for habit formation vs. willpower use?',
    source: 'Ann Graybiel — MIT Picower Institute on Habit Learning',
    notes: 'Habits are encoded in basal ganglia as chunked routines. Once a habit is formed, the prefrontal cortex offloads execution — this is why habitualized behaviors feel automatic. Newport\'s "rituals" advice aligns with this: converting startup routines into habits reduces the prefrontal load at session-start.',
    createdAt: new Date('2024-10-23'),
  },
];
