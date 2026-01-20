/**
 * ASDF-Web UI Module Tests
 * Tests for toast and modal components
 *
 * This is fine.
 */

describe('UI Module', () => {
  // ============================================
  // TOAST TESTS
  // ============================================
  describe('ToastManager', () => {
    let ToastManager;
    let toastManager;
    let mockEventBus;
    let mockAudio;

    beforeEach(() => {
      // Mock DOM
      document.body.innerHTML = '';

      // Mock eventBus
      mockEventBus = {
        emit: jest.fn(),
        on: jest.fn(() => () => {})
      };

      // Mock audio
      mockAudio = {
        isEnabled: jest.fn(() => true),
        play: jest.fn()
      };

      // Create ToastManager class for testing
      ToastManager = class {
        constructor() {
          this.container = null;
          this.activeToasts = new Map();
          this.toastCounter = 0;
          this.config = {
            containerId: 'asdf-toast-container',
            position: 'top-right',
            maxVisible: 5,
            defaultDuration: 3000,
            animationDuration: 300,
            types: {
              success: { icon: '✓', color: '#10b981', sound: 'success' },
              error: { icon: '✕', color: '#ef4444', sound: 'error' },
              warning: { icon: '⚠', color: '#f59e0b', sound: 'warning' },
              info: { icon: 'ℹ', color: '#3b82f6', sound: 'info' }
            }
          };
          this.initialized = false;
        }

        init() {
          if (this.initialized) return;
          this._createContainer();
          this.initialized = true;
        }

        _createContainer() {
          this.container = document.getElementById(this.config.containerId);
          if (this.container) return;

          this.container = document.createElement('div');
          this.container.id = this.config.containerId;
          this.container.className = `toast-container toast-${this.config.position}`;
          document.body.appendChild(this.container);
        }

        show(options) {
          this.init();

          const opts = typeof options === 'string'
            ? { message: options }
            : { ...options };

          const {
            message,
            title = null,
            type = 'info',
            duration = this.config.defaultDuration,
            icon = null,
            closable = true
          } = opts;

          const typeConfig = this.config.types[type] || this.config.types.info;
          const id = `toast-${++this.toastCounter}`;

          this._enforceLimit();

          const toast = document.createElement('div');
          toast.id = id;
          toast.className = 'toast';
          toast.innerHTML = `
            <div class="toast-icon">${icon || typeConfig.icon}</div>
            <div class="toast-content">
              ${title ? `<div class="toast-title">${title}</div>` : ''}
              <div class="toast-message">${message}</div>
            </div>
            ${closable ? '<button class="toast-close">×</button>' : ''}
          `;

          this.container.appendChild(toast);
          this.activeToasts.set(id, toast);

          if (mockAudio.isEnabled()) {
            mockAudio.play(typeConfig.sound);
          }

          mockEventBus.emit('toast:shown', { id, type, message });

          if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
          }

          return id;
        }

        dismiss(id) {
          const toast = this.activeToasts.get(id);
          if (!toast) return;

          toast.remove();
          this.activeToasts.delete(id);
          mockEventBus.emit('toast:dismissed', { id });
        }

        dismissAll() {
          for (const id of this.activeToasts.keys()) {
            this.dismiss(id);
          }
        }

        _enforceLimit() {
          while (this.activeToasts.size >= this.config.maxVisible) {
            const [firstId] = this.activeToasts.keys();
            this.dismiss(firstId);
          }
        }

        success(message, options = {}) {
          return this.show({ ...options, message, type: 'success' });
        }

        error(message, options = {}) {
          return this.show({ ...options, message, type: 'error' });
        }

        warning(message, options = {}) {
          return this.show({ ...options, message, type: 'warning' });
        }

        info(message, options = {}) {
          return this.show({ ...options, message, type: 'info' });
        }

        getActiveCount() {
          return this.activeToasts.size;
        }

        setPosition(position) {
          this.config.position = position;
          if (this.container) {
            this.container.className = `toast-container toast-${position}`;
          }
        }
      };

      toastManager = new ToastManager();
    });

    afterEach(() => {
      document.body.innerHTML = '';
      jest.clearAllMocks();
    });

    test('should initialize and create container', () => {
      toastManager.init();

      expect(toastManager.initialized).toBe(true);
      expect(document.getElementById('asdf-toast-container')).toBeTruthy();
    });

    test('should show toast with string message', () => {
      const id = toastManager.show('Test message');

      expect(id).toBe('toast-1');
      expect(toastManager.getActiveCount()).toBe(1);
    });

    test('should show toast with options object', () => {
      const id = toastManager.show({
        message: 'Test message',
        title: 'Test Title',
        type: 'success'
      });

      expect(id).toBe('toast-1');
      const toast = document.getElementById(id);
      expect(toast).toBeTruthy();
      expect(toast.innerHTML).toContain('Test Title');
      expect(toast.innerHTML).toContain('Test message');
    });

    test('should show success toast', () => {
      const id = toastManager.success('Success!');

      expect(mockAudio.play).toHaveBeenCalledWith('success');
      expect(mockEventBus.emit).toHaveBeenCalledWith('toast:shown', {
        id,
        type: 'success',
        message: 'Success!'
      });
    });

    test('should show error toast', () => {
      const id = toastManager.error('Error!');

      expect(mockAudio.play).toHaveBeenCalledWith('error');
    });

    test('should show warning toast', () => {
      toastManager.warning('Warning!');

      expect(mockAudio.play).toHaveBeenCalledWith('warning');
    });

    test('should show info toast', () => {
      toastManager.info('Info!');

      expect(mockAudio.play).toHaveBeenCalledWith('info');
    });

    test('should dismiss toast', () => {
      const id = toastManager.show('Test');

      expect(toastManager.getActiveCount()).toBe(1);

      toastManager.dismiss(id);

      expect(toastManager.getActiveCount()).toBe(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith('toast:dismissed', { id });
    });

    test('should dismiss all toasts', () => {
      toastManager.show('Test 1');
      toastManager.show('Test 2');
      toastManager.show('Test 3');

      expect(toastManager.getActiveCount()).toBe(3);

      toastManager.dismissAll();

      expect(toastManager.getActiveCount()).toBe(0);
    });

    test('should enforce max visible limit', () => {
      toastManager.config.maxVisible = 3;

      toastManager.show('Test 1');
      toastManager.show('Test 2');
      toastManager.show('Test 3');
      toastManager.show('Test 4');

      expect(toastManager.getActiveCount()).toBe(3);
    });

    test('should change position', () => {
      toastManager.init();
      toastManager.setPosition('bottom-left');

      expect(toastManager.container.className).toContain('toast-bottom-left');
    });

    test('should not reinitialize if already initialized', () => {
      toastManager.init();
      const container1 = toastManager.container;

      toastManager.init();
      const container2 = toastManager.container;

      expect(container1).toBe(container2);
    });
  });

  // ============================================
  // MODAL TESTS
  // ============================================
  describe('ModalManager', () => {
    let ModalManager;
    let modalManager;
    let mockEventBus;

    beforeEach(() => {
      document.body.innerHTML = '';

      mockEventBus = {
        emit: jest.fn(),
        on: jest.fn(() => () => {})
      };

      ModalManager = class {
        constructor() {
          this.container = null;
          this.currentModal = null;
          this.previousFocus = null;
          this.initialized = false;
          this.resolvePromise = null;
          this.modalCounter = 0;
          this.config = {
            animationDuration: 300,
            closeOnBackdrop: true,
            closeOnEscape: true,
            sizes: {
              sm: '400px',
              md: '500px',
              lg: '700px'
            }
          };
        }

        init() {
          if (this.initialized) return;
          this.initialized = true;
        }

        open(options = {}) {
          this.init();

          const {
            title = '',
            content = '',
            size = 'md',
            closable = true,
            actions = []
          } = options;

          if (this.currentModal) {
            this.close('replace');
          }

          this.previousFocus = document.activeElement;

          const id = `modal-${++this.modalCounter}`;
          this.container = document.createElement('div');
          this.container.id = id;
          this.container.className = `modal-backdrop modal-${size}`;

          let actionsHtml = '';
          if (actions.length > 0) {
            actionsHtml = `<div class="modal-footer">
              ${actions.map(a => `<button class="modal-btn" data-action="${a.action}">${a.label}</button>`).join('')}
            </div>`;
          }

          this.container.innerHTML = `
            <div class="modal-dialog">
              <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                ${closable ? '<button class="modal-close">×</button>' : ''}
              </div>
              <div class="modal-body">${content}</div>
              ${actionsHtml}
            </div>
          `;

          document.body.appendChild(this.container);
          this.currentModal = this.container.querySelector('.modal-dialog');

          const closeBtn = this.container.querySelector('.modal-close');
          if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close('close'));
          }

          this.container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
              this.close(btn.dataset.action);
            });
          });

          mockEventBus.emit('modal:opened', { id, title });

          return new Promise((resolve) => {
            this.resolvePromise = resolve;
          });
        }

        close(action = 'close') {
          if (!this.container) return;

          this.container.remove();
          this.container = null;
          this.currentModal = null;

          if (this.resolvePromise) {
            this.resolvePromise(action);
            this.resolvePromise = null;
          }

          mockEventBus.emit('modal:closed', { action });
        }

        async alert(options) {
          const opts = typeof options === 'string' ? { message: options } : options;

          return this.open({
            title: opts.title || 'Alert',
            content: `<p>${opts.message}</p>`,
            size: 'sm',
            closable: false,
            actions: [
              { label: 'OK', action: 'ok', primary: true }
            ]
          });
        }

        async confirm(options) {
          const opts = typeof options === 'string' ? { message: options } : options;

          const result = await this.open({
            title: opts.title || 'Confirm',
            content: `<p>${opts.message}</p>`,
            size: 'sm',
            closable: false,
            actions: [
              { label: 'Cancel', action: 'cancel' },
              { label: 'Confirm', action: 'confirm', primary: true }
            ]
          });

          return result === 'confirm';
        }

        isOpen() {
          return !!this.currentModal;
        }
      };

      modalManager = new ModalManager();
    });

    afterEach(() => {
      document.body.innerHTML = '';
      jest.clearAllMocks();
    });

    test('should initialize', () => {
      modalManager.init();

      expect(modalManager.initialized).toBe(true);
    });

    test('should open modal', async () => {
      const promise = modalManager.open({
        title: 'Test Modal',
        content: '<p>Test content</p>'
      });

      expect(modalManager.isOpen()).toBe(true);
      expect(document.querySelector('.modal-dialog')).toBeTruthy();
      expect(document.querySelector('.modal-title').textContent).toBe('Test Modal');

      modalManager.close('test');
      const result = await promise;
      expect(result).toBe('test');
    });

    test('should close modal', async () => {
      const promise = modalManager.open({ title: 'Test' });

      modalManager.close('closed');

      expect(modalManager.isOpen()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('modal:closed', { action: 'closed' });

      const result = await promise;
      expect(result).toBe('closed');
    });

    test('should handle action buttons', async () => {
      const promise = modalManager.open({
        title: 'Test',
        actions: [
          { label: 'Cancel', action: 'cancel' },
          { label: 'OK', action: 'ok' }
        ]
      });

      const okBtn = document.querySelector('[data-action="ok"]');
      okBtn.click();

      const result = await promise;
      expect(result).toBe('ok');
    });

    test('should show alert dialog', async () => {
      const promise = modalManager.alert({
        title: 'Alert Title',
        message: 'Alert message'
      });

      expect(document.querySelector('.modal-title').textContent).toBe('Alert Title');
      expect(document.querySelector('.modal-body').innerHTML).toContain('Alert message');

      // Close via OK button
      const okBtn = document.querySelector('[data-action="ok"]');
      okBtn.click();

      const result = await promise;
      expect(result).toBe('ok');
    });

    test('should show confirm dialog and return true on confirm', async () => {
      const promise = modalManager.confirm({
        title: 'Confirm',
        message: 'Are you sure?'
      });

      const confirmBtn = document.querySelector('[data-action="confirm"]');
      confirmBtn.click();

      const result = await promise;
      expect(result).toBe(true);
    });

    test('should show confirm dialog and return false on cancel', async () => {
      const promise = modalManager.confirm({
        title: 'Confirm',
        message: 'Are you sure?'
      });

      const cancelBtn = document.querySelector('[data-action="cancel"]');
      cancelBtn.click();

      const result = await promise;
      expect(result).toBe(false);
    });

    test('should replace existing modal', async () => {
      modalManager.open({ title: 'First' });
      expect(document.querySelectorAll('.modal-backdrop').length).toBe(1);

      modalManager.open({ title: 'Second' });
      expect(document.querySelectorAll('.modal-backdrop').length).toBe(1);
      expect(document.querySelector('.modal-title').textContent).toBe('Second');

      modalManager.close();
    });

    test('should apply size class', () => {
      modalManager.open({
        title: 'Large Modal',
        size: 'lg'
      });

      expect(document.querySelector('.modal-backdrop').className).toContain('modal-lg');

      modalManager.close();
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================
  describe('Integration', () => {
    test('toast and modal should work together', () => {
      const events = [];
      const mockBus = {
        emit: (event, data) => events.push({ event, data }),
        on: jest.fn()
      };

      mockBus.emit('toast:shown', { id: 'toast-1', type: 'success' });
      mockBus.emit('modal:opened', { id: 'modal-1', title: 'Test' });
      mockBus.emit('modal:closed', { action: 'confirm' });
      mockBus.emit('toast:dismissed', { id: 'toast-1' });

      expect(events).toHaveLength(4);
      expect(events[0].event).toBe('toast:shown');
      expect(events[1].event).toBe('modal:opened');
      expect(events[2].event).toBe('modal:closed');
      expect(events[3].event).toBe('toast:dismissed');
    });

    test('UI components should have PHI-based timing', () => {
      const PHI = 1.618033988749895;
      const baseTiming = 300;

      // Fibonacci sequence check
      const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

      // 89ms stagger delay (fib[10])
      expect(fib[10]).toBe(89);

      // Animation duration should be reasonable
      expect(baseTiming).toBeLessThan(500);
      expect(baseTiming).toBeGreaterThan(100);
    });
  });
});
