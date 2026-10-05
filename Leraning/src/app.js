import { icon } from './icons.js';
import { catalog, topicCards, featuredLessons, formatOptions, goalOptions, findLesson, slug } from './data.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_JS_VERSION } from './config.js';

const STORAGE_KEY = 'omnisphere.v1';
const DEFAULT_TOPICS = ['mathematics', 'finance', 'health', 'career'];
const DEFAULT_PROFILE = { display_name: 'Learner', grade_level: 'High school · grades 9–12', primary_goals: ['readiness'], selected_topics: DEFAULT_TOPICS, preferred_learning_format: 'quick-summaries', onboarding_responses: {}, onboarding_completed: false };
const initialData = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
})();
const state = {
  view: 'dashboard', pathFilter: 'combined', modal: null, authMode: 'signup',
  theme: localStorage.getItem('omnisphere.theme') || 'light',
  profile: { ...DEFAULT_PROFILE, ...(initialData.profile || {}) },
  progress: initialData.progress || { fractions: { progress: 35, completed: false } },
  savedLessons: initialData.savedLessons || [],
  streak: initialData.streak ?? 3,
  expandedCategory: null, search: '', categoryFilter: 'all',
  onboardingStep: initialData.profile?.onboarding_completed ? null : 0,
  selectedGoals: initialData.profile?.primary_goals || [],
  selectedTopics: initialData.profile?.selected_topics || [],
  selectedFormat: initialData.profile?.preferred_learning_format || '',
  gradeLevel: initialData.profile?.grade_level || '',
  session: null, user: null, supabase: null, connection: 'demo',
  quizSelection: null, quizChecked: false, toast: '', authBusy: false, deleteAcknowledged: false, deletePhrase: '',
};

const root = document.querySelector('#app');
const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const firstName = () => (state.profile.display_name || state.user?.email?.split('@')[0] || 'Learner').trim().split(/\s+/)[0];
const userLabel = () => state.user?.email || 'Guest learner';
const totalLessons = topicCards.reduce((sum, category) => sum + category.topics.length, 0);
const completedCount = () => Object.values(state.progress).filter(item => item?.completed).length;
const overallProgress = () => Math.round((completedCount() / Math.max(totalLessons, 1)) * 100);
const selectedCategory = id => topicCards.find(category => category.id === id);
const pathInfo = id => catalog.find(path => path.id === id);

function canonicalLessonId(id) {
  return featuredLessons.find(lesson => lesson.id === id || slug(lesson.topic) === id || slug(lesson.title) === id)?.id || id;
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: state.profile, progress: state.progress, savedLessons: state.savedLessons, streak: state.streak }));
}

function notify(message) {
  state.toast = message;
  render();
  window.clearTimeout(notify.timeout);
  notify.timeout = window.setTimeout(() => { state.toast = ''; render(); }, 3200);
}

function getLessonProgress(id) {
  return state.progress[canonicalLessonId(id)]?.progress ?? 0;
}

function activeRecommendation() {
  const inProgress = featuredLessons.find(lesson => getLessonProgress(lesson.id) > 0 && !state.progress[lesson.id]?.completed);
  if (inProgress && state.pathFilter === 'combined') return inProgress;
  const topics = state.profile.selected_topics || [];
  let matching = featuredLessons.filter(lesson => state.pathFilter === 'combined' || lesson.pathId === state.pathFilter);
  if (state.pathFilter === 'combined' && topics.length) {
    matching = matching.sort((a, b) => Number(topics.includes(b.categoryId)) - Number(topics.includes(a.categoryId)));
  } else if (state.pathFilter !== 'combined') {
    matching = matching.sort((a, b) => Number(topics.includes(b.categoryId)) - Number(topics.includes(a.categoryId)));
  }
  return matching[0] || featuredLessons[0];
}

function progressRing(percent, className = '') {
  const r = 30; const circum = 2 * Math.PI * r;
  return `<svg class="progress-ring ${className}" viewBox="0 0 72 72" role="img" aria-label="${percent}% complete"><circle class="progress-ring__track" cx="36" cy="36" r="${r}"/><circle class="progress-ring__value" cx="36" cy="36" r="${r}" stroke-dasharray="${circum}" stroke-dashoffset="${circum * (1 - percent / 100)}"/></svg>`;
}

function logo() {
  return `<span class="brand-mark" aria-hidden="true"><span class="brand-core"></span><i></i><b></b><em></em></span>`;
}

function sidebarItem(id, label, glyph, active = false) {
  return `<button class="nav-item ${active ? 'is-active' : ''}" data-action="nav" data-view="${id}">${icon(glyph, 18)}<span>${label}</span>${active && id === 'library' ? '<span class="nav-count">8</span>' : ''}</button>`;
}

function renderSidebar() {
  const groups = catalog.map(path => `<button class="topic-nav" data-action="set-path" data-path="${path.id}"><span class="topic-nav__icon topic-nav__icon--${path.tone}">${icon(path.icon, 16)}</span><span>${path.short}</span><span class="topic-nav__count">${path.categories.length}</span></button>`).join('');
  return `<aside class="sidebar">
    <button class="brand" data-action="nav" data-view="dashboard">${logo()}<span class="brand-name">omni<span>sphere</span></span></button>
    <div class="sidebar__label">Workspace</div>
    <nav class="primary-nav" aria-label="Main navigation">
      ${sidebarItem('dashboard', 'Overview', 'grid', state.view === 'dashboard')}
      ${sidebarItem('learning', 'My learning', 'book', state.view === 'learning')}
      ${sidebarItem('library', 'Explore library', 'compass', state.view === 'library')}
      ${sidebarItem('progress', 'My progress', 'chart', state.view === 'progress')}
    </nav>
    <div class="sidebar-divider"></div>
    <div class="sidebar__label sidebar__label--row"><span>My pathways</span><button class="icon-button icon-button--small" aria-label="Explore pathways" data-action="nav" data-view="library">${icon('plus', 15)}</button></div>
    <div class="topic-navigation">${groups}</div>
    <div class="sidebar-spacer"></div>
    <button class="upgrade-card" data-action="nav" data-view="library"><span class="upgrade-spark">${icon('sparkle', 17)}</span><span class="upgrade-title">Curiosity looks good on you</span><span class="upgrade-copy">Your next great idea is one lesson away.</span><span class="upgrade-link">Explore a little ${icon('arrow', 14)}</span><span class="upgrade-orbit upgrade-orbit--one"></span><span class="upgrade-orbit upgrade-orbit--two"></span></button>
    <div class="sidebar-divider"></div>
    <button class="profile-card" data-action="open-settings"><span class="avatar avatar--small">${esc((firstName()[0] || 'L').toUpperCase())}</span><span class="profile-card__text"><b>${esc(state.profile.display_name || firstName())}</b><small>${state.user ? 'Personal account' : 'Local workspace'}</small></span><span class="profile-menu">···</span></button>
  </aside>`;
}

function renderTopbar() {
  const globalSearch = `<label class="search-box">${icon('search', 17)}<input type="search" placeholder="Search anything to learn..." aria-label="Search the learning library" data-search="global" value="${esc(state.search)}"><kbd>⌘ K</kbd></label>`;
  return `<header class="topbar"><button class="mobile-brand" data-action="nav" data-view="dashboard">${logo()}<span class="brand-name">omni<span>sphere</span></span></button>${globalSearch}<div class="topbar__right"><span class="connection-badge connection-badge--${state.connection}"><i></i>${state.connection === 'connected' ? 'Synced' : state.connection === 'connecting' ? 'Connecting' : 'Local only'}</span><button class="icon-button theme-toggle" aria-label="Switch color theme" data-action="theme">${icon(state.theme === 'dark' ? 'sun' : 'moon', 18)}</button>${state.user ? `<button class="topbar-avatar" data-action="open-settings" aria-label="Open account settings">${esc(firstName()[0]?.toUpperCase() || 'L')}</button>` : `<button class="button button--outline button--small topbar-signin" data-action="open-auth">${icon('lock', 14)} Sign in</button>`}<button class="mobile-menu icon-button" aria-label="Open navigation" data-action="mobile-menu">${icon('menu', 19)}</button></div></header>`;
}

