export const catalog = [
  {
    id: 'academic', label: 'Academic knowledge', short: 'Academic', icon: 'graduation',
    tagline: 'Build confidence in the classroom and beyond.', tone: 'violet',
    categories: [
      { id: 'mathematics', name: 'Mathematics', icon: 'calculator', color: 'violet', descriptor: 'From number sense to big ideas.', topics: ['Pre-Algebra & Elementary Math', 'Algebra I & II', 'Geometry & Trigonometry', 'Pre-Calculus & Calculus', 'Statistics & Data Analysis'] },
      { id: 'science', name: 'Science & Technology', icon: 'beaker', color: 'mint', descriptor: 'Explore how our world works.', topics: ['Biology: Life Sciences, Ecology & Genetics', 'Chemistry: Elements, Reactions & Atomic Structure', 'Physics: Motion, Energy, Electricity & Quantum Basics', 'Earth & Space Science: Geology, Astronomy & Meteorology', 'Computer Science: Coding, Web Logic & Digital Literacy'] },
      { id: 'language-arts', name: 'Language Arts & Communication', icon: 'pen', color: 'peach', descriptor: 'Find the words, make your case.', topics: ['Reading Comprehension & Literature Analysis', 'Essay Writing & Grammar Mastery', 'Vocabulary & Etymology', 'Public Speaking & Presentation Skills'] },
      { id: 'social-studies', name: 'Social Studies & History', icon: 'landmark', color: 'sky', descriptor: 'Understand people, place and time.', topics: ['World History & Ancient Civilizations', 'U.S. / National History & Civics', 'Geography & Culture', 'Economics & Government Systems'] },
    ],
  },
  {
    id: 'real-life', label: 'Real-world mastery', short: 'Real life', icon: 'compass',
    tagline: 'Get ready for the moments that matter.', tone: 'green',
    categories: [
      { id: 'finance', name: 'Personal Finance & Money', icon: 'wallet', color: 'mint', descriptor: 'Make money feel a little less mysterious.', topics: ['Budgeting 101 & Expense Tracking', 'Banking: Checking vs. Savings Accounts', 'Credit Scores, Credit Cards & Debt Management', 'Taxes & Paycheck Breakdown', 'Saving, Investing & Compound Interest Basics'] },
      { id: 'career', name: 'Career & Personal Productivity', icon: 'briefcase', color: 'peach', descriptor: 'Turn good intentions into real momentum.', topics: ['Resume & Portfolio Building', 'Job Interview Preparation & Soft Skills', 'Time Management, Goal Setting & Habit Building', 'Workplace Etiquette & Professional Email Writing'] },
      { id: 'health', name: 'Health, Wellness & Survival', icon: 'heart', color: 'rose', descriptor: 'Care for yourself and the people around you.', topics: ['Cooking Essentials, Nutrition & Meal Prep', 'Basic First Aid, CPR & Emergency Safety', 'Mental Health, Stress Relief & Mindfulness', 'Fitness, Exercise Routines & Personal Hygiene'] },
      { id: 'everyday', name: 'Everyday Life & Technical Skills', icon: 'laptop', color: 'sky', descriptor: 'Handle the practical stuff with confidence.', topics: ['Computer & Internet Safety: Privacy & Spotting Scams', 'DIY & Home Maintenance: Tool Safety & Fixes', 'Vehicle Maintenance: Tires, Fluids & Public Transit', 'Understanding Contracts, Rent & Basic Rights'] },
    ],
  },
];

export const topicCards = catalog.flatMap(path => path.categories.map(category => ({ ...category, pathId: path.id, pathLabel: path.label })));

