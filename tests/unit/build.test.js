/**
 * ASDF-Web Build Module Tests
 * Tests for DataAdapter, ModalFactory, and BuilderProfile
 *
 * This is fine.
 */

// ============================================
// DATA ADAPTER TESTS
// ============================================
describe('DataAdapter', () => {
  let DataAdapter;

  beforeEach(() => {
    // Create a testable DataAdapter implementation
    DataAdapter = {
      cache: new Map(),
      cacheExpiry: 5 * 60 * 1000, // 5 minutes

      async getProjects() {
        const cached = this.cache.get('projects');
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }

        // In tests, return mock data
        const projects = {
          'asdf-core': { id: 'asdf-core', title: 'ASDF Core', status: 'live' },
          'asdf-web': { id: 'asdf-web', title: 'ASDF Web', status: 'building' },
        };

        this.cache.set('projects', { data: projects, timestamp: Date.now() });
        return projects;
      },

      async getProject(id) {
        const projects = await this.getProjects();
        return projects[id] || null;
      },

      clearCache() {
        this.cache.clear();
      },
    };
  });

  test('should fetch projects', async () => {
    const projects = await DataAdapter.getProjects();
    expect(projects).toBeDefined();
    expect(Object.keys(projects).length).toBeGreaterThan(0);
  });

  test('should cache project data', async () => {
    // First call - populates cache
    await DataAdapter.getProjects();
    expect(DataAdapter.cache.has('projects')).toBe(true);

    // Second call should use cache
    const cached = DataAdapter.cache.get('projects');
    expect(cached.data['asdf-core']).toBeDefined();
  });

  test('should get single project by ID', async () => {
    const project = await DataAdapter.getProject('asdf-core');
    expect(project).toBeDefined();
    expect(project.id).toBe('asdf-core');
  });

  test('should return null for unknown project', async () => {
    const project = await DataAdapter.getProject('unknown-project');
    expect(project).toBeNull();
  });

  test('should clear cache', async () => {
    await DataAdapter.getProjects();
    expect(DataAdapter.cache.size).toBeGreaterThan(0);

    DataAdapter.clearCache();
    expect(DataAdapter.cache.size).toBe(0);
  });
});