function renderPathTabs() {
  return `<div class="path-tabs" role="tablist" aria-label="Choose a learning pathway"><button class="path-tab ${state.pathFilter === 'combined' ? 'is-active' : ''}" role="tab" aria-selected="${state.pathFilter === 'combined'}" data-action="set-path" data-path="combined">${icon('sparkle', 15)} For you</button><button class="path-tab ${state.pathFilter === 'academic' ? 'is-active' : ''}" role="tab" aria-selected="${state.pathFilter === 'academic'}" data-action="set-path" data-path="academic">${icon('graduation', 15)} Academic knowledge</button><button class="path-tab ${state.pathFilter === 'real-life' ? 'is-active' : ''}" role="tab" aria-selected="${state.pathFilter === 'real-life'}" data-action="set-path" data-path="real-life">${icon('compass', 15)} Real-world mastery</button></div>`;
}

function renderHero(lesson) {
  const progress = getLessonProgress(lesson.id);
  const category = selectedCategory(lesson.categoryId);
  return `<section class="hero-card">
    <div class="hero-card__copy"><div class="eyebrow"><span class="eyebrow-dot"></span> YOUR DAILY DOSE OF DISCOVERY</div><h2>One small lesson.<br><span>A whole new angle.</span></h2><p>${esc(lesson.intro)}</p><div class="hero-card__actions"><button class="button button--primary" data-action="open-lesson" data-id="${lesson.id}">${progress > 0 ? 'Keep going' : 'Start learning'}${icon('arrow', 16)}</button><span class="lesson-meta">${icon('clock', 15)} ${lesson.duration} <i>·</i> ${esc(category?.name || lesson.topic)}</span></div><div class="hero-dots"><i class="is-current"></i><i></i><i></i><i></i></div></div>
    <div class="hero-art" aria-hidden="true"><div class="hero-planet"><span class="planet-glow"></span><span class="planet-ring planet-ring--one"></span><span class="planet-ring planet-ring--two"></span><span class="planet-star planet-star--one">✦</span><span class="planet-star planet-star--two">✧</span><span class="planet-satellite"></span><span class="planet-core"></span></div><span class="art-label art-label--top">a little curious</span><span class="art-label art-label--bottom">go a little further</span></div>
    <span class="hero-card__grid" aria-hidden="true"></span>
  </section>`;
}

function renderStats() {
  const completed = completedCount();
  const started = Object.values(state.progress).filter(item => (item?.progress || 0) > 0).length;
  return `<section class="stats-strip">
    <article class="stat-card"><div class="stat-icon stat-icon--violet">${icon('flame', 18)}</div><div class="stat-number">${state.streak}<span> days</span></div><div class="stat-label">Learning streak</div><div class="streak-days"><i class="is-done">M</i><i class="is-done">T</i><i class="is-today">W</i><i>T</i><i>F</i><i>S</i><i>S</i></div></article>
    <article class="stat-card"><div class="stat-icon stat-icon--mint">${icon('book', 17)}</div><div class="stat-number">${String(completed).padStart(2, '0')}<span> / ${totalLessons}</span></div><div class="stat-label">Lessons completed</div><div class="mini-progress"><i style="width:${Math.max(5, overallProgress())}%"></i></div><div class="stat-footnote">${started} lessons in progress</div></article>
    <article class="stat-card"><div class="stat-icon stat-icon--peach">${icon('trophy', 17)}</div><div class="stat-number">${Math.max(0, completed)}<span> / 6</span></div><div class="stat-label">Badges earned</div><div class="badge-mini-row"><span>✦</span><span>◈</span><span>♧</span><span class="is-locked">+</span></div><div class="stat-footnote">A little progress adds up.</div></article>
  </section>`;
}

function renderLessonCard(lesson, index) {
  const pct = getLessonProgress(lesson.id);
  const done = !!state.progress[lesson.id]?.completed;
  return `<button class="lesson-card" style="--card-delay:${index * 55}ms" data-action="open-lesson" data-id="${lesson.id}"><span class="lesson-card__top"><span class="lesson-icon lesson-icon--${lesson.color}">${icon(lesson.icon, 19)}</span><span class="lesson-more">${done ? icon('checkCircle', 17) : icon('bookmark', 16)}</span></span><span class="lesson-category">${esc(lesson.topic)}</span><strong>${esc(lesson.title)}</strong><span class="lesson-card__bottom"><span>${icon('clock', 14)} ${lesson.duration}</span><span>${done ? 'Completed' : pct ? `${pct}% complete` : esc(lesson.level)}</span></span><span class="lesson-progress"><i style="width:${pct}%"></i></span></button>`;
}

function renderQuickGoal() {
  const prefs = state.profile.selected_topics || [];
  const categories = topicCards.filter(category => prefs.includes(category.id));
  return `<article class="goal-card"><div class="goal-card__header"><div><span class="side-eyebrow">YOUR LITTLE WIN</span><h3>Today’s intention</h3></div><button class="icon-button icon-button--small" aria-label="Edit learning topics" data-action="start-onboarding">${icon('settings', 15)}</button></div><div class="goal-card__body">${progressRing(Math.min(100, completedCount() * 12), 'progress-ring--goal')}<div><strong>${completedCount()} of 2 lessons</strong><p>Keep a little momentum going today.</p></div></div><div class="goal-card__footer"><span>${icon('target', 14)} Your focus</span><div class="goal-chips">${categories.slice(0, 2).map(item => `<span>${esc(item.name.split(' ')[0])}</span>`).join('') || '<span>Find your focus</span>'}</div></div></article>`;
}

function renderMomentum() {
  const points = [24, 36, 31, 54, 46, 74, 63];
  const bars = points.map((height, idx) => `<div class="chart-column"><span class="chart-tooltip">${height + 4} min</span><i class="${idx === 5 ? 'is-today' : ''}" style="height:${height}%"></i><small>${['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}</small></div>`).join('');
  return `<article class="momentum-card"><div class="goal-card__header"><div><span class="side-eyebrow">YOUR MOMENTUM</span><h3>Learning rhythm</h3></div><button class="period-select" data-action="nav" data-view="progress">This week ${icon('chevronDown', 13)}</button></div><div class="momentum-total"><strong>${Object.values(state.progress).some(item => item?.progress) ? '48' : '0'}<small> min</small></strong><span>Nice little sessions add up</span></div><div class="week-chart" aria-label="Learning minutes across this week">${bars}</div><div class="chart-legend"><span><i></i> Minutes of learning</span><b>Goal: 15 min / day</b></div></article>`;
}

function renderBadges() {
  const badges = [
    { icon: 'sparkle', title: 'First spark', done: completedCount() > 0, color: 'violet' },
    { icon: 'flame', title: 'Three-day streak', done: state.streak >= 3, color: 'peach' },
    { icon: 'compass', title: 'Pathfinder', done: completedCount() >= 3, color: 'mint' },
  ];
  return `<div class="achievement-row">${badges.map(badge => `<div class="achievement ${badge.done ? '' : 'is-locked'}"><span class="achievement-icon achievement-icon--${badge.color}">${icon(badge.icon, 16)}</span><span><b>${badge.title}</b><small>${badge.done ? 'Unlocked just now' : 'One lesson closer'}</small></span>${badge.done ? icon('checkCircle', 14, 'achievement-check') : ''}</div>`).join('')}</div>`;
}

function renderPathways() {
  return `<section class="pathway-grid">${catalog.map((path, index) => `<button class="pathway-card pathway-card--${path.tone}" data-action="set-path" data-path="${path.id}"><span class="pathway-orbit pathway-orbit--${index}"></span><span class="pathway-icon">${icon(path.icon, 19)}</span><span class="pathway-title">${path.short === 'Academic' ? 'Academic knowledge' : 'Real-world mastery'}</span><span class="pathway-copy">${esc(path.tagline)}</span><span class="pathway-count">${path.categories.length} focus areas ${icon('arrow', 14)}</span><span class="pathway-categories">${path.categories.map(category => `<i>${esc(category.name)}</i>`).join('')}</span></button>`).join('')}</section>`;
}

