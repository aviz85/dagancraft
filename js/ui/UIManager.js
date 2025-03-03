/**
 * UIManager - Responsible for managing all game UI elements and interactions
 * Controls menus, HUD, notifications, and UI-related interactions
 */
export class UIManager {
    constructor(settingsManager) {
        // Reference to settings for UI configuration
        this.settingsManager = settingsManager;
        
        // UI state
        this.activeScreen = 'loading'; // loading, main-menu, pause-menu, game, inventory
        
        // UI elements containers
        this.elements = {
            loading: document.getElementById('loading-screen'),
            mainMenu: document.getElementById('main-menu'),
            pauseMenu: document.getElementById('pause-menu'),
            hud: document.getElementById('hud'),
            inventory: document.getElementById('inventory'),
            options: document.getElementById('options-menu'),
            debug: document.getElementById('debug-info'),
            notifications: document.getElementById('notifications')
        };
        
        // UI components - will be initialized in init()
        this.components = {
            healthBar: null,
            hungerBar: null,
            hotbar: null,
            crosshair: null,
            coordinates: null,
            fps: null
        };
        
        // Event handlers
        this.eventHandlers = {};
        
        // Notification queue
        this.notifications = [];
        this.notificationDisplayTime = 3000; // ms
    }
    
    /**
     * Initialize the UI manager and set up event listeners
     */
    init() {
        console.log('UI Manager initializing...');
        
        // Initialize UI components
        this.initComponents();
        
        // Set up event listeners for all UI elements
        this.setupEventListeners();
        
        // Apply initial UI settings
        this.applyUISettings();
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
        
        // Register settings change listener
        if (this.settingsManager) {
            this.settingsManager.registerChangeListener('ui', (newSettings) => {
                this.applyUISettings();
            });
        }
        
        console.log('UI Manager initialized');
    }
    
    /**
     * Initialize UI components
     * @private
     */
    initComponents() {
        // Initialize health bar
        this.components.healthBar = {
            element: document.getElementById('health-bar'),
            hearts: document.querySelectorAll('.health-heart'),
            update: (health, maxHealth) => {
                const heartCount = this.components.healthBar.hearts.length;
                const heartsToShow = Math.ceil(health / (maxHealth / heartCount));
                
                // Update each heart
                this.components.healthBar.hearts.forEach((heart, index) => {
                    if (index < heartsToShow) {
                        heart.classList.remove('empty');
                    } else {
                        heart.classList.add('empty');
                    }
                });
            }
        };
        
        // Initialize hunger bar
        this.components.hungerBar = {
            element: document.getElementById('hunger-bar'),
            hungerIcons: document.querySelectorAll('.hunger-icon'),
            update: (hunger, maxHunger) => {
                const hungerCount = this.components.hungerBar.hungerIcons.length;
                const iconsToShow = Math.ceil(hunger / (maxHunger / hungerCount));
                
                // Update each hunger icon
                this.components.hungerBar.hungerIcons.forEach((icon, index) => {
                    if (index < iconsToShow) {
                        icon.classList.remove('empty');
                    } else {
                        icon.classList.add('empty');
                    }
                });
            }
        };
        
        // Initialize hotbar
        this.components.hotbar = {
            element: document.getElementById('hotbar'),
            slots: document.querySelectorAll('.hotbar-slot'),
            selectedIndex: 0,
            update: (items, selectedIndex) => {
                // Update selected slot
                this.components.hotbar.slots.forEach((slot, index) => {
                    if (index === selectedIndex) {
                        slot.classList.add('selected');
                    } else {
                        slot.classList.remove('selected');
                    }
                    
                    // Update slot content
                    if (items && items[index]) {
                        const item = items[index];
                        // Set slot background or content based on item
                        // slot.style.backgroundImage = `url(${item.icon})`;
                        // Could set inner HTML with item count etc.
                    } else {
                        // Empty slot
                        slot.style.backgroundImage = '';
                        slot.innerHTML = '';
                    }
                });
                
                this.components.hotbar.selectedIndex = selectedIndex;
            },
            selectSlot: (index) => {
                if (index >= 0 && index < this.components.hotbar.slots.length) {
                    this.components.hotbar.update(null, index);
                    return true;
                }
                return false;
            }
        };
        
        // Initialize crosshair
        this.components.crosshair = {
            element: document.getElementById('crosshair'),
            update: (color) => {
                if (color) {
                    this.components.crosshair.element.style.color = color;
                }
            }
        };
        
        // Initialize coordinates display
        this.components.coordinates = {
            element: document.getElementById('coordinates'),
            update: (x, y, z) => {
                if (this.components.coordinates.element) {
                    this.components.coordinates.element.textContent = `X: ${Math.floor(x)} Y: ${Math.floor(y)} Z: ${Math.floor(z)}`;
                }
            }
        };
        
        // Initialize FPS counter
        this.components.fps = {
            element: document.getElementById('fps-counter'),
            update: (fps) => {
                if (this.components.fps.element) {
                    this.components.fps.element.textContent = `${Math.round(fps)} FPS`;
                }
            }
        };
    }
    