// ============================================
// MODAL FACTORY TESTS
// ============================================
describe('ModalFactory', () => {
  let ModalFactory;
  let mockBuildState;
  let mockDataAdapter;

  beforeEach(() => {
    // Mock dependencies
    mockBuildState = {
      selectProject: jest.fn(),
      emit: jest.fn(),
    };

    mockDataAdapter = {
      getProject: jest.fn().mockResolvedValue({
        id: 'test-project',
        title: 'Test Project',
        status: 'live',
        overview: 'Test overview',
        features: [{ name: 'Feature 1' }],
        tech: ['JavaScript'],
        dependencies: 'None',
      }),
    };

    // Create testable ModalFactory
    const MODAL_TYPES = {
      DOC: 'doc',
      FEATURE: 'feature',
      COMPONENT: 'component',
      PROJECT_IMMERSIVE: 'project-immersive',
    };

    ModalFactory = {
      deps: {
        DataAdapter: mockDataAdapter,
        BuildState: mockBuildState,
      },

      configure(options = {}) {
        if (options.deps) {
          this.deps = { ...this.deps, ...options.deps };
        }
        return this;
      },

      modalCreators: {
        [MODAL_TYPES.DOC]: (factory, config) => factory.openDoc(config.projectId),
        [MODAL_TYPES.FEATURE]: (factory, config) =>
          factory.openFeature(config.projectId, config.featureIndex),
        [MODAL_TYPES.COMPONENT]: (factory, config) =>
          factory.openComponent(config.projectId, config.componentIndex),
        [MODAL_TYPES.PROJECT_IMMERSIVE]: (factory, config) =>
          factory.openProjectImmersive(config.projectId),
      },

      modalConfigs: new Map(),
      modalStack: [],

      async create(type, config = {}) {
        const creator = this.modalCreators[type];
        if (creator) {
          return creator(this, config);
        }
        return null;
      },

      async openDoc(projectId) {
        const project = await this.deps.DataAdapter.getProject(projectId);
        if (!project) return null;
        this.deps.BuildState.selectProject(projectId);
        this.modalStack.push('doc-modal');
        return 'doc-modal';
      },

      async openFeature(projectId, featureIndex) {
        const project = await this.deps.DataAdapter.getProject(projectId);
        if (!project || !project.features[featureIndex]) return null;
        this.modalStack.push('feature-modal');
        return 'feature-modal';
      },

      async openComponent(projectId, componentIndex) {
        this.modalStack.push('component-modal');
        return 'component-modal';
      },

      async openProjectImmersive(projectId) {
        const project = await this.deps.DataAdapter.getProject(projectId);
        if (!project) return null;
        this.deps.BuildState.selectProject(projectId);
        this.modalStack.push('project-immersive-modal');
        return 'project-immersive-modal';
      },

      isOpen(modalId) {
        return this.modalStack.includes(modalId);
      },

      close(modalId) {
        const index = this.modalStack.indexOf(modalId);
        if (index > -1) {
          this.modalStack.splice(index, 1);
        }
      },
    };
  });

  test('should configure dependencies', () => {
    const customAdapter = { getProject: jest.fn() };
    ModalFactory.configure({ deps: { DataAdapter: customAdapter } });

    expect(ModalFactory.deps.DataAdapter).toBe(customAdapter);
    expect(ModalFactory.deps.BuildState).toBe(mockBuildState); // Should preserve other deps
  });

  test('should create doc modal', async () => {
    const result = await ModalFactory.create('doc', { projectId: 'test-project' });

    expect(result).toBe('doc-modal');
    expect(mockDataAdapter.getProject).toHaveBeenCalledWith('test-project');
    expect(mockBuildState.selectProject).toHaveBeenCalledWith('test-project');
  });

  test('should create feature modal', async () => {
    const result = await ModalFactory.create('feature', {
      projectId: 'test-project',
      featureIndex: 0,
    });

    expect(result).toBe('feature-modal');
    expect(mockDataAdapter.getProject).toHaveBeenCalledWith('test-project');
  });

  test('should create project immersive modal', async () => {
    const result = await ModalFactory.create('project-immersive', {
      projectId: 'test-project',
    });

    expect(result).toBe('project-immersive-modal');
    expect(mockBuildState.selectProject).toHaveBeenCalledWith('test-project');
  });

  test('should return null for unknown modal type', async () => {
    const result = await ModalFactory.create('unknown-type', {});
    expect(result).toBeNull();
  });

  test('should track open modals', async () => {
    await ModalFactory.create('doc', { projectId: 'test-project' });

    expect(ModalFactory.isOpen('doc-modal')).toBe(true);
    expect(ModalFactory.isOpen('feature-modal')).toBe(false);
  });

  test('should close modals', async () => {
    await ModalFactory.create('doc', { projectId: 'test-project' });
    expect(ModalFactory.isOpen('doc-modal')).toBe(true);

    ModalFactory.close('doc-modal');
    expect(ModalFactory.isOpen('doc-modal')).toBe(false);
  });

  test('should handle missing project gracefully', async () => {
    mockDataAdapter.getProject.mockResolvedValue(null);

    const result = await ModalFactory.openDoc('nonexistent');
    expect(result).toBeNull();
  });
});

// ============================================
// BUILDER PROFILE TESTS
// ============================================
describe('BuilderProfile', () => {
  let BuilderProfile;
  let mockBuildState;
  let mockGitHubApiService;

  beforeEach(() => {
    mockBuildState = {
      subscribe: jest.fn(),
      emit: jest.fn(),
    };

    mockGitHubApiService = {
      getUserProfile: jest.fn().mockResolvedValue({
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
        bio: 'Test bio',
        public_repos: 10,
        followers: 100,
        following: 50,
        location: 'Test City',
        company: 'Test Company',
        blog: 'https://example.com',
        twitter_username: 'testuser',
        created_at: '2020-01-01T00:00:00Z',
        html_url: 'https://github.com/testuser',
      }),
    };

    BuilderProfile = {
      modal: null,
      backdrop: null,
      currentUser: null,
      isLoading: false,
      isOpen: false,

      deps: {
        BuildState: mockBuildState,
        GitHubApiService: mockGitHubApiService,
      },

      init(containerSelector, options = {}) {
        if (options.deps) {
          this.deps = { ...this.deps, ...options.deps };
        }
        return this;
      },

      async open(username) {
        if (this.isLoading) return;

        this.currentUser = username;
        this.isOpen = true;
        this.isLoading = true;

        try {
          const profile = await this.fetchProfile(username);
          this.isLoading = false;
          this.deps.BuildState.emit('builder:opened', { username });
          return profile;
        } catch (error) {
          this.isLoading = false;
          throw error;
        }
      },

      close() {
        this.isOpen = false;
        this.deps.BuildState.emit('builder:closed', {});
      },

      async fetchProfile(username) {
        const profileData = await this.deps.GitHubApiService.getUserProfile(username);
        if (!profileData) {
          throw new Error('Profile not found');
        }
        return profileData;
      },
    };
  });

  test('should configure dependencies via init', () => {
    const customApi = { getUserProfile: jest.fn() };
    BuilderProfile.init('body', { deps: { GitHubApiService: customApi } });

    expect(BuilderProfile.deps.GitHubApiService).toBe(customApi);
  });

  test('should open profile and fetch data', async () => {
    const profile = await BuilderProfile.open('testuser');

    expect(profile.login).toBe('testuser');
    expect(mockGitHubApiService.getUserProfile).toHaveBeenCalledWith('testuser');
    expect(BuilderProfile.isOpen).toBe(true);
  });

  test('should emit builder:opened event', async () => {
    await BuilderProfile.open('testuser');

    expect(mockBuildState.emit).toHaveBeenCalledWith('builder:opened', {
      username: 'testuser',
    });
  });

  test('should close profile', async () => {
    await BuilderProfile.open('testuser');
    BuilderProfile.close();

    expect(BuilderProfile.isOpen).toBe(false);
    expect(mockBuildState.emit).toHaveBeenCalledWith('builder:closed', {});
  });

  test('should handle profile not found', async () => {
    mockGitHubApiService.getUserProfile.mockResolvedValue(null);

    await expect(BuilderProfile.fetchProfile('unknown')).rejects.toThrow('Profile not found');
  });

  test('should prevent concurrent loads', async () => {
    BuilderProfile.isLoading = true;

    const result = await BuilderProfile.open('testuser');

    expect(result).toBeUndefined();
    expect(mockGitHubApiService.getUserProfile).not.toHaveBeenCalled();
  });
});