export const featuredLessons = [
  { id: 'fractions', title: 'Fractions, made visual', topic: 'Pre-Algebra & Elementary Math', categoryId: 'mathematics', pathId: 'academic', icon: 'calculator', color: 'violet', level: 'Start here', duration: '8 min', progress: 35,
    intro: 'Fractions describe equal parts of a whole. A number line is a simple way to see their size before you calculate.',
    keyIdea: 'The denominator tells how many equal pieces make one whole. The numerator counts how many pieces you have.',
    steps: ['Draw one whole and split it into equal parts.', 'Shade the numerator number of parts.', 'To compare fractions, rewrite them with a shared denominator or compare their positions on a number line.'],
    question: 'Which fraction is equal to 1/2?', choices: ['2/4', '2/3', '3/5'], answer: 0, explanation: 'Two of four equal pieces is exactly half of the whole.' },
  { id: 'budgeting', title: 'Build your first budget', topic: 'Budgeting 101 & Expense Tracking', categoryId: 'finance', pathId: 'real-life', icon: 'wallet', color: 'mint', level: 'Everyday essential', duration: '10 min', progress: 0,
    intro: 'A budget is a plan for money coming in and money going out. It helps you make choices on purpose.',
    keyIdea: 'A simple starter split is 50% for needs, 30% for wants and 20% for saving or paying down debt. Adjust it to fit your real situation.',
    steps: ['Write down your take-home income for one month.', 'List fixed bills and estimate flexible costs.', 'Choose one goal for the money left over, then review the plan next month.'],
    question: 'Your take-home pay is $2,000. Using a 20% savings target, how much would you set aside?', choices: ['$200', '$400', '$600'], answer: 1, explanation: 'Twenty percent of $2,000 is $400. This is a starting guideline, not a rule.' },
  { id: 'emergency-ready', title: 'Stay ready in an emergency', topic: 'Basic First Aid, CPR & Emergency Safety', categoryId: 'health', pathId: 'real-life', icon: 'shield', color: 'peach', level: 'Preparedness', duration: '7 min', progress: 0,
    intro: 'A clear plan makes it easier to act safely when something unexpected happens. Know your local emergency number and where to find help.',
    keyIdea: 'Protect the scene first. Contact local emergency services for an immediate danger or serious injury, then follow the dispatcher’s directions.',
    steps: ['Pause and check that the area is safe for you to approach.', 'Call local emergency services when someone is in danger or seriously hurt.', 'Follow the dispatcher’s instructions and get certified first-aid and CPR training.'],
    question: 'A person is seriously hurt and the scene is safe. What is the best next step?', choices: ['Call local emergency services', 'Move them immediately in every case', 'Wait to see if the injury improves'], answer: 0, explanation: 'Dispatchers can guide you to appropriate help. Follow their instructions.' },
  { id: 'focus-sprint', title: 'Make time work for you', topic: 'Time Management, Goal Setting & Habit Building', categoryId: 'career', pathId: 'real-life', icon: 'target', color: 'sky', level: 'Quick win', duration: '6 min', progress: 0,
    intro: 'A tiny, specific plan is easier to start than a big, vague goal. Protect a short block of focused time and make the first action obvious.',
    keyIdea: 'Name one action, set a realistic start time and decide what “done” looks like before you begin.',
    steps: ['Choose one task that matters today.', 'Break it into a step small enough to begin in two minutes.', 'Work for 20 focused minutes, then take a short break and check your progress.'],
    question: 'Which is the clearest next action?', choices: ['Get better at school', 'Study more sometime', 'At 4 pm, review five vocabulary cards'], answer: 2, explanation: 'A time, specific action and finish line make the task easier to start.' },
];

export const formatOptions = [
  { id: 'quick-summaries', icon: 'sparkle', title: 'Quick summaries', text: 'Big ideas, straight to the point' },
  { id: 'visual-cheat-sheets', icon: 'grid', title: 'Visual cheat sheets', text: 'Learn with clear, memorable guides' },
  { id: 'practice-quizzes', icon: 'target', title: 'Practice quizzes', text: 'Lock it in by trying it yourself' },
];

export const goalOptions = [
  { id: 'school', icon: 'graduation', title: 'Boost my school grades', text: 'Feel prepared for class and exams' },
  { id: 'readiness', icon: 'compass', title: 'Feel ready for real life', text: 'Build practical, everyday confidence' },
  { id: 'quick-pickup', icon: 'sparkle', title: 'Pick up a new skill', text: 'Learn useful things at my own pace' },
  { id: 'curiosity', icon: 'globe', title: 'Follow my curiosity', text: 'Explore a bit of everything' },
];

export function findLesson(id) {
  const featured = featuredLessons.find(lesson => lesson.id === id || slug(lesson.topic) === id || slug(lesson.title) === id);
  if (featured) return featured;
  const topic = topicCards.flatMap(category => category.topics.map(title => ({ title, category }))).find(item => slug(item.title) === id);
  if (!topic) return featuredLessons[0];
  const { title, category } = topic;
  const pathId = category.pathId;
  const realLife = pathId === 'real-life';
  const keyIdea = realLife
    ? 'Build a small, repeatable plan, adapt it to your situation and ask a qualified person when the stakes are high.'
    : 'Start with the core idea, connect it to an example you already understand, then practise one step at a time.';
  return {
    id, title, topic: title, categoryId: category.id, pathId, icon: category.icon, color: category.color,
    level: realLife ? 'Real-world guide' : 'Study guide', duration: '8 min', progress: 0,
    intro: realLife
      ? `Explore ${title.toLowerCase()} with a practical guide you can adapt to your own goals and local context.`
      : `Build a stronger foundation in ${title.toLowerCase()} with one clear idea, a visual guide and a worked practice step.`,
    keyIdea,
    steps: realLife
      ? ['Name the situation and what you want to be able to do.', 'Use this guide to make a short checklist that fits your context.', 'Try the checklist in a low-pressure practice scenario and update it afterward.']
      : ['Read the prompt once and identify what you already know.', 'Write down the key idea in your own words.', 'Try one example, check each step and explain how you know it works.'],
    question: realLife ? 'What is a useful first move when learning a new practical skill?' : 'What is a useful first move when tackling a new academic idea?',
    choices: realLife ? ['Make a small plan and practise safely', 'Skip straight to the hardest situation', 'Memorize without trying it'] : ['Identify the givens and the goal', 'Skip to the final answer', 'Ignore the worked example'],
    answer: 0,
    explanation: realLife ? 'A small, safe practice plan helps you learn and gives you a chance to adjust.' : 'Knowing what you have and what you need helps you choose a clear next step.',
  };
}

export function slug(value) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function allLessons() {
  return [
    ...featuredLessons,
    ...topicCards.flatMap(category => category.topics.map(title => ({ ...findLesson(slug(title)), title }))).filter(lesson => !featuredLessons.some(featured => featured.topic === lesson.title)),
  ];
}