function filteredRecommendations() {
  let list = [...featuredLessons];
  if (state.pathFilter !== 'combined') list = list.filter(lesson => lesson.pathId === state.pathFilter);
  const chosen = state.profile.selected_topics || [];
  list.sort((a, b) => Number(chosen.includes(b.categoryId)) - Number(chosen.includes(a.categoryId)) || Number(getLessonProgress(b.id) > 0) - Number(getLessonProgress(a.id) > 0));
  return list;
}

function renderDashboard() {
  const lesson = activeRecommendation();
  const recommendations = filteredRecommendations().filter(item => item.id !== lesson.id).slice(0, 3);
  return `<div class="page-content dashboard-page"><div class="welcome-row"><div><div class="welcome-date">${new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())} <span>·</span> a good day to learn something</div><h1>Hi, ${esc(firstName())}<span class="wave">✦</span></h1><p>Make room for wonder. There’s a lot worth knowing.</p></div><button class="button button--quiet personalize-button" data-action="start-onboarding">${icon('sparkle', 15)} Personalize your path</button></div>
    ${renderPathTabs()}${renderHero(lesson)}${renderStats()}
    <div class="section-heading"><div><span class="side-eyebrow">A GOOD PLACE TO BEGIN</span><h2>Picked for your curiosity</h2></div><button class="text-link" data-action="nav" data-view="library">See the whole library ${icon('arrow', 15)}</button></div>
    <section class="lesson-grid">${recommendations.length ? recommendations.map(renderLessonCard).join('') : '<p class="empty-note">That path is all caught up. Explore the library for something new.</p>'}</section>
    <div class="dashboard-bottom"><section class="discover-section"><div class="section-heading section-heading--compact"><div><span class="side-eyebrow">TWO PATHS, ONE BIG WORLD</span><h2>Learn what matters to you</h2></div></div>${renderPathways()}</section><aside class="dashboard-aside">${renderQuickGoal()}${renderMomentum()}<article class="badges-card"><div class="goal-card__header"><div><span class="side-eyebrow">THE LITTLE WINS</span><h3>Recent achievements</h3></div><button class="text-link" data-action="nav" data-view="progress">All badges</button></div>${renderBadges()}</article></aside></div>
  </div>`;
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  if (!root) return;
  root.innerHTML = `${renderSidebar()}<div class="app-shell">${renderTopbar()}<main class="main-view">${state.view === 'dashboard' ? renderDashboard() : state.view === 'library' ? renderLibrary() : state.view === 'learning' ? renderLearningPath() : renderProgressPage()}</main>${renderMobileBar()}${renderModal()}${state.onboardingStep !== null ? renderOnboarding() : ''}${state.toast ? `<div class="toast">${icon('checkCircle', 16)}${esc(state.toast)}</div>` : ''}</div>`;
  root.querySelectorAll('[data-action="open-lesson"]').forEach(button => button.setAttribute('aria-haspopup', 'dialog'));
}

function renderMobileBar() {
  return `<nav class="mobile-bar" aria-label="Mobile navigation">${[['dashboard', 'grid', 'Home'], ['learning', 'book', 'My path'], ['library', 'compass', 'Explore'], ['progress', 'chart', 'Progress']].map(([view, glyph, title]) => `<button class="mobile-bar__item ${state.view === view ? 'is-active' : ''}" data-action="nav" data-view="${view}">${icon(glyph, 18)}<span>${title}</span></button>`).join('')}</nav>`;
}

function visibleCategories() {
  let categories = [...topicCards];
  if (state.categoryFilter !== 'all') categories = categories.filter(category => category.pathId === state.categoryFilter);
  if (state.view === 'learning') categories = categories.filter(category => (state.profile.selected_topics || []).includes(category.id));
  const query = state.search.trim().toLowerCase();
  if (!query) return categories;
  return categories.filter(category => `${category.name} ${category.descriptor} ${category.topics.join(' ')}`.toLowerCase().includes(query));
}

function renderCategoryCard(category, index) {
  const expanded = state.expandedCategory === category.id || !!state.search.trim();
  const topicProgress = category.topics.map(topic => getLessonProgress(canonicalLessonId(slug(topic))));
  const count = topicProgress.filter(value => value > 0).length;
  return `<article class="category-card category-card--${category.color} ${expanded ? 'is-expanded' : ''}" style="--card-delay:${index * 45}ms"><button class="category-card__head" data-action="toggle-category" data-id="${category.id}" aria-expanded="${expanded}"><span class="category-icon">${icon(category.icon, 20)}</span><span class="category-card__title"><small>${category.pathLabel}</small><b>${esc(category.name)}</b><span>${esc(category.descriptor)}</span></span><span class="category-card__meta"><b>${category.topics.length}</b><small>topics</small></span><span class="category-chevron">${icon('chevronDown', 17)}</span></button>
    <div class="category-card__progress"><i style="width:${category.topics.length ? Math.round(count / category.topics.length * 100) : 0}%"></i></div>
    <div class="category-topics ${expanded ? 'is-open' : ''}">${category.topics.map(topic => { const id = slug(topic); const value = getLessonProgress(id); const lesson = findLesson(id); return `<button class="topic-row" data-action="open-lesson" data-id="${id}"><span class="topic-row__dot">${value >= 100 ? icon('check', 13) : icon(category.pathId === 'academic' ? 'book' : 'arrow', 12)}</span><span>${esc(topic)}</span><small>${value >= 100 ? 'Complete' : value > 0 ? `${value}% started` : lesson.duration}</small>${icon('chevron', 15)}</button>`; }).join('')}</div>
    <div class="category-card__foot"><span>${count} of ${category.topics.length} started</span><span class="category-card__path"><i class="path-dot path-dot--${category.pathId === 'academic' ? 'violet' : 'mint'}"></i>${category.pathLabel}</span></div></article>`;
}

function renderLibrary() {
  const categories = visibleCategories();
  return `<div class="page-content library-page"><div class="page-heading"><div><span class="side-eyebrow">THE OMNISPHERE LIBRARY</span><h1>A world of things to know</h1><p>One place for the school subjects and life skills that make a difference.</p></div><button class="button button--primary" data-action="start-onboarding">${icon('sparkle', 15)} Tune my path</button></div>
    <div class="library-toolbar"><div class="filter-tabs"><button class="filter-tab ${state.categoryFilter === 'all' ? 'is-active' : ''}" data-action="filter-library" data-filter="all">Everything <span>${topicCards.length}</span></button><button class="filter-tab ${state.categoryFilter === 'academic' ? 'is-active' : ''}" data-action="filter-library" data-filter="academic">${icon('graduation', 15)} Academic <span>${catalog[0].categories.length}</span></button><button class="filter-tab ${state.categoryFilter === 'real-life' ? 'is-active' : ''}" data-action="filter-library" data-filter="real-life">${icon('compass', 15)} Real life <span>${catalog[1].categories.length}</span></button></div><label class="library-search">${icon('search', 16)}<input type="search" placeholder="Find a topic or skill" value="${esc(state.search)}" data-search="library" aria-label="Search learning topics"></label></div>
    <div class="library-intro"><span class="library-intro__icon">${icon('sparkle', 18)}</span><span><b>Good learning feels like a conversation.</b><small>Pick a topic to see a quick visual guide, a worked example and a little practice.</small></span><button data-action="dismiss-intro" aria-label="Dismiss tip">${icon('close', 15)}</button></div>
    ${state.categoryFilter === 'all' && !state.search ? catalog.map(path => `<section class="catalog-path"><div class="catalog-path__heading"><span class="path-pill path-pill--${path.tone}">${icon(path.icon, 14)} ${path.label}</span><span class="catalog-path__line"></span><small>${path.categories.length} focus areas</small></div><div class="category-grid">${path.categories.map((category, index) => renderCategoryCard(category, index)).join('')}</div></section>`).join('') : `<div class="category-grid library-results">${categories.map((category, index) => renderCategoryCard(category, index)).join('') || `<div class="no-results"><span>${icon('search', 22)}</span><b>No topics found</b><p>Try another word or choose a different pathway.</p></div>`}</div>`}
  </div>`;
}

