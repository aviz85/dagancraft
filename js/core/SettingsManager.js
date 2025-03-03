/**
 * SettingsManager - Responsible for managing all game settings and configurations
 * Handles loading, saving, and applying settings changes
 */
export class SettingsManager {
    constructor() {
        // Default settings
        this.defaultSettings = {
            // Graphics settings
            graphics: {
                renderDistance: 6,      // How many chunks to render
                fogEnabled: true,       // Whether fog is enabled
                fogDensity: 0.08,       // Fog density
                shadows: true,          // Whether shadows are enabled
                shadowQuality: 'medium', // Shadow quality (low, medium, high)
                smoothLighting: true,   // Whether smooth lighting is enabled
                particles: true,        // Whether particles are enabled
                vsync: true,            // Whether vsync is enabled
                fov: 75,                // Field of view
                antialiasing: true      // Whether antialiasing is enabled
            },
            
            // Audio settings
            audio: {
                masterVolume: 1.0,      // Master volume (0-1)
                musicVolume: 0.7,       // Music volume (0-1)
                sfxVolume: 1.0,         // Sound effects volume (0-1)
                ambientVolume: 0.5      // Ambient sound volume (0-1)
            },
            
            // Controls settings
            controls: {
                mouseSensitivity: 0.3,  // Mouse sensitivity
                invertY: false,         // Whether Y-axis is inverted
                autoJump: false,        // Whether auto-jump is enabled
                keyBindings: {
                    forward: 'KeyW',
                    backward: 'KeyS',
                    left: 'KeyA',
                    right: 'KeyD',
                    jump: 'Space',
                    sprint: 'ShiftLeft',
                    sneak: 'ControlLeft',
                    inventory: 'KeyE',
                    drop: 'KeyQ',
                    chat: 'KeyT',
                    pause: 'Escape'
                }
            },
            
            // Gameplay settings
            gameplay: {
                difficulty: 'normal',   // Game difficulty (peaceful, easy, normal, hard)
                showCoordinates: true,  // Whether coordinates are shown
                renderHand: true,       // Whether player hand is rendered
                autoSaveInterval: 5,    // Auto-save interval in minutes
                creativeMode: false     // Whether creative mode is enabled
            },
            
            // User interface settings
            ui: {
                showFPS: true,          // Whether FPS counter is shown
                showDebugInfo: false,   // Whether debug info is shown
                guiScale: 'auto',       // GUI scale (small, normal, large, auto)
                crosshairColor: '#ffffff', // Crosshair color
                chatOpacity: 0.7,       // Chat background opacity
                tooltips: true          // Whether tooltips are shown
            }
        };
        
        // Current settings (will be overridden by loaded settings)
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        
        // Storage key for saving settings
        this.storageKey = 'minecraft_clone_settings';
        
        // Settings change listeners
        this.changeListeners = new Map();
    }
    
    /**
     * Initialize settings by loading from storage
     */
    init() {
        this.loadSettings();
        console.log('Settings initialized');
    }
    
    /**
     * Get current settings
     * @returns {Object} - Current settings object
     */
    getSettings() {
        return this.settings;
    }
    
    /**
     * Get a specific setting by path
     * @param {string} path - Path to the setting (e.g. 'graphics.renderDistance')
     * @returns {any} - Setting value or undefined if not found
     */
    getSetting(path) {
        const keys = path.split('.');
        let current = this.settings;
        
        for (const key of keys) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[key];
        }
        