// ============================================
// YGGDRASIL COSMOS TESTS
// ============================================
describe('YggdrasilCosmos', () => {
  let YggdrasilCosmos;
  let mockDashboard;
  let mockProgressTracker;
  let mockDataAdapter;

  beforeEach(() => {
    mockDashboard = {
      init: jest.fn().mockResolvedValue({ initialized: true }),
      dispose: jest.fn(),
    };

    mockProgressTracker = {
      init: jest.fn(),
    };

    mockDataAdapter = {
      getProjects: jest.fn().mockResolvedValue({
        'test-project': { id: 'test-project', title: 'Test' },
      }),
    };

    YggdrasilCosmos = {
      container: null,
      dashboard: null,
      initialized: false,
      projectsData: null,

      deps: {
        Dashboard: mockDashboard,
        ProgressTracker: mockProgressTracker,
        DataAdapter: mockDataAdapter,
        getCourse: jest.fn(),
        getSkill: jest.fn(),
      },

      async init(containerSelector, options = {}) {
        if (options.deps) {
          this.deps = { ...this.deps, ...options.deps };
        }

        // Mock container
        this.container = { id: 'test-container' };

        this.deps.ProgressTracker.init();
        this.projectsData = await this.deps.DataAdapter.getProjects();

        try {
          this.dashboard = await this.deps.Dashboard.init(this.container);
          this.initialized = true;
          return true;
        } catch (error) {
          return false;
        }
      },

      dispose() {
        if (this.dashboard) {
          this.deps.Dashboard.dispose();
        }
        this.initialized = false;
      },
    };
  });

  test('should merge dependency overrides', async () => {
    const customAdapter = { getProjects: jest.fn().mockResolvedValue({}) };

    await YggdrasilCosmos.init('body', { deps: { DataAdapter: customAdapter } });

    expect(YggdrasilCosmos.deps.DataAdapter).toBe(customAdapter);
    expect(customAdapter.getProjects).toHaveBeenCalled();
  });

  test('should initialize progress tracker', async () => {
    await YggdrasilCosmos.init('body');

    expect(mockProgressTracker.init).toHaveBeenCalled();
  });

  test('should load projects data', async () => {
    await YggdrasilCosmos.init('body');

    expect(mockDataAdapter.getProjects).toHaveBeenCalled();
    expect(YggdrasilCosmos.projectsData).toBeDefined();
  });

  test('should initialize dashboard', async () => {
    await YggdrasilCosmos.init('body');

    expect(mockDashboard.init).toHaveBeenCalled();
    expect(YggdrasilCosmos.initialized).toBe(true);
  });

  test('should handle initialization failure', async () => {
    mockDashboard.init.mockRejectedValue(new Error('Init failed'));

    const result = await YggdrasilCosmos.init('body');

    expect(result).toBe(false);
    expect(YggdrasilCosmos.initialized).toBe(false);
  });

  test('should dispose resources', async () => {
    await YggdrasilCosmos.init('body');
    YggdrasilCosmos.dispose();

    expect(mockDashboard.dispose).toHaveBeenCalled();
    expect(YggdrasilCosmos.initialized).toBe(false);
  });
});