    /**
     * Set up event listeners for all UI elements
     * @private
     */
    setupEventListeners() {
        // Main menu event listeners
        if (this.elements.mainMenu) {
            const playButton = this.elements.mainMenu.querySelector('#start-game');
            const optionsButton = this.elements.mainMenu.querySelector('#options');
            
            if (playButton) {
                playButton.addEventListener('click', () => {
                    this.fireEvent('startGame');
                });
            }
            
            if (optionsButton) {
                optionsButton.addEventListener('click', () => {
                    this.showScreen('options');
                });
            }
        }
        
        // Pause menu event listeners
        if (this.elements.pauseMenu) {
            const resumeButton = this.elements.pauseMenu.querySelector('#resume-game');
            const pauseOptionsButton = this.elements.pauseMenu.querySelector('#pause-options');
            const saveButton = this.elements.pauseMenu.querySelector('#save-world');
            const exitButton = this.elements.pauseMenu.querySelector('#exit-game');
            
            if (resumeButton) {
                resumeButton.addEventListener('click', () => {
                    this.fireEvent('resumeGame');
                });
            }
            
            if (pauseOptionsButton) {
                pauseOptionsButton.addEventListener('click', () => {
                    this.showScreen('options');
                });
            }
            
            if (saveButton) {
                saveButton.addEventListener('click', () => {
                    this.fireEvent('saveGame');
                });
            }
            
            if (exitButton) {
                exitButton.addEventListener('click', () => {
                    this.fireEvent('exitGame');
                });
            }
        }
        
        // Options menu event listeners
        if (this.elements.options) {
            const backButton = this.elements.options.querySelector('#options-back');
            
            if (backButton) {
                backButton.addEventListener('click', () => {
                    // Go back to previous screen
                    if (this.activeScreen === 'options') {
                        // Determine where to go back to
                        if (this.previousScreen === 'pause-menu') {
                            this.showScreen('pause-menu');
                        } else {
                            this.showScreen('main-menu');
                        }
                    }
                });
            }
            
            // Handle options form controls
            const settingsInputs = this.elements.options.querySelectorAll('[data-setting]');
            
            settingsInputs.forEach(input => {
                const settingPath = input.dataset.setting;
                
                // Set initial value from settings
                this.updateSettingInput(input, settingPath);
                
                // Add change listener
                input.addEventListener('change', () => {
                    let value;
                    
                    if (input.type === 'checkbox') {
                        value = input.checked;
                    } else if (input.type === 'range') {
                        value = parseFloat(input.value);
                    } else if (input.type === 'number') {
                        value = parseFloat(input.value);
                    } else {
                        value = input.value;
                    }
                    
                    // Update setting
                    if (this.settingsManager) {
                        this.settingsManager.setSetting(settingPath, value);
                    }
                });
            });
        }
        
        // Hotbar event listeners (keyboard 1-9)
        document.addEventListener('keydown', (e) => {
            // Check for number keys 1-9
            const keyNum = parseInt(e.key);
            if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 9) {
                this.components.hotbar.selectSlot(keyNum - 1);
                this.fireEvent('hotbarSelect', keyNum - 1);
            }
        });
        