        return current;
    }
    
    /**
     * Set a specific setting by path
     * @param {string} path - Path to the setting (e.g. 'graphics.renderDistance')
     * @param {any} value - New value for the setting
     * @returns {boolean} - Whether the setting was changed
     */
    setSetting(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.settings;
        
        // Navigate to the right object
        for (const key of keys) {
            if (current[key] === undefined) {
                current[key] = {};
            }
            current = current[key];
        }
        
        // Check if value is different from current
        if (current[lastKey] === value) {
            return false; // No change
        }
        
        // Update the value
        current[lastKey] = value;
        
        // Notify listeners
        this.notifyListeners(path, value);
        
        // Save settings
        this.saveSettings();
        
        return true;
    }
    
    /**
     * Reset all settings to defaults
     */
    resetToDefaults() {
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        this.saveSettings();
        
        // Notify listeners of reset
        this.notifyListeners('reset', this.settings);
    }
    
    /**
     * Reset a specific category to defaults
     * @param {string} category - Category to reset (e.g. 'graphics')
     */
    resetCategory(category) {
        if (!this.defaultSettings[category]) {
            console.warn(`Category ${category} not found in default settings`);
            return;
        }
        
        this.settings[category] = JSON.parse(JSON.stringify(this.defaultSettings[category]));
        this.saveSettings();
        
        // Notify listeners of category reset
        this.notifyListeners(`${category}.reset`, this.settings[category]);
    }
    
    /**
     * Load settings from local storage
     */
    loadSettings() {
        try {
            const storedSettings = localStorage.getItem(this.storageKey);
            
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                
                // Merge stored settings with defaults (to ensure new settings are included)
                this.settings = this.mergeSettings(this.defaultSettings, parsedSettings);
                console.log('Settings loaded from storage');
            } else {
                console.log('No stored settings found, using defaults');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            // Keep using default settings
        }
    }
    
    /**
     * Save settings to local storage
     */
    saveSettings() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            console.log('Settings saved to storage');
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    /**
     * Helper to deep merge settings objects
     * @private
     */
    mergeSettings(defaults, stored) {
        const result = {};
        
        // Include all keys from defaults
        for (const key in defaults) {
            if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
                // Recursively merge nested objects
                result[key] = this.mergeSettings(
                    defaults[key], 
                    (stored && stored[key]) ? stored[key] : {}
                );
            } else {
                // Use stored value if it exists, otherwise use default
                result[key] = (stored && stored[key] !== undefined) ? stored[key] : defaults[key];
            }
        }
        
        return result;
    }
    
    /**
     * Register a change listener for settings
     * @param {string} path - Path to listen for changes (e.g. 'graphics.renderDistance')
     * @param {Function} callback - Function to call when setting changes
     * @returns {string} - ID for unregistering the listener
     */
    registerChangeListener(path, callback) {
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        if (!this.changeListeners.has(path)) {
            this.changeListeners.set(path, new Map());
        }
        
        this.changeListeners.get(path).set(id, callback);
        return id;
    }
    
    /**
     * Unregister a change listener
     * @param {string} path - Path the listener was registered for
     * @param {string} id - ID returned from registerChangeListener
     */
    unregisterChangeListener(path, id) {
        if (this.changeListeners.has(path)) {
            this.changeListeners.get(path).delete(id);
            
            // Clean up empty maps
            if (this.changeListeners.get(path).size === 0) {
                this.changeListeners.delete(path);
            }
        }
    }
    
    /**
     * Notify listeners of a setting change
     * @private
     */
    notifyListeners(path, value) {
        // Notify specific path listeners
        if (this.changeListeners.has(path)) {
            this.changeListeners.get(path).forEach(callback => {
                try {
                    callback(value, path);
                } catch (error) {
                    console.error(`Error in settings change listener for ${path}:`, error);
                }
            });
        }
        
        // Notify parent path listeners
        const parts = path.split('.');
        if (parts.length > 1) {
            // Remove last part to get parent path
            parts.pop();
            const parentPath = parts.join('.');
            
            // Get parent value
            const parentValue = this.getSetting(parentPath);
            
            // Notify parent listeners
            this.notifyListeners(parentPath, parentValue);
        }
        
        // Notify global listeners
        if (this.changeListeners.has('*')) {
            this.changeListeners.get('*').forEach(callback => {
                try {
                    callback(value, path);
                } catch (error) {
                    console.error(`Error in global settings change listener:`, error);
                }
            });
        }
    }
    
    /**
     * Apply current graphics settings to renderer
     * @param {THREE.WebGLRenderer} renderer - The renderer to apply settings to
     */
    applyGraphicsSettings(renderer) {
        const graphics = this.settings.graphics;
        
        // Apply settings to renderer
        renderer.shadowMap.enabled = graphics.shadows;
        
        // Set shadow map type based on quality
        if (graphics.shadowQuality === 'low') {
            renderer.shadowMap.type = THREE.BasicShadowMap;
        } else if (graphics.shadowQuality === 'medium') {
            renderer.shadowMap.type = THREE.PCFShadowMap;
        } else if (graphics.shadowQuality === 'high') {
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        // Apply antialiasing
        // Note: Antialiasing requires renderer recreation, so this is just for reference
        // and should be checked during initialization
        
        // Apply vsync
        // In three.js, this is controlled by the requestAnimationFrame timing
        
        console.log('Graphics settings applied to renderer');
    }
    
    /**
     * Export settings to a JSON file for backup
     */
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'minecraft_clone_settings.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    /**
     * Import settings from a JSON file
     * @param {File} file - The settings JSON file to import
     * @returns {Promise} - Promise resolving when settings are imported
     */
    importSettings(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const importedSettings = JSON.parse(event.target.result);
                    this.settings = this.mergeSettings(this.defaultSettings, importedSettings);
                    this.saveSettings();
                    
                    // Notify of complete settings change
                    this.notifyListeners('reset', this.settings);
                    
                    resolve(true);
                } catch (error) {
                    console.error('Error parsing imported settings:', error);
                    reject(error);
                }
            };
            
            reader.onerror = (error) => {
                console.error('Error reading settings file:', error);
                reject(error);
            };
            
            reader.readAsText(file);
        });
    }
} 