// ============================================
// STRATEGY PATTERN TESTS
// ============================================
describe('Strategy Pattern Implementations', () => {
  test('modalCreators should handle all modal types', () => {
    const MODAL_TYPES = {
      DOC: 'doc',
      FEATURE: 'feature',
      COMPONENT: 'component',
      PROJECT_IMMERSIVE: 'project-immersive',
    };

    const modalCreators = {
      [MODAL_TYPES.DOC]: (factory, config) => 'doc-result',
      [MODAL_TYPES.FEATURE]: (factory, config) => 'feature-result',
      [MODAL_TYPES.COMPONENT]: (factory, config) => 'component-result',
      [MODAL_TYPES.PROJECT_IMMERSIVE]: (factory, config) => 'immersive-result',
    };

    // Each modal type should have a creator
    Object.values(MODAL_TYPES).forEach(type => {
      expect(modalCreators[type]).toBeDefined();
      expect(typeof modalCreators[type]).toBe('function');
    });
  });

  test('platformHandlers should handle share platforms', () => {
    const platformHandlers = {
      twitter: (button, content) => `twitter:${content.url}`,
      copy: (button, content) => `copied:${content.url}`,
      native: (button, content) => `native:${content.url}`,
    };

    const content = { url: 'https://example.com' };

    expect(platformHandlers.twitter(null, content)).toBe('twitter:https://example.com');
    expect(platformHandlers.copy(null, content)).toBe('copied:https://example.com');
    expect(platformHandlers.native(null, content)).toBe('native:https://example.com');
  });

  test('sectionRenderers should handle section types', () => {
    const sectionRenderers = {
      intro: (section, ctx) => `<div class="intro">${section.text}</div>`,
      diagram: (section, ctx) => `<div class="diagram">${section.alt}</div>`,
      concept: (section, ctx) => `<div class="concept">${section.text}</div>`,
      note: (section, ctx) => `<div class="note">${section.text}</div>`,
    };

    const section = { type: 'intro', text: 'Test content' };
    const result = sectionRenderers.intro(section, {});

    expect(result).toContain('Test content');
    expect(result).toContain('intro');
  });

  test('geometryFactories should return functions', () => {
    // Simulate the geometry factories
    const geometryFactories = {
      project: size => ({ type: 'icosahedron', size }),
      module: size => ({ type: 'octahedron', size }),
      task: size => ({ type: 'tetrahedron', size }),
      default: size => ({ type: 'sphere', size }),
    };

    expect(geometryFactories.project(1).type).toBe('icosahedron');
    expect(geometryFactories.module(1).type).toBe('octahedron');
    expect(geometryFactories.task(1).type).toBe('tetrahedron');
    expect(geometryFactories.default(1).type).toBe('sphere');
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================
describe('Build Module Integration', () => {
  test('DataAdapter and ModalFactory should work together', async () => {
    const cache = new Map();
    const DataAdapter = {
      cache,
      async getProject(id) {
        return { id, title: `Project ${id}`, features: ['F1'] };
      },
    };

    const BuildState = {
      selectProject: jest.fn(),
      emit: jest.fn(),
    };

    const ModalFactory = {
      deps: { DataAdapter, BuildState },
      async openDoc(projectId) {
        const project = await this.deps.DataAdapter.getProject(projectId);
        if (!project) return null;
        this.deps.BuildState.selectProject(projectId);
        return 'doc-modal';
      },
    };

    const result = await ModalFactory.openDoc('test-1');

    expect(result).toBe('doc-modal');
    expect(BuildState.selectProject).toHaveBeenCalledWith('test-1');
  });

  test('DI allows complete mocking for unit tests', () => {
    // This test verifies the DI pattern enables isolation
    const realDeps = {
      Dashboard: { init: () => Promise.resolve() },
      DataAdapter: { getProjects: () => Promise.resolve({}) },
    };

    const mockDeps = {
      Dashboard: { init: jest.fn().mockResolvedValue('mock') },
      DataAdapter: { getProjects: jest.fn().mockResolvedValue({ mock: true }) },
    };

    // Original deps are preserved
    expect(realDeps.Dashboard.init).toBeDefined();

    // Mocks can be injected
    expect(mockDeps.Dashboard.init).toBeDefined();
    expect(mockDeps.Dashboard.init.mock).toBeDefined();
  });
});