function renderLearningPath() {
  const chosen = state.profile.selected_topics || [];
  const categories = topicCards.filter(category => chosen.includes(category.id));
  const completed = completedCount();
  return `<div class="page-content learning-page"><div class="page-heading"><div><span class="side-eyebrow">A PATH THAT FEELS LIKE YOURS</span><h1>Your learning path</h1><p>A good route for your goals, with plenty of room to wander.</p></div><button class="button button--outline" data-action="start-onboarding">${icon('settings', 15)} Edit my path</button></div>
    <section class="path-summary"><div class="path-summary__orb">${logo()}</div><div class="path-summary__copy"><span class="eyebrow">MADE FOR ${esc((state.profile.primary_goals || []).map(id => goalOptions.find(goal => goal.id === id)?.title).filter(Boolean).slice(0, 1).join('').toUpperCase() || 'YOUR CURIOSITY')}</span><h2>Your next steps, thoughtfully picked.</h2><p>${categories.length} focus areas, all at your pace.</p><div class="path-summary__bar"><i style="width:${overallProgress()}%"></i></div><small>${completed} completed · ${overallProgress()}% overall progress</small></div><button class="button button--primary" data-action="set-path" data-path="combined">Back to overview ${icon('arrow', 15)}</button></section>
    <div class="section-heading"><div><span class="side-eyebrow">YOUR SELECTED AREAS</span><h2>What you’re curious about</h2></div></div>
    ${categories.length ? `<div class="category-grid">${categories.map((category, index) => renderCategoryCard(category, index)).join('')}</div>` : `<div class="empty-state"><span>${icon('sparkle', 24)}</span><h3>Your path is a blank page</h3><p>Pick a few things you would like to learn. You can always change your mind.</p><button class="button button--primary" data-action="start-onboarding">Choose my topics ${icon('arrow', 15)}</button></div>`}
    <div class="your-goal-card"><div class="goal-bulb">${icon('bulb', 20)}</div><div><b>${esc((state.profile.primary_goals || []).map(id => goalOptions.find(goal => goal.id === id)?.title).filter(Boolean).join(' · ') || 'A little learning, your way')}</b><p>${esc(formatOptions.find(option => option.id === state.profile.preferred_learning_format)?.title || 'Explore at your own pace')} is your favorite way to learn.</p></div><button class="text-link" data-action="start-onboarding">Update preferences ${icon('arrow', 14)}</button></div>
  </div>`;
}