        // Mouse wheel for hotbar slot selection
        document.addEventListener('wheel', (e) => {
            if (this.activeScreen === 'game') {
                const direction = e.deltaY > 0 ? 1 : -1;
                const currentIndex = this.components.hotbar.selectedIndex;
                const slotCount = this.components.hotbar.slots.length;
                
                // Calculate new index with wrap-around
                let newIndex = (currentIndex + direction) % slotCount;
                if (newIndex < 0) newIndex = slotCount - 1;
                
                this.components.hotbar.selectSlot(newIndex);
                this.fireEvent('hotbarSelect', newIndex);
            }
        });
    }
    
    /**
     * Update form inputs with current settings values
     * @private
     */
    updateSettingInput(input, settingPath) {
        if (!this.settingsManager) return;
        
        const value = this.settingsManager.getSetting(settingPath);
        
        if (value !== undefined) {
            if (input.type === 'checkbox') {
                input.checked = value;
            } else if (input.type === 'select-one' || input.tagName === 'SELECT') {
                input.value = value;
            } else {
                input.value = value;
            }
        }
    }
    
    /**
     * Apply UI settings from settings manager
     */
    applyUISettings() {
        if (!this.settingsManager) return;
        
        const uiSettings = this.settingsManager.getSetting('ui');
        
        if (uiSettings) {
            // Apply crosshair color
            if (this.components.crosshair) {
                this.components.crosshair.update(uiSettings.crosshairColor);
            }
            
            // Toggle debug info visibility
            if (this.components.debug && this.elements.debug) {
                this.elements.debug.style.display = uiSettings.showDebugInfo ? 'block' : 'none';
            }
            
            // Toggle FPS counter visibility
            if (this.components.fps && this.components.fps.element) {
                this.components.fps.element.style.display = uiSettings.showFPS ? 'block' : 'none';
            }
            
            // Apply GUI scale
            this.applyGuiScale(uiSettings.guiScale);
        }
    }
    
    /**
     * Apply GUI scale setting
     * @private
     */
    applyGuiScale(scale) {
        const root = document.documentElement;
        
        if (scale === 'small') {
            root.style.setProperty('--gui-scale', '0.8');
        } else if (scale === 'normal') {
            root.style.setProperty('--gui-scale', '1');
        } else if (scale === 'large') {
            root.style.setProperty('--gui-scale', '1.2');
        } else if (scale === 'auto') {
            // Auto-scale based on screen resolution
            const baseWidth = 1920;
            const currentWidth = window.innerWidth;
            const scaleFactor = Math.max(0.8, Math.min(1.2, currentWidth / baseWidth));
            root.style.setProperty('--gui-scale', scaleFactor.toString());
        }
    }
    
    /**
     * Show a specific UI screen
     * @param {string} screenName - Name of screen to show
     */
    showScreen(screenName) {
        // Store previous screen
        this.previousScreen = this.activeScreen;
        
        // Hide all screens
        Object.values(this.elements).forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Show requested screen
        if (this.elements[screenName]) {
            this.elements[screenName].style.display = 'flex';
        }
        
        // Special handling for game screen
        if (screenName === 'game') {
            if (this.elements.hud) {
                this.elements.hud.style.display = 'flex';
            }
        }
        
        // Update active screen
        this.activeScreen = screenName;
        
        // Fire screen change event
        this.fireEvent('screenChange', screenName);
    }
    
    /**
     * Show a notification message
     * @param {string} message - Message to display
     * @param {string} type - Type of notification (info, warning, error)
     * @param {number} duration - How long to show the notification in ms
     */
    showNotification(message, type = 'info', duration = null) {
        if (!this.elements.notifications) return;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to DOM
        this.elements.notifications.appendChild(notification);
        
        // Animation for appearance
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after duration
        const displayTime = duration || this.notificationDisplayTime;
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('hide');
            
            // Remove from DOM after animation completes
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300); // transition duration
        }, displayTime);
    }
    
    /**
     * Update player health display
     * @param {number} health - Current health value
     * @param {number} maxHealth - Maximum health value
     */
    updateHealth(health, maxHealth) {
        if (this.components.healthBar) {
            this.components.healthBar.update(health, maxHealth);
        }
    }
    
    /**
     * Update player hunger display
     * @param {number} hunger - Current hunger value
     * @param {number} maxHunger - Maximum hunger value
     */
    updateHunger(hunger, maxHunger) {
        if (this.components.hungerBar) {
            this.components.hungerBar.update(hunger, maxHunger);
        }
    }
    
    /**
     * Update hotbar display
     * @param {Array} items - Array of items in hotbar
     * @param {number} selectedIndex - Currently selected slot index
     */
    updateHotbar(items, selectedIndex) {
        if (this.components.hotbar) {
            this.components.hotbar.update(items, selectedIndex);
        }
    }
    
    /**
     * Update player coordinates display
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    updateCoordinates(x, y, z) {
        if (this.components.coordinates) {
            this.components.coordinates.update(x, y, z);
        }
    }
    
    /**
     * Update FPS counter
     * @param {number} fps - Current FPS
     */
    updateFPS(fps) {
        if (this.components.fps) {
            this.components.fps.update(fps);
        }
    }
    
    /**
     * Handle window resize
     * @private
     */
    handleResize() {
        // Recalculate UI scale if set to auto
        if (this.settingsManager) {
            const guiScale = this.settingsManager.getSetting('ui.guiScale');
            if (guiScale === 'auto') {
                this.applyGuiScale(guiScale);
            }
        }
    }
    
    /**
     * Register an event handler
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        
        this.eventHandlers[event].push(callback);
    }
    
    /**
     * Unregister an event handler
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (!this.eventHandlers[event]) return;
        
        const index = this.eventHandlers[event].indexOf(callback);
        if (index !== -1) {
            this.eventHandlers[event].splice(index, 1);
        }
    }
    
    /**
     * Fire an event to all registered handlers
     * @private
     */
    fireEvent(event, ...args) {
        if (!this.eventHandlers[event]) return;
        
        this.eventHandlers[event].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Error in UI event handler for ${event}:`, error);
            }
        });
    }
    
    /**
     * Toggle pause menu
     * @returns {boolean} - Whether the game is now paused
     */
    togglePause() {
        if (this.activeScreen === 'game') {
            this.showScreen('pause-menu');
            return true;
        } else if (this.activeScreen === 'pause-menu') {
            this.showScreen('game');
            return false;
        }
        return this.activeScreen === 'pause-menu';
    }
} 