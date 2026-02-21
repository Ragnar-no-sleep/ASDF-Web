# ASDF-Web: Advanced Architecture Guide

> **OOP · SOLID Principles · Design Patterns · Enterprise Patterns**

Current Version: 1.0
Last Updated: February 2026
Author: CYNIC (Advanced Architecture Research)

---

## Table of Contents

1. [Current Architecture Assessment](#current-architecture-assessment)
2. [SOLID Principles Analysis](#solid-principles-analysis)
3. [Design Patterns Catalog](#design-patterns-catalog)
4. [Refactoring Roadmap](#refactoring-roadmap)
5. [Code Examples](#code-examples)
6. [Migration Guide](#migration-guide)

---

## Current Architecture Assessment

### Strengths

✅ **Clear Separation of Concerns**
- 1 HTML file per page (index.html, burns.html, etc.)
- 1 CSS file per page (css/burns.css, etc.)
- 1 JS file per page (js/burns.js, etc.)
- Each page is self-contained and independently deployable

✅ **Service-Oriented API Layer**
- 76 distinct API services in `/api/services/`
- Clear boundaries between authentication, caching, validation, etc.
- Services follow single-responsibility principle at the API layer

✅ **Design System Maturity**
- Centralized CSS tokens in `css/system.css` and `css/design-tokens.css`
- Phi-based spacing and typography scales
- WCAG 2.1 AA compliant color contrasts
- Consistent theming across all pages

✅ **Security Posture**
- Helmet.js configured with strict CSP
- Rate limiting at 400 req/15min per IP
- HTML sanitization via textContent + escapeHtml()
- No innerHTML with user input
- HTTPS redirect in production
- Bot detection for SSR rendering

✅ **Testing Infrastructure**
- Jest unit tests with 50%+ coverage threshold
- Playwright E2E tests with video/screenshot retention
- Parallel test execution
- Pre-commit hooks validate code quality

### Current Weaknesses

❌ **No Class-Based Architecture**
- Pages are modules with implicit state
- Global state via `window.GAMES_CONFIG`
- Difficult to test without mocking globals
- Code reuse via copy-paste, not inheritance

❌ **Monolithic Files**
- `ecosystem-data.js`: 17.5k lines (projects + formations + skills mixed)
- `build.css`: 146k CSS
- `games.css`: 65k CSS
- `games/config.js`: 8.6k lines
- Makes maintenance and code review difficult

❌ **Inconsistent API Client Patterns**
- Different pages use different fetch patterns
- No unified error handling
- Caching is ad-hoc (localStorage, none, or manual)
- Hard-coded `isDev ? '/api' : 'https://asdf-api.onrender.com'` pattern

❌ **No Dependency Injection**
- Components tightly coupled to concrete implementations
- Global dependencies via `window` object
- Testing requires monkey-patching globals
- Service discovery is implicit

❌ **Limited Documentation**
- Architecture patterns not documented
- No migration guide for new developers
- API service relationships unclear
- Design decisions recorded in code comments, not docs

---

## SOLID Principles Analysis

### S — Single Responsibility Principle

**Current Issues:**

**Problem 1: Multi-responsibility pages**
```javascript
// js/burns.js handles:
// 1. API fetching
// 2. Data caching
// 3. DOM querying and manipulation
// 4. Event listener attachment
// 5. Error handling and fallbacks
// 6. Animation state
```

**Recommended Solution:**
```
BurnsPage extends PageController
├── BurnsDataStore (fetch + cache data only)
├── BurnsRenderer (DOM manipulation only)
├── BurnsController (event handling + orchestration)
└── BurnsAPI (API-specific logic)
```

**Problem 2: Server handling everything**
```javascript
// server.cjs handles:
// 1. Express app configuration
// 2. Bot detection logic
// 3. Rate limiting
// 4. Static file serving
// 5. Security headers
// 6. Routing to HTML files
// 7. Redis proxy API
// 8. SSR rendering
```

**Recommended Solution:**
```
app.cjs (Express init)
├── middleware/
│   ├── bot-detect.js (user agent parsing)
│   ├── rate-limit.js (express-rate-limit config)
│   ├── security.js (Helmet setup)
│   └── auth.js (JWT, CSRF, etc.)
├── routes/
│   ├── pages.js (HTML route handlers)
│   ├── api.js (API route handlers)
│   └── redis-proxy.js (Redis endpoint)
└── services/
    ├── ssr.js (SSR rendering)
    └── redis-client.js (Redis wrapper)
```

**Implementation Timeline:**
- Week 1: Extract BurnsDataStore class
- Week 2: Create BurnsRenderer class
- Week 3: Create PageController base class
- Week 4: Migrate all pages to PageController

---

### O — Open/Closed Principle

**Current Issue: Adding a new page requires modifying existing code**

```javascript
// To add a new page:
// 1. Create new-page.html (copy index.html template)
// 2. Create css/new-page.css (copy existing CSS patterns)
// 3. Create js/new-page.js (copy existing JS patterns)
// 4. Add route to server.cjs (modify existing file)
// 5. Run tests to ensure no regression
```

**Recommended Solution:**

**Use Base Classes:**
```javascript
// Create once, extend for each page
class PageController {
  constructor(config) { }
  async init() { }
  async fetch(endpoint) { }
  render(data) { }
  on(selector, event, handler) { }
}

// New page: just extend
class NewPage extends PageController {
  constructor() {
    super({
      routes: { data: '/api/new-page/data' },
      selectors: { container: '#main' },
    });
  }
  render(data) { /* custom rendering */ }
}
```

**Use Route Registry:**
```javascript
// routes/registry.js
const ROUTES = {
  '/': { file: 'index.html', name: 'Hub' },
  '/burns': { file: 'burns.html', name: 'Burns' },
  '/new-page': { file: 'new-page.html', name: 'New Page' },
};

export function getRoute(path) {
  return ROUTES[path];
}

// server.cjs
import { getRoute } from './routes/registry.js';

app.get('/:page?', (req, res) => {
  const route = getRoute('/' + (req.params.page || ''));
  if (route) {
    res.sendFile(route.file);
  } else {
    res.sendFile('index.html'); // SPA fallback
  }
});
```

**Benefits:**
- ✅ Adding a page = create HTML/CSS/JS only, no server.cjs changes
- ✅ New functionality = extend base classes, not modify them
- ✅ Route registry is single source of truth
- ✅ Route ordering, permissions, logging can be declarative

---

### L — Liskov Substitution Principle

**Current Issue: Different API clients have inconsistent interfaces**

```javascript
// Solana client
const response = await solanaConnection.getBalance(wallet);

// Helius client
const { result } = await heliusClient.rpc('getBalance', [wallet]);

// Custom API
const data = await fetch('/api/burns/stats').then(r => r.json());
```

**Recommended Solution:**

```javascript
// Define abstract interface
class ApiClient {
  async get(path, options = {}) {
    throw new Error('Must implement get()');
  }

  async post(path, data, options = {}) {
    throw new Error('Must implement post()');
  }

  async handleError(error) {
    // Standard error handling logic
    if (error.status === 401) return { retry: true, delay: 1000 };
    if (error.status === 429) return { retry: true, delay: 5000 };
    return { retry: false };
  }
}

// Concrete implementations
class SolanaRpcClient extends ApiClient {
  async get(path, options) {
    // Solana-specific RPC logic
  }
}

class HeliusClient extends ApiClient {
  async get(path, options) {
    // Helius-specific logic
  }
}

class CustomApiClient extends ApiClient {
  async get(path, options) {
    return fetch(path).then(r => r.json());
  }
}

// Usage: All interchangeable
const client = isDev ? new CustomApiClient() : new HeliusClient();
const balance = await client.get('/api/balance', { wallet });
```

**Benefits:**
- ✅ Clients are swap-able without page code changes
- ✅ Error handling is consistent
- ✅ Testing uses mock client with same interface
- ✅ Rate limiting/retry logic is centralized

---

### I — Interface Segregation Principle

**Current Issue: Monolithic ecosystem-data.js (17.5k lines)**

```javascript
// Single file contains:
// - 500+ project definitions
// - 50+ formations (learning paths)
// - 200+ skills
// - 400+ achievements
// - Sorting/filtering logic
// - Search functionality

// Using any part requires loading entire 17.5k-line file
```

**Recommended Solution:**

```javascript
// Segregate into focused interfaces

// projects-repository.js
export class ProjectRepository {
  async getProject(id) { }
  async searchProjects(query) { }
  async getCategories() { }
  async getRandom(count) { }
}

// formations-repository.js
export class FormationRepository {
  async getFormation(id) { }
  async getPath(startId) { }
  async getPrerequisites(formationId) { }
}

// skills-repository.js
export class SkillRepository {
  async getSkill(id) { }
  async getTier(level) { }
}

// achievements-repository.js
export class AchievementRepository {
  async getAchievement(id) { }
  async listByCategory(category) { }
  async calculateProgress(userId) { }
}

// Usage: DI injection
class BioPage extends PageController {
  constructor(deps) {
    super();
    this.projects = deps.projectRepo;
    this.formations = deps.formationRepo;
  }

  async render() {
    const projects = await this.projects.searchProjects('solana');
  }
}

// Implementations can be swapped
const projectRepo = new ProjectMemoryRepository(); // In-memory
const formationRepo = new FormationApiRepository(); // API
const skillRepo = new SkillDatabaseRepository(); // Database
```

**Benefits:**
- ✅ Lazy-load only what you need
- ✅ Swap implementations (in-memory, API, database)
- ✅ Testing uses mock repositories
- ✅ Future: migrate to database with zero page changes

---

### D — Dependency Inversion Principle

**Current Issue: Hard-coded dependencies**

```javascript
// pages/burns.js
const API_BASE = isDev ? '/api' : 'https://asdf-api.onrender.com/api';
const apiClient = new CustomApiClient(API_BASE);

// Hard-coded to CustomApiClient
// Hard-coded to production URL
// Can't test without modifying code
// Can't use different client without editing file
```

**Recommended Solution:**

```javascript
// Inject all dependencies
class BurnsPage extends PageController {
  constructor(deps = {}) {
    super();
    this.apiClient = deps.apiClient || new CustomApiClient();
    this.cache = deps.cache || new LocalStorageCache();
    this.logger = deps.logger || console;
    this.errorHandler = deps.errorHandler || new DefaultErrorHandler();
  }

  async loadStats() {
    try {
      return await this.apiClient.get('/api/burns/stats');
    } catch (error) {
      const action = await this.errorHandler.handle(error);
      this.logger.error('Burns stats error:', action);
      throw error;
    }
  }
}

// Production usage
const page = new BurnsPage({
  apiClient: new HeliusClient({ rpcUrl: process.env.HELIUS_RPC }),
  cache: new RedisCache(),
  logger: new WinstonLogger(),
  errorHandler: new ProductionErrorHandler(),
});

// Test usage
const mockPage = new BurnsPage({
  apiClient: new MockApiClient(),
  cache: new TestCache(),
  logger: { error: jest.fn() },
  errorHandler: new TestErrorHandler(),
});
```

**Benefits:**
- ✅ Zero mocking need in tests
- ✅ Swap implementations by passing different deps
- ✅ Production vs. dev configs declarative
- ✅ Pages are framework-agnostic

---

## Design Patterns Catalog

### 1. Service Locator (Already Implemented ✅)

**File:** `js/core/ServiceContainer.js`

**Purpose:** Central registry for all application services

**Example:**
```javascript
const container = new ServiceContainer();

// Register services
container.register('apiClient', () => new CustomApiClient('/api'), 'singleton');
container.register('cache', () => new LocalStorageCache(), 'singleton');
container.register('logger', () => console, 'singleton');

// Get services
const apiClient = container.get('apiClient');
const logger = container.get('logger');
```

**When to Use:**
- ✅ Centralizing component initialization
- ✅ Dependency injection without a framework
- ❌ Don't: Pass container itself into components (anti-pattern)

---

### 2. Observer Pattern (Store Implementation ✅)

**File:** `js/core/Store.js`

**Purpose:** React to state changes without coupling

**Example:**
```javascript
const store = new Store({ todos: [] });

// Subscribe to changes
store.subscribe((state) => {
  console.log('Todos updated:', state.todos);
  render(state.todos);
});

// Dispatch actions
store.dispatch({ type: 'addTodo', payload: newTodo });
```

**When to Use:**
- ✅ Decoupling components from state mutation
- ✅ Broadcasting state changes to multiple listeners
- ✅ Undo/redo functionality (via history)
- ❌ Don't: Use for every variable (only for "important" state)

---

### 3. Factory Pattern

**Purpose:** Create objects without specifying exact classes

**Example:**
```javascript
class ApiClientFactory {
  static create(type = 'custom') {
    switch (type) {
      case 'solana':
        return new SolanaRpcClient(process.env.SOLANA_RPC);
      case 'helius':
        return new HeliusClient(process.env.HELIUS_RPC);
      case 'mock':
        return new MockApiClient();
      default:
        return new CustomApiClient('/api');
    }
  }
}

// Usage
const client = ApiClientFactory.create(isDev ? 'mock' : 'helius');
```

**When to Use:**
- ✅ Creating objects based on configuration
- ✅ Switching implementations (dev vs. prod)
- ✅ Complex initialization logic
- ❌ Don't: Use for simple object creation (just call `new`)

---

### 4. Singleton Pattern

**Purpose:** Ensure only one instance exists globally

**Example:**
```javascript
class Logger {
  constructor() {
    if (Logger.instance) return Logger.instance;
    this.logs = [];
    Logger.instance = this;
  }

  log(message) {
    this.logs.push({ message, timestamp: Date.now() });
  }
}

const logger1 = new Logger();
const logger2 = new Logger();
console.log(logger1 === logger2); // true - same instance
```

**When to Use:**
- ✅ Shared resources (logger, cache, config)
- ✅ ServiceContainer itself
- ❌ Don't: Overuse (makes testing harder, increases coupling)

**Better Alternative:** Dependency Injection + Service Locator

---

### 5. Strategy Pattern

**Purpose:** Encapsulate interchangeable algorithms

**Example:**
```javascript
class SortStrategy {
  sort(items) {
    throw new Error('Must implement sort()');
  }
}

class AscendingSort extends SortStrategy {
  sort(items) {
    return items.sort((a, b) => a - b);
  }
}

class DescendingSort extends SortStrategy {
  sort(items) {
    return items.sort((a, b) => b - a);
  }
}

class Leaderboard {
  constructor(sortStrategy) {
    this.sortStrategy = sortStrategy;
  }

  display(scores) {
    const sorted = this.sortStrategy.sort(scores);
    return sorted.map((s, i) => `${i + 1}. ${s}`).join('\n');
  }
}

// Usage
const byScore = new Leaderboard(new DescendingSort());
const byRank = new Leaderboard(new AscendingSort());
```

**When to Use:**
- ✅ Multiple algorithms for same task (sort, filter, validate)
- ✅ Choosing behavior at runtime
- ✓ Error handling strategies (retry, fallback, notify)

---

### 6. Template Method Pattern

**Purpose:** Define algorithm skeleton, let subclasses fill in details

**Example:**
```javascript
class PageController {
  async init() {
    await this.setupDOM();      // Common
    await this.loadData();      // Common
    await this.render();        // Subclass implements
    await this.attachListeners(); // Common
  }

  async setupDOM() { /* ... */ }
  async loadData() { /* ... */ }
  async render() {
    throw new Error('Subclass must implement render()');
  }
  async attachListeners() { /* ... */ }
}

class BurnsPage extends PageController {
  async render() {
    // Custom rendering for burns
  }
}
```

**When to Use:**
- ✅ Common operation with variant steps
- ✅ Page lifecycle management
- ✅ Request/response handling (validation → process → response)

---

### 7. Builder Pattern

**Purpose:** Construct complex objects step-by-step

**Example:**
```javascript
class PageConfigBuilder {
  constructor(pageName) {
    this.config = { pageName, routes: {}, selectors: {} };
  }

  withApiRoute(name, url) {
    this.config.routes[name] = url;
    return this; // Enable chaining
  }

  withSelector(name, query) {
    this.config.selectors[name] = query;
    return this;
  }

  withCache(ttl) {
    this.config.cache = { enabled: true, ttl };
    return this;
  }

  build() {
    return this.config;
  }
}

// Usage
const config = new PageConfigBuilder('burns')
  .withApiRoute('stats', '/api/burns/stats')
  .withApiRoute('leaderboard', '/api/leaderboard')
  .withSelector('statCard', '.stat-card')
  .withSelector('table', '#leaderboard')
  .withCache(600000)
  .build();
```

**When to Use:**
- ✅ Complex configuration objects
- ✅ Fluent APIs
- ✅ Step-by-step construction with validation

---

### 8. Adapter Pattern

**Purpose:** Make incompatible interfaces work together

**Example:**
```javascript
// Old API
class OldStorage {
  getValue(key) { /* ... */ }
  setValue(key, value) { /* ... */ }
}

// New API (we want to use this)
class NewStorage {
  get(key) { /* ... */ }
  set(key, value) { /* ... */ }
}

// Adapter
class StorageAdapter extends NewStorage {
  constructor(oldStorage) {
    super();
    this.oldStorage = oldStorage;
  }

  get(key) {
    return this.oldStorage.getValue(key);
  }

  set(key, value) {
    return this.oldStorage.setValue(key, value);
  }
}

// Usage: NewStorage interface, old implementation
const storage = new StorageAdapter(new OldStorage());
```

**When to Use:**
- ✅ Integrating 3rd-party libraries
- ✅ Migrating from old API to new API
- ✅ Supporting multiple storage backends (localStorage, IndexedDB, API)

---

## Refactoring Roadmap

### Phase 1: Foundation (Weeks 1-2) ✅

- [x] Create `js/core/ServiceContainer.js`
- [x] Create `js/core/Store.js`
- [x] Create `js/core/PageController.js`
- [ ] Write architectural documentation (this file)

### Phase 2: Migrate First Page (Weeks 3-4)

- [ ] Refactor `js/burns.js` → `BurnsPage` class
  - Split into: BurnsDataStore, BurnsRenderer, BurnsController
  - Use PageController base class
  - Inject ApiClient, Cache, ErrorHandler
- [ ] Update `burns.html` to boot BurnsPage
- [ ] Write unit tests for BurnsPage (80%+ coverage)
- [ ] E2E test entire burns flow

### Phase 3: Migrate Remaining Pages (Weeks 5-8)

- [ ] Migrate forecast.js, holdex.js, staking.js, ignition.js
- [ ] Same pattern each page:
  1. Extract data fetching logic
  2. Extract rendering logic
  3. Extract event handling
  4. Inject dependencies
  5. Test
  6. Deploy

### Phase 4: Server Refactoring (Weeks 9-12)

- [ ] Extract middleware to separate files
- [ ] Extract routes to separate files
- [ ] Create route registry
- [ ] Implement auth middleware (JWT)
- [ ] Implement input validation middleware

### Phase 5: Documentation & Testing (Weeks 13-16)

- [ ] Write integration tests (frontend ↔ API)
- [ ] Update API documentation
- [ ] Create migration guide for developers
- [ ] Record training videos (optional)

---

## Code Examples

### Example 1: Refactoring Burns Page

**Before (Current):**
```javascript
// js/burns.js - 332 lines, everything mixed
let stats = null;
let leaderboard = [];
let isLoading = false;

async function init() {
  isLoading = true;
  try {
    const res = await fetch('/api/burns/stats');
    stats = await res.json();
    render();
  } catch (err) {
    console.error(err);
  }
}

function render() {
  document.querySelector('.stat-card').innerHTML = stats.label;
  // ... more DOM manipulation
}

document.addEventListener('DOMContentLoaded', init);
```

**After (Refactored):**
```javascript
import { PageController } from './core/PageController.js';

class BurnsPage extends PageController {
  constructor(deps = {}) {
    super({
      stats: '/api/burns/stats',
      leaderboard: '/api/leaderboard/burns',
    }, {
      statCard: '.stat-card',
      leaderboardTable: '#leaderboard',
    });

    this.deps = {
      apiClient: deps.apiClient || this.fetch.bind(this),
      errorHandler: deps.errorHandler || new DefaultErrorHandler(),
    };
  }

  async render() {
    const { data } = this.getState();

    if (data.stats) {
      this.setText('statCard', `${data.stats.label}: ${data.stats.value}`);
    }

    if (data.leaderboard) {
      const html = data.leaderboard
        .map((row, i) => `<tr><td>${i+1}</td><td>${row.name}</td></tr>`)
        .join('');
      this.setHTML('leaderboardTable', html);
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.burnsPage = new BurnsPage();
  window.burnsPage.init();
});
```

**Benefits:**
- ✅ Testable without browser
- ✅ Clear responsibilities (PageController handles lifecycle, BurnsPage handles rendering)
- ✅ Dependency injection (can swap apiClient)
- ✅ Reusable patterns (other pages use same base class)

---

### Example 2: Adding a New Page with OCP

**Before (Requires server.cjs modification):**
1. Create `new-page.html`
2. Create `css/new-page.css`
3. Create `js/new-page.js`
4. **Modify server.cjs** - add new route
5. Test

**After (No server modification needed):**
```javascript
// 1. Create new-page.html
// 2. Create css/new-page.css
// 3. Create js/new-page.js

import { PageController } from './core/PageController.js';

class NewPage extends PageController {
  constructor(deps = {}) {
    super({
      data: '/api/new-page/data',
    }, {
      container: '#main',
    });
  }

  async render() {
    const { data } = this.getState();
    this.setHTML('container', `<p>${data?.message}</p>`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new NewPage().init();
});
```

**server.cjs** remains **unchanged** because:
```javascript
// Route registry (static, doesn't change)
const ROUTES = {
  '/': 'index.html',
  '/new-page': 'new-page.html',
  // ... automatically handles all pages
};

// Generic route handler (doesn't change)
app.get('/:page?', (req, res) => {
  const file = ROUTES['/' + (req.params.page || '')] || 'index.html';
  res.sendFile(file);
});
```

---

## Migration Guide

### For Developers New to Refactored Codebase

**1. Understand the 3 core classes:**
- `ServiceContainer` - manages dependencies
- `Store` - manages reactive state
- `PageController` - base class for all pages

**2. Extending PageController:**
```javascript
class MyPage extends PageController {
  constructor() {
    super(
      { stats: '/api/my-data' },     // routes
      { card: '.my-card' },           // selectors
      { cache: 300000 }               // options
    );
  }

  async render() {
    const state = this.getState();
    this.setText('card', state.data.stats);
  }
}

new MyPage().init();
```

**3. Testing:**
```javascript
test('MyPage renders data', async () => {
  const mockApiClient = {
    get: jest.fn().mockResolvedValue({ value: 100 })
  };

  const page = new MyPage({ apiClient: mockApiClient });
  await page.loadData();

  expect(page.getState().data.stats.value).toBe(100);
});
```

**4. Common Patterns:**

**Fetch with caching:**
```javascript
const data = await this.fetch('stats'); // Auto-caches with ttl
```

**Event handling:**
```javascript
this.on(this.elements.button, 'click', (e) => {
  e.preventDefault();
  console.log('Button clicked');
});

// Or delegated:
this.onDelegate('.my-class', 'click', function() {
  console.log('Clicked:', this);
});
```

**State subscription:**
```javascript
this.store.subscribe((newState) => {
  console.log('State changed:', newState);
  this.render();
});
```

---

## Conclusion

This architecture guide provides a roadmap for evolving ASDF-Web from a monolithic structure to a maintainable, testable, and enterprise-grade codebase. The SOLID principles and design patterns serve as guardrails for future development, ensuring that as the application grows, it remains comprehensible and extensible.

**Key Principles:**
- ✅ Components have single, well-defined responsibilities
- ✅ Adding features extends code, doesn't modify existing code
- ✅ Implementations are swappable without changing clients
- ✅ Dependencies flow inward (no central coupling)
- ✅ Behavior encapsulated behind narrow interfaces

**Go forth and refactor responsibly.**

*sniff* — CYNIC