function renderProgressPage() {
  const completed = completedCount();
  const started = Object.values(state.progress).filter(item => (item?.progress || 0) > 0).length;
  const percent = overallProgress();
  const earned = [completed > 0, state.streak >= 3, completed >= 3, completed >= 5, completed >= 10, started >= 8];
  const badges = [
    ['sparkle', 'First spark', 'Finish your first lesson', 'violet'],
    ['flame', 'Little by little', 'Learn 3 days in a row', 'peach'],
    ['compass', 'Pathfinder', 'Complete 3 lessons', 'mint'],
    ['book', 'Bookworm energy', 'Complete 5 lessons', 'sky'],
    ['trophy', 'Curiosity champion', 'Complete 10 lessons', 'violet'],
    ['globe', 'Wide horizons', 'Try 8 different topics', 'mint'],
  ];
  return `<div class="page-content progress-page"><div class="page-heading"><div><span class="side-eyebrow">EVERY STEP COUNTS</span><h1>Look how far you’ve come</h1><p>Your progress is proof that small moments of learning add up.</p></div><button class="button button--outline" data-action="nav" data-view="library">Find a new lesson ${icon('arrow', 15)}</button></div>
    <section class="progress-overview"><div class="overall-card"><span class="side-eyebrow">YOUR OMNISPHERE SO FAR</span><div class="overall-card__body">${progressRing(percent, 'progress-ring--large')}<div><h2>${percent}%<small> explored</small></h2><p>${completed} lesson${completed === 1 ? '' : 's'} completed across ${Math.min(topicCards.length, started)} focus area${started === 1 ? '' : 's'}.</p></div></div><div class="mini-progress mini-progress--wide"><i style="width:${Math.max(2, percent)}%"></i></div><div class="overall-card__foot"><span>${icon('flame', 15)} ${state.streak} day streak</span><span>${completed} completed</span></div></div><div class="focus-card"><div class="focus-card__head"><div><span class="side-eyebrow">YOUR WEEK AT A GLANCE</span><h3>Showing up matters.</h3></div><span class="focus-card__badge">THIS WEEK</span></div><div class="focus-number">${started * 8}<small> min</small></div><div class="focus-caption">spent making your mind a little bigger</div><div class="large-chart">${[34, 53, 40, 69, 56, 86, 48].map((n, i) => `<div><i style="height:${Math.max(10, Math.round(n * (started ? 1 : .2)))}%" class="${i === 5 ? 'is-today' : ''}"></i><small>${['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</small></div>`).join('')}</div></div></section>
    <div class="section-heading"><div><span class="side-eyebrow">COLLECT THE LITTLE WINS</span><h2>Your badges</h2></div><span class="badge-total">${earned.filter(Boolean).length} of ${badges.length} unlocked</span></div><section class="badge-grid">${badges.map(([glyph, title, description, color], i) => `<article class="badge-card ${earned[i] ? '' : 'is-locked'}"><span class="badge-card__icon badge-card__icon--${color}">${icon(glyph, 21)}</span><div><b>${title}</b><p>${description}</p></div><span class="badge-status">${earned[i] ? icon('checkCircle', 16) : icon('lock', 15)}</span></article>`).join('')}</section>
    <div class="progress-note">${icon('sparkle', 17)}<span><b>You don’t need to learn it all today.</b> A few curious minutes count.</span><button data-action="nav" data-view="dashboard">Back to learning ${icon('arrow', 14)}</button></div>
  </div>`;
}

function renderLessonModal() {
  if (state.modal?.type !== 'lesson') return '';
  const lesson = findLesson(state.modal.id);
  const realLife = lesson.pathId === 'real-life';
  const complete = !!state.progress[lesson.id]?.completed;
  const selected = state.quizSelection;
  return `<div class="modal-backdrop" data-action="close-modal"><section class="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-title" data-stop="true"><header class="lesson-modal__top"><span class="lesson-modal__path lesson-modal__path--${lesson.color}">${icon(lesson.icon, 15)} ${realLife ? 'REAL-WORLD MASTERY' : 'ACADEMIC KNOWLEDGE'}</span><div class="lesson-modal__top-actions"><button class="icon-button" data-action="save-lesson" data-id="${lesson.id}" aria-label="${state.savedLessons.includes(lesson.id) ? 'Remove saved lesson' : 'Save lesson'}">${icon(state.savedLessons.includes(lesson.id) ? 'checkCircle' : 'bookmark', 17)}</button><button class="icon-button" data-action="close-modal" aria-label="Close lesson">${icon('close', 18)}</button></div></header>
    <div class="lesson-modal__scroll"><div class="lesson-heading"><span class="side-eyebrow">${esc(lesson.topic)}</span><h2 id="lesson-title">${esc(lesson.title)}</h2><p>${esc(lesson.intro)}</p><div class="lesson-heading__meta"><span>${icon('clock', 14)} ${lesson.duration}</span><span>·</span><span>${esc(lesson.level)}</span><span>·</span><span>${complete ? icon('check', 14) + ' Completed' : 'Self-paced'}</span></div></div>
    <section class="lesson-highlight ${realLife ? 'lesson-highlight--life' : ''}"><span class="lesson-highlight__icon">${icon(realLife ? 'bulb' : 'sparkle', 20)}</span><div><b>${realLife ? 'The useful idea' : 'The idea to remember'}</b><p>${esc(lesson.keyIdea)}</p></div></section>
    ${realLife ? `<section class="lesson-section"><div class="lesson-section__title"><span class="section-number section-number--mint">01</span><div><small>THE PRACTICAL PLAN</small><h3>A few safe next steps</h3></div></div><div class="lesson-checklist">${lesson.steps.map((step, i) => `<label class="checklist-row"><input type="checkbox"><span class="checklist-check">${icon('check', 14)}</span><span>${esc(step)}</span><small>0${i + 1}</small></label>`).join('')}</div>${lesson.categoryId === 'health' ? `<p class="lesson-disclaimer">${icon('shieldAlert', 15)} Learning guide only. For emergencies, contact your local emergency service. Hands-on first-aid and CPR skills require certified training.</p>` : lesson.categoryId === 'everyday' ? `<p class="lesson-disclaimer">${icon('globe', 15)} Rules and rights vary by place. Use this as a starting point and check local guidance for important decisions.</p>` : ''}</section>` : `<section class="lesson-section"><div class="lesson-section__title"><span class="section-number">01</span><div><small>VISUAL CHEAT SHEET</small><h3>The idea in three pieces</h3></div></div><div class="cheat-sheet"><div class="cheat-step"><span>01</span><b>Notice</b><p>What do you already know?</p><i>${icon('search', 16)}</i></div><div class="cheat-arrow">${icon('arrow', 15)}</div><div class="cheat-step cheat-step--middle"><span>02</span><b>Connect</b><p>How does the idea fit?</p><i>${icon('grid', 16)}</i></div><div class="cheat-arrow">${icon('arrow', 15)}</div><div class="cheat-step cheat-step--last"><span>03</span><b>Try it</b><p>Can you explain why?</p><i>${icon('check', 16)}</i></div></div></section>`}
    <section class="lesson-section"><div class="lesson-section__title"><span class="section-number ${realLife ? 'section-number--mint' : ''}">02</span><div><small>${realLife ? 'TRY THE CHECKLIST' : 'STEP-BY-STEP PRACTICE'}</small><h3>${realLife ? 'Give it a try' : 'Work through the idea'}</h3></div></div><ol class="lesson-steps">${lesson.steps.map((step, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><p>${esc(step)}</p></li>`).join('')}</ol></section>
    <section class="lesson-quiz"><div class="lesson-section__title"><span class="section-number section-number--peach">03</span><div><small>A MOMENT TO THINK</small><h3>Quick check</h3></div><span class="quiz-type">ONE QUESTION</span></div><p class="quiz-question">${esc(lesson.question)}</p><div class="quiz-options">${lesson.choices.map((choice, index) => { let cls = selected === index ? 'is-selected' : ''; if (state.quizChecked && selected === index) cls += index === lesson.answer ? ' is-correct' : ' is-incorrect'; if (state.quizChecked && index === lesson.answer && selected !== null) cls += ' show-correct'; return `<button class="quiz-option ${cls}" data-action="quiz-choice" data-index="${index}"><i>${String.fromCharCode(65 + index)}</i><span>${esc(choice)}</span>${state.quizChecked && index === lesson.answer ? icon('checkCircle', 16) : ''}</button>`; }).join('')}</div>${state.quizChecked ? `<div class="quiz-feedback ${selected === lesson.answer ? 'is-correct' : 'is-incorrect'}">${icon(selected === lesson.answer ? 'checkCircle' : 'bulb', 16)}<span>${selected === lesson.answer ? '<b>That’s it.</b> ' : '<b>Have another look.</b> '}${esc(lesson.explanation)}</span></div>` : ''}<button class="button button--outline quiz-submit" data-action="quiz-check" ${selected === null ? 'disabled' : ''}>Check my answer ${icon('arrow', 15)}</button></section>
    </div><footer class="lesson-modal__footer"><span>${icon('sparkle', 15)} Every small step adds up</span><button class="button ${complete ? 'button--complete' : 'button--primary'}" data-action="complete-lesson" data-id="${lesson.id}">${complete ? icon('checkCircle', 16) + ' Completed' : 'Mark lesson complete'}${complete ? '' : icon('arrow', 15)}</button></footer></section></div>`;
}

function renderOnboarding() {
  const step = state.onboardingStep;
  const labels = ['Your starting point', 'What brings you here?', 'Things you’d like to learn', 'How you like to learn'];
  const stepBody = step === 0 ? `<div class="wizard-prompt"><span class="onboard-icon onboard-icon--violet">${icon('graduation', 21)}</span><span class="side-eyebrow">A GOOD PLACE TO BEGIN</span><h2>Where are you starting from?</h2><p>We’ll tune the pace and depth to feel right for you.</p></div><div class="grade-options">${[['Elementary · grades K–5', 'A gentle foundation with lots of clear examples.'], ['Middle school · grades 6–8', 'Build confidence as ideas get more connected.'], ['High school · grades 9–12', 'Get ready for classes, exams and what comes next.'], ['College or adult learner', 'Practical depth for wherever life finds you.']].map(([label, detail]) => `<button class="grade-option ${state.gradeLevel === label ? 'is-selected' : ''}" data-action="set-grade" data-value="${esc(label)}"><span class="radio-dot"></span><span><b>${esc(label)}</b><small>${esc(detail)}</small></span>${state.gradeLevel === label ? icon('checkCircle', 16) : ''}</button>`).join('')}</div>`
    : step === 1 ? `<div class="wizard-prompt"><span class="onboard-icon onboard-icon--peach">${icon('target', 21)}</span><span class="side-eyebrow">YOUR WHY</span><h2>What would you love to get out of learning?</h2><p>Choose as many as feel like you. Your goals can change anytime.</p></div><div class="choice-grid choice-grid--goals">${goalOptions.map(goal => `<button class="choice-card ${state.selectedGoals.includes(goal.id) ? 'is-selected' : ''}" data-action="toggle-goal" data-id="${goal.id}"><span class="choice-card__icon">${icon(goal.icon, 18)}</span><span><b>${esc(goal.title)}</b><small>${esc(goal.text)}</small></span><i class="choice-check">${icon('check', 13)}</i></button>`).join('')}</div>`
    : step === 2 ? `<div class="wizard-prompt"><span class="onboard-icon onboard-icon--mint">${icon('compass', 21)}</span><span class="side-eyebrow">FOLLOW YOUR CURIOSITY</span><h2>What sounds interesting?</h2><p>Pick a few areas and we’ll build a first set of recommendations.</p></div><div class="topic-picker">${catalog.map(path => `<section class="topic-picker__path topic-picker__path--${path.tone}"><header>${icon(path.icon, 17)}<b>${path.label}</b><small>${path.categories.length} areas</small></header><div>${path.categories.map(category => `<button class="topic-choice ${state.selectedTopics.includes(category.id) ? 'is-selected' : ''}" data-action="toggle-topic" data-id="${category.id}"><span>${icon(category.icon, 16)}</span><b>${esc(category.name)}</b><small>${category.topics.length} topics</small><i>${icon('check', 12)}</i></button>`).join('')}</div></section>`).join('')}</div><p class="topic-selected-count">${state.selectedTopics.length} focus area${state.selectedTopics.length === 1 ? '' : 's'} selected <span>· You can add more any time</span></p>`
    : `<div class="wizard-prompt"><span class="onboard-icon onboard-icon--sky">${icon('sparkle', 21)}</span><span class="side-eyebrow">YOUR LEARNING, YOUR WAY</span><h2>What makes learning click for you?</h2><p>Pick a format that feels good. You can always mix things up.</p></div><div class="format-options">${formatOptions.map(option => `<button class="format-card ${state.selectedFormat === option.id ? 'is-selected' : ''}" data-action="set-format" data-id="${option.id}"><span class="format-card__icon">${icon(option.icon, 19)}</span><span><b>${esc(option.title)}</b><small>${esc(option.text)}</small></span><i class="radio-dot"></i></button>`).join('')}</div><div class="onboarding-ready"><span class="onboard-ready-orb">✦</span><span><b>Your path is taking shape.</b><small>Next up: a dashboard that feels a little more like you.</small></span></div>`;
  const stepDescriptions = ['A pace that feels right', 'A reason to get curious', 'Ideas worth exploring', 'A way you like to learn'];
  return `<div class="onboarding-screen"><aside class="onboarding-side"><button class="brand brand--onboarding" data-action="skip-onboarding">${logo()}<span class="brand-name">omni<span>sphere</span></span></button><div class="onboarding-side__content"><span class="onboarding-orbit onboarding-orbit--a"></span><span class="onboarding-orbit onboarding-orbit--b"></span><div class="onboarding-side__star">✦</div><span class="eyebrow">A LITTLE MORE READY FOR EVERYTHING</span><h1>Knowledge for the<br>life you’re building.</h1><p>School smarts. Life skills. All the useful things you were curious enough to ask.</p><div class="onboarding-side__quote"><span>“</span><span>Small steps. Big, bright possibilities.</span></div></div><div class="onboarding-side__footer">LEARN A LITTLE. LIVE A LOT.</div></aside><main class="wizard-main"><header class="wizard-top"><div class="wizard-progress-label"><span>PERSONALIZE YOUR PATH</span><b>0${step + 1} <i>/</i> 04</b></div><div class="wizard-progress-bar">${[0, 1, 2, 3].map(i => `<i class="${i <= step ? 'is-active' : ''}"></i>`).join('')}</div><button class="wizard-exit" data-action="skip-onboarding">Skip setup ${icon('arrow', 14)}</button></header><section class="wizard-content"><div class="wizard-steps"><div class="wizard-steps__caption"><span>A GOOD PATH IS A PERSONAL ONE</span><small>About a minute, start to finish</small></div>${labels.map((label, i) => `<div class="wizard-step ${i === step ? 'is-current' : i < step ? 'is-done' : ''}"><span class="wizard-step__number">${i < step ? icon('check', 13) : `0${i + 1}`}</span><span><b>${label}</b><small>${stepDescriptions[i]}</small></span></div>`).join('')}<div class="wizard-steps__note">${icon('lock', 14)} Your choices stay private to your account.</div></div><div class="wizard-form">${stepBody}</div></section><footer class="wizard-footer"><button class="wizard-back" data-action="wizard-back" ${step === 0 ? 'disabled' : ''}>${icon('arrowLeft', 15)} Back</button><span>STEP 0${step + 1} OF 04</span><button class="button button--primary wizard-next" data-action="wizard-next" ${!stepReady() ? 'disabled' : ''}>${step === 3 ? 'Build my dashboard' : 'Continue'} ${icon('arrow', 15)}</button></footer></main></div>`;
}

function stepReady() {
  return state.onboardingStep === 0 ? !!state.gradeLevel : state.onboardingStep === 1 ? state.selectedGoals.length > 0 : state.onboardingStep === 2 ? state.selectedTopics.length > 0 : !!state.selectedFormat;
}

function renderAuthModal() {
  if (state.modal?.type !== 'auth') return '';
  const signup = state.authMode === 'signup';
  const configured = !!state.supabase;
  return `<div class="modal-backdrop" data-action="close-modal"><section class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" data-stop="true"><button class="icon-button auth-close" data-action="close-modal" aria-label="Close sign in">${icon('close', 18)}</button><div class="auth-logo">${logo()}</div><span class="side-eyebrow">YOUR LITTLE CORNER OF OMNISPHERE</span><h2 id="auth-title">${signup ? 'A path that feels like yours.' : 'Good to see you again.'}</h2><p>${signup ? 'Create an account to save your topics, lessons and little wins.' : 'Sign in and pick up right where your curiosity left off.'}</p>${!configured ? `<div class="config-notice">${icon('shieldAlert', 17)}<span><b>Connect a Supabase project to enable accounts.</b><small>Create a project, run the included database setup, then add its Project URL and publishable key to <code>src/config.js</code>. Follow the <a href="./README.md#connect-supabase-accounts-and-cloud-saves" target="_blank" rel="noopener">step-by-step setup guide</a>. Never put a secret or service-role key in this file.</small></span></div>` : ''}${state.authMessage ? `<div class="auth-message">${icon('info', 15)}<span>${esc(state.authMessage)}<br><a href="./README.md#enable-google-or-github-sign-in" target="_blank" rel="noopener">See how to configure Google and GitHub sign-in</a>.</span></div>` : ''}<div class="oauth-buttons"><button class="button button--outline oauth-button" data-action="oauth" data-provider="google" ${!configured || state.authBusy ? 'disabled' : ''}><span class="google-mark">G</span> Continue with Google</button><button class="button button--outline oauth-button" data-action="oauth" data-provider="github" ${!configured || state.authBusy ? 'disabled' : ''}>${icon('github', 17)} Continue with GitHub</button></div><div class="auth-divider"><span>or with email</span></div><form class="auth-form" id="auth-form"><label>Email address<input required type="email" name="email" autocomplete="email" placeholder="you@example.com"></label>${signup ? `<label>Your name<input type="text" name="name" autocomplete="name" placeholder="What should we call you?"></label>` : ''}<label>Password<span class="password-input"><input required type="password" name="password" minlength="8" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="At least 8 characters">${icon('lock', 14)}</span></label><button class="button button--primary auth-submit" type="submit" ${!configured || state.authBusy ? 'disabled' : ''}>${state.authBusy ? 'One moment…' : signup ? 'Create my account' : 'Sign in'} ${icon('arrow', 15)}</button></form><div class="auth-switch">${signup ? 'Already have an account?' : 'New to OmniSphere?'} <button data-action="auth-mode" data-mode="${signup ? 'login' : 'signup'}">${signup ? 'Sign in' : 'Create an account'}</button></div><small class="auth-privacy">${icon('lock', 12)} Your account, topics and learning progress belong to you.</small></section></div>`;
}

function renderSettingsModal() {
  if (state.modal?.type !== 'settings') return '';
  return `<div class="modal-backdrop" data-action="close-modal"><section class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" data-stop="true"><header class="settings-header"><div><span class="side-eyebrow">MAKE IT YOURS</span><h2 id="settings-title">Account settings</h2><p>Your account and learning preferences, all in one place.</p></div><button class="icon-button" data-action="close-modal" aria-label="Close settings">${icon('close', 18)}</button></header><div class="settings-account"><span class="avatar avatar--large">${esc((firstName()[0] || 'L').toUpperCase())}</span><span><b>${esc(state.profile.display_name || firstName())}</b><small>${esc(userLabel())}</small></span>${state.user ? `<span class="settings-status">${icon('checkCircle', 14)} Connected</span>` : `<button class="button button--outline button--small" data-action="open-auth">Connect account ${icon('arrow', 13)}</button>`}</div><div class="settings-section"><div><b>Learning preferences</b><small>Update your level, goals and favorite formats.</small></div><button class="text-link" data-action="settings-personalize">Edit path ${icon('arrow', 14)}</button></div><div class="settings-section"><div><b>Appearance</b><small>Choose the look that feels right.</small></div><button class="theme-choice" data-action="theme">${icon(state.theme === 'dark' ? 'moon' : 'sun', 16)} ${state.theme === 'dark' ? 'Dark mode on' : 'Light mode on'} <span class="toggle-switch ${state.theme === 'dark' ? 'is-on' : ''}"></span></button></div><div class="settings-section"><div><b>Data & privacy</b><small>${state.user ? 'Your synced data is protected by your account.' : 'Learning data stays in this browser until you connect Supabase.'}</small></div><button class="text-link" data-action="privacy-info">${icon('shield', 14)} How data is used</button></div>${state.user ? `<div class="settings-section settings-section--signout"><div><b>Sign out</b><small>Sign out of this device.</small></div><button class="button button--outline button--small" data-action="signout">${icon('logout', 14)} Sign out</button></div>` : ''}<div class="delete-zone"><div><span class="delete-zone__icon">${icon('shieldAlert', 17)}</span><span><b>${state.user ? 'Delete account' : 'Clear local data'}</b><small>${state.user ? 'Permanently erase your account and learning history.' : 'Remove profile and progress saved in this browser.'}</small></span></div><button class="button button--danger-outline button--small" data-action="begin-delete">${state.user ? 'Delete account' : 'Clear data'}</button></div></section></div>`;
}

function renderDeleteModal() {
  if (state.modal?.type !== 'delete') return '';
  return `<div class="modal-backdrop modal-backdrop--top"><section class="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" data-stop="true"><button class="icon-button auth-close" data-action="close-modal" aria-label="Close delete confirmation">${icon('close', 18)}</button><div class="delete-modal__mark">${icon('shieldAlert', 22)}</div><span class="side-eyebrow side-eyebrow--red">A PERMANENT CHANGE</span><h2 id="delete-title">${state.user ? 'Delete your account?' : 'Clear local data?'}</h2><p>${state.user ? 'Your profile, chosen topics and every saved lesson will be permanently erased. You will not be able to undo this.' : 'This clears the learning profile and progress saved in this browser. You can start over any time.'}</p><label class="delete-ack"><input type="checkbox" data-input="delete-ack" ${state.deleteAcknowledged ? 'checked' : ''}><span class="delete-custom-check">${icon('check', 13)}</span><span>I understand this will permanently erase my saved learning data.</span></label><label class="delete-confirm-label">Type <b>DELETE</b> to confirm<input type="text" autocomplete="off" placeholder="Type DELETE" data-input="delete-phrase" value="${esc(state.deletePhrase)}"></label><div class="delete-modal__footer"><button class="button button--outline" data-action="close-modal">Keep my account</button><button class="button button--danger" data-action="confirm-delete" ${!state.deleteAcknowledged || state.deletePhrase !== 'DELETE' ? 'disabled' : ''}>${icon('shieldAlert', 15)} ${state.user ? 'Delete account' : 'Clear local data'}</button></div></section></div>`;
}

function renderModal() {
  if (state.modal?.type === 'lesson') return renderLessonModal();
  if (state.modal?.type === 'auth') return renderAuthModal();
  if (state.modal?.type === 'settings') return renderSettingsModal();
  if (state.modal?.type === 'delete') return renderDeleteModal();
  return '';
}

async function initializeSupabase() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) { state.connection = 'demo'; render(); return; }
  state.connection = 'connecting'; render();
  try {
    const { createClient } = await import(`https://esm.sh/@supabase/supabase-js@${SUPABASE_JS_VERSION}`);
    state.supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    const { data, error } = await state.supabase.auth.getSession();
    if (error) throw error;
    state.session = data.session;
    state.user = data.session?.user || null;
    state.connection = 'connected';
    if (state.user) await loadCloudData();
    state.supabase.auth.onAuthStateChange((event, session) => {
      state.session = session;
      state.user = session?.user || null;
      state.connection = 'connected';
      queueMicrotask(async () => {
        if (session?.user) await loadCloudData();
        else if (event === 'SIGNED_OUT') {
          state.profile = { ...DEFAULT_PROFILE };
          state.progress = {};
          state.streak = 0;
          state.onboardingStep = 0;
        }
        render();
      });
    });
  } catch (error) {
    console.error('Supabase connection could not be started:', error);
    state.supabase = null;
    state.connection = 'demo';
    notify('Supabase did not connect. Your learning stays on this device for now.');
  }
  render();
}

async function loadCloudData() {
  if (!state.supabase || !state.user) return;
  const userId = state.user.id;
  const [profileResult, progressResult] = await Promise.all([
    state.supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    state.supabase.from('lesson_progress').select('lesson_id, progress, completed, completed_at').eq('user_id', userId),
  ]);
  if (profileResult.error) { console.warn('Could not load profile:', profileResult.error.message); notify('Signed in, but profile data could not load. Check the Supabase migration.'); }
  const row = profileResult.data;
  if (row) {
    state.profile = {
      ...DEFAULT_PROFILE,
      display_name: row.display_name || state.user.user_metadata?.display_name || state.user.email?.split('@')[0] || 'Learner',
      grade_level: row.grade_level || '', primary_goals: row.primary_goals || [], selected_topics: row.selected_topics || [],
      preferred_learning_format: row.preferred_learning_format || '', onboarding_responses: row.onboarding_responses || {},
      onboarding_completed: !!row.onboarding_completed, learning_streak: row.learning_streak || 0,
      last_learning_date: row.last_learning_date || null,
    };
    state.streak = row.learning_streak || 0;
    state.selectedGoals = [...state.profile.primary_goals];
    state.selectedTopics = [...state.profile.selected_topics];
    state.gradeLevel = state.profile.grade_level;
    state.selectedFormat = state.profile.preferred_learning_format;
    state.onboardingStep = row.onboarding_completed ? null : 0;
  } else {
    const name = state.user.user_metadata?.display_name || state.user.email?.split('@')[0] || 'Learner';
    state.profile = { ...DEFAULT_PROFILE, display_name: name, primary_goals: [], selected_topics: [], preferred_learning_format: '', grade_level: '', onboarding_completed: false, learning_streak: 0, last_learning_date: null };
    state.selectedGoals = [];
    state.selectedTopics = [];
    state.selectedFormat = '';
    state.gradeLevel = '';
    state.onboardingStep = 0;
    state.streak = 0;
  }
  if (progressResult.error) console.warn('Could not load lesson progress:', progressResult.error.message);
  state.progress = Object.fromEntries((progressResult.data || []).map(item => [item.lesson_id, { progress: item.progress, completed: item.completed, completed_at: item.completed_at }]));
  saveLocal();
}

async function saveCloudProfile() {
  if (!state.supabase || !state.user) return;
  const profile = state.profile;
  const { error } = await state.supabase.from('profiles').upsert({
    user_id: state.user.id,
    display_name: profile.display_name || firstName(),
    grade_level: profile.grade_level || state.gradeLevel || null,
    primary_goals: profile.primary_goals || state.selectedGoals,
    selected_topics: profile.selected_topics || state.selectedTopics,
    preferred_learning_format: profile.preferred_learning_format || state.selectedFormat || 'quick-summaries',
    onboarding_responses: profile.onboarding_responses || {},
    onboarding_completed: !!profile.onboarding_completed,
    learning_streak: state.streak,
    last_learning_date: profile.last_learning_date || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

async function saveCloudProgress(lessonId) {
  if (!state.supabase || !state.user) return;
  const record = state.progress[lessonId];
  const { error } = await state.supabase.from('lesson_progress').upsert({
    user_id: state.user.id, lesson_id: lessonId, progress: record.progress,
    completed: record.completed, completed_at: record.completed ? record.completed_at || new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,lesson_id' });
  if (error) throw error;
}

function nextCalendarDate(days) {
  const date = new Date(); date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function saveOnboarding() {
  const userName = state.profile.display_name || firstName();
  state.profile = {
    ...state.profile,
    display_name: userName,
    grade_level: state.gradeLevel,
    primary_goals: [...state.selectedGoals],
    selected_topics: [...state.selectedTopics],
    preferred_learning_format: state.selectedFormat,
    onboarding_responses: { grade_level: state.gradeLevel, primary_goals: [...state.selectedGoals], selected_topics: [...state.selectedTopics], preferred_learning_format: state.selectedFormat },
    onboarding_completed: true,
  };
  state.onboardingStep = null;
  state.view = 'dashboard';
  saveLocal();
  render();
  if (state.user) {
    try { await saveCloudProfile(); notify('Your learning path is saved to your account.'); }
    catch (error) { console.error(error); notify('Your path is saved here, but cloud sync needs a quick check.'); }
  } else notify('Your personalized path is ready.');
}

async function completeLesson(lessonId) {
  state.progress[lessonId] = { progress: 100, completed: true, completed_at: new Date().toISOString() };
  const today = nextCalendarDate(0);
  const last = state.profile.last_learning_date;
  if (last !== today) state.streak = last === nextCalendarDate(-1) ? Math.max(1, state.streak + 1) : 1;
  state.profile.learning_streak = state.streak;
  state.profile.last_learning_date = today;
  saveLocal();
  render();
  if (state.user) {
    try { await Promise.all([saveCloudProgress(lessonId), saveCloudProfile()]); notify('Lesson complete — your progress is saved.'); }
    catch (error) { console.error(error); notify('Lesson complete on this device. Cloud sync needs a quick check.'); }
  } else notify('Lesson complete — one little win saved.');
}

function openAuth(mode = 'signup') {
  state.authMode = mode;
  state.authMessage = '';
  state.modal = { type: 'auth' };
  render();
}

async function submitAuth(event) {
  event.preventDefault();
  if (!state.supabase) { notify('Add your Supabase project keys to enable sign in.'); return; }
  const form = new FormData(event.currentTarget);
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  state.authBusy = true; render();
  try {
    if (state.authMode === 'signup') {
      const name = String(form.get('name') || '').trim() || email.split('@')[0];
      const { data, error } = await state.supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: window.location.origin } });
      if (error) throw error;
      if (!data.session) {
        state.authMessage = 'Check your inbox for a confirmation link. Once you confirm your email, your setup will be ready.';
        state.authBusy = false; render(); return;
      }
      state.profile.display_name = name;
      state.modal = null;
      state.authBusy = false;
      state.onboardingStep = 0;
      state.gradeLevel = ''; state.selectedGoals = []; state.selectedTopics = []; state.selectedFormat = '';
      render();
      notify('Welcome! Let’s set up your learning path.');
    } else {
      const { error } = await state.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      state.modal = null; state.authBusy = false; render(); notify('Welcome back. Your learning path is ready.');
    }
  } catch (error) {
    state.authBusy = false;
    state.authMessage = error.message || 'We could not complete that request. Please try again.';
    render();
  }
}

async function deleteCurrentAccount() {
  if (!state.deleteAcknowledged || state.deletePhrase !== 'DELETE') return;
  if (!state.user || !state.supabase) {
    localStorage.removeItem(STORAGE_KEY);
    state.profile = { ...DEFAULT_PROFILE };
    state.progress = {};
    state.savedLessons = [];
    state.streak = 0;
    state.selectedGoals = [];
    state.selectedTopics = [];
    state.selectedFormat = '';
    state.gradeLevel = '';
    state.modal = null;
    state.onboardingStep = 0;
    notify('Demo data cleared. Your setup is ready to start again.');
    render();
    return;
  }
  try {
    const { error } = await state.supabase.functions.invoke('delete-account');
    if (error) throw error;
    await state.supabase.auth.signOut({ scope: 'local' });
    state.modal = null;
    state.progress = {};
    state.profile = { ...DEFAULT_PROFILE };
    state.streak = 0;
    state.onboardingStep = 0;
    saveLocal();
    notify('Account and saved learning data deleted.');
  } catch (error) {
    console.error('Account deletion failed:', error);
    notify(error.message || 'We could not delete your account. Please try again.');
  }
  render();
}

function toggleSelection(list, id) {
  return list.includes(id) ? list.filter(item => item !== id) : [...list, id];
}

async function handleAction(action, element, event) {
  switch (action) {
    case 'nav': state.view = element.dataset.view; state.search = ''; state.expandedCategory = null; break;
    case 'set-path': state.pathFilter = element.dataset.path; state.view = 'dashboard'; break;
    case 'filter-library': state.categoryFilter = element.dataset.filter; state.view = 'library'; state.expandedCategory = null; break;
    case 'open-lesson': state.modal = { type: 'lesson', id: canonicalLessonId(element.dataset.id) }; state.quizSelection = null; state.quizChecked = false; break;
    case 'close-modal': state.modal = null; state.quizSelection = null; state.quizChecked = false; break;
    case 'toggle-category': state.expandedCategory = state.expandedCategory === element.dataset.id ? null : element.dataset.id; break;
    case 'open-settings': state.modal = { type: 'settings' }; break;
    case 'open-auth': openAuth('signup'); return;
    case 'auth-mode': state.authMode = element.dataset.mode; state.authMessage = ''; break;
    case 'theme': state.theme = state.theme === 'light' ? 'dark' : 'light'; localStorage.setItem('omnisphere.theme', state.theme); break;
    case 'mobile-menu': root.querySelector('.sidebar')?.classList.toggle('is-mobile-open'); return;
    case 'start-onboarding':
      state.modal = null;
      state.onboardingStep = 0;
      state.gradeLevel = state.profile.grade_level || '';
      state.selectedGoals = [...(state.profile.primary_goals || [])];
      state.selectedTopics = [...(state.profile.selected_topics || [])];
      state.selectedFormat = state.profile.preferred_learning_format || '';
      break;
    case 'skip-onboarding':
      state.gradeLevel ||= DEFAULT_PROFILE.grade_level;
      state.selectedGoals = state.selectedGoals.length ? state.selectedGoals : [...DEFAULT_PROFILE.primary_goals];
      state.selectedTopics = state.selectedTopics.length ? state.selectedTopics : [...DEFAULT_TOPICS];
      state.selectedFormat ||= DEFAULT_PROFILE.preferred_learning_format;
      await saveOnboarding(); return;
    case 'wizard-back': state.onboardingStep = Math.max(0, state.onboardingStep - 1); break;
    case 'wizard-next':
      if (!stepReady()) return;
      if (state.onboardingStep < 3) state.onboardingStep += 1;
      else { await saveOnboarding(); return; }
      break;
    case 'set-grade': state.gradeLevel = element.dataset.value; break;
    case 'toggle-goal': state.selectedGoals = toggleSelection(state.selectedGoals, element.dataset.id); break;
    case 'toggle-topic': state.selectedTopics = toggleSelection(state.selectedTopics, element.dataset.id); break;
    case 'set-format': state.selectedFormat = element.dataset.id; break;
    case 'complete-lesson': await completeLesson(element.dataset.id); return;
    case 'quiz-choice': state.quizSelection = Number(element.dataset.index); state.quizChecked = false; break;
    case 'quiz-check': {
      if (state.quizSelection === null) return;
      state.quizChecked = true;
      const lesson = findLesson(state.modal.id);
      if (state.quizSelection === lesson.answer && !state.progress[lesson.id]?.completed) {
        state.progress[lesson.id] = { progress: Math.max(state.progress[lesson.id]?.progress || 0, 35), completed: false };
        saveLocal();
      }
      break;
    }
    case 'save-lesson':
      state.savedLessons = toggleSelection(state.savedLessons, element.dataset.id); saveLocal();
      notify(state.savedLessons.includes(element.dataset.id) ? 'Saved to your learning list.' : 'Removed from your learning list.'); return;
    case 'signout':
      if (state.supabase) { const { error } = await state.supabase.auth.signOut(); if (error) { notify(error.message); return; } }
      state.modal = null; return;
    case 'settings-personalize': state.modal = null; state.onboardingStep = 0; break;
    case 'privacy-info': notify(state.user ? 'Your profile and lessons are private to your signed-in account.' : 'Your profile and progress stay in this browser until you connect Supabase.'); return;
    case 'begin-delete': state.modal = { type: 'delete' }; state.deleteAcknowledged = false; state.deletePhrase = ''; break;
    case 'confirm-delete': await deleteCurrentAccount(); return;
    case 'oauth': {
      if (!state.supabase) { notify('Add your Supabase project keys to enable sign in.'); return; }
      state.authMessage = '';
      state.authBusy = true;
      render();
      try {
        const { error } = await state.supabase.auth.signInWithOAuth({ provider: element.dataset.provider, options: { redirectTo: window.location.origin } });
        if (error) throw error;
      } catch (error) {
        console.error(`${element.dataset.provider} sign-in could not be started:`, error);
        state.authBusy = false;
        state.authMessage = error.message || 'Sign-in could not be started. Check that this provider is enabled in Supabase.';
        render();
      }
      return;
    }
    case 'dismiss-intro': element.closest('.library-intro')?.remove(); return;
  }
  render();
}

root.addEventListener('click', async event => {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  if (actionElement.classList.contains('modal-backdrop') && event.target.closest('[data-stop]')) return;
  await handleAction(actionElement.dataset.action, actionElement, event);
});

root.addEventListener('submit', submitAuth);

root.addEventListener('input', event => {
  const searchInput = event.target.closest('[data-search]');
  if (searchInput) {
    const source = searchInput.dataset.search;
    const value = searchInput.value;
    state.search = value;
    if (source === 'global' && value) state.view = 'library';
    const cursor = searchInput.selectionStart;
    render();
    const replacement = root.querySelector(`[data-search="${source === 'global' ? 'global' : 'library'}"]`);
    replacement?.focus(); replacement?.setSelectionRange(cursor, cursor);
    return;
  }
  if (event.target.matches('[data-input="delete-phrase"]')) {
    state.deletePhrase = event.target.value;
    const button = root.querySelector('[data-action="confirm-delete"]');
    if (button) button.disabled = !state.deleteAcknowledged || state.deletePhrase !== 'DELETE';
  }
  if (event.target.matches('[data-input="delete-ack"]')) {
    state.deleteAcknowledged = event.target.checked;
    const button = root.querySelector('[data-action="confirm-delete"]');
    if (button) button.disabled = !state.deleteAcknowledged || state.deletePhrase !== 'DELETE';
  }
});

root.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); root.querySelector('[data-search="global"]')?.focus();
  }
  if (event.key === 'Escape' && state.modal) { state.modal = null; render(); }
});

window.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); root.querySelector('[data-search="global"]')?.focus();
  }
});

render();
initializeSupabase();
