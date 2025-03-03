/**
 * Enhanced PointerLockControls - Provides improved mouse-based camera controls with pointer lock
 * Includes smooth movement, configurable sensitivity, and improved event handling
 */
export class PointerLockControls {
    constructor(camera, domElement, settingsManager) {
        // Core properties
        this.camera = camera;
        this.domElement = domElement || document.body;
        this.settingsManager = settingsManager;
        
        // Default settings
        this.sensitivity = 0.3;          // Mouse sensitivity
        this.invertY = false;            // Invert Y axis
        this.maxPolarAngle = Math.PI;    // Maximum vertical angle down
        this.minPolarAngle = 0;          // Minimum vertical angle up
        this.pointerSpeed = 1.0;         // Pointer speed multiplier
        this.enabled = false;            // Whether controls are enabled
        
        // Apply settings
        this.applySettings();
        
        // Internal state
        this.isLocked = false;           // Whether pointer is locked
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        
        // Event binding
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onPointerlockChange = this.onPointerlockChange.bind(this);
        this.onPointerlockError = this.onPointerlockError.bind(this);
        
        // Event listeners
        this.connect();
        
        // Register settings change listener
        if (this.settingsManager) {
            this.settingsManager.registerChangeListener('controls', (settings) => {
                this.applySettings();
            });
        }
    }
    
    /**
     * Apply settings from settings manager
     * @private
     */
    applySettings() {
        if (this.settingsManager) {
            const controlSettings = this.settingsManager.getSetting('controls');
            
            if (controlSettings) {
                if (controlSettings.mouseSensitivity !== undefined) {
                    this.sensitivity = controlSettings.mouseSensitivity;
                }
                
                if (controlSettings.invertY !== undefined) {
                    this.invertY = controlSettings.invertY;
                }
            }
        }
    }
    
    /**
     * Connect event listeners
     */
    connect() {
        this.domElement.addEventListener('click', this.lock.bind(this));
        document.addEventListener('pointerlockchange', this.onPointerlockChange);
        document.addEventListener('pointerlockerror', this.onPointerlockError);
    }
    
    /**
     * Disconnect event listeners
     */
    disconnect() {
        this.domElement.removeEventListener('click', this.lock.bind(this));
        document.removeEventListener('pointerlockchange', this.onPointerlockChange);
        document.removeEventListener('pointerlockerror', this.onPointerlockError);
        document.removeEventListener('mousemove', this.onMouseMove);
    }
    
    /**
     * Handle mouse movement to rotate the camera
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    onMouseMove(event) {
        if (!this.isLocked || !this.enabled) return;
        
        // Get motion from pointer lock API
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        // Apply sensitivity and inversion
        const yFactor = this.invertY ? 1 : -1;
        
        // Update Euler rotation
        this.euler.setFromQuaternion(this.camera.quaternion);
        this.euler.y -= movementX * this.pointerSpeed * this.sensitivity * 0.002;
        this.euler.x += movementY * this.pointerSpeed * this.sensitivity * 0.002 * yFactor;
        
        // Apply constraints to vertical rotation
        this.euler.x = Math.max(Math.PI / 2 - this.maxPolarAngle, Math.min(Math.PI / 2 - this.minPolarAngle, this.euler.x));
        
        // Apply rotation to camera
        this.camera.quaternion.setFromEuler(this.euler);
        
        // Dispatch change event
        this.dispatchEvent({ type: 'change' });
    }
    
    /**
     * Handle pointer lock change events
     * @private
     */
    onPointerlockChange() {
        if (document.pointerLockElement === this.domElement) {
            document.addEventListener('mousemove', this.onMouseMove);
            this.isLocked = true;
            this.dispatchEvent({ type: 'lock' });
        } else {
            document.removeEventListener('mousemove', this.onMouseMove);
            this.isLocked = false;
            this.dispatchEvent({ type: 'unlock' });
        }
    }
    
    /**
     * Handle pointer lock error events
     * @private
     */
    onPointerlockError() {
        console.error('PointerLockControls: Error locking pointer');
        this.dispatchEvent({ type: 'error' });
    }
    
    /**
     * Request pointer lock
     */
    lock() {
        if (this.domElement.requestPointerLock) {
            this.domElement.requestPointerLock();
        }
    }
    
    /**
     * Exit pointer lock
     */
    unlock() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }
    
    /**
     * Toggle pointer lock
     */
    toggle() {
        if (this.isLocked) {
            this.unlock();
        } else {
            this.lock();
        }
    }
    
    /**
     * Get current lock state
     * @returns {boolean} - Whether the pointer is locked
     */
    getLockState() {
        return this.isLocked;
    }
    
    /**
     * Set sensitivity
     * @param {number} value - New sensitivity value
     */
    setSensitivity(value) {
        this.sensitivity = value;
        
        // Update settings manager if available
        if (this.settingsManager) {
            this.settingsManager.setSetting('controls.mouseSensitivity', value);
        }
    }
    
    /**
     * Set Y inversion
     * @param {boolean} value - Whether to invert Y axis
     */
    setInvertY(value) {
        this.invertY = value;
        
        // Update settings manager if available
        if (this.settingsManager) {
            this.settingsManager.setSetting('controls.invertY', value);
        }
    }
    
    /**
     * Dispose of controls and remove event listeners
     */
    dispose() {
        this.disconnect();
    }
    
    /**
     * Event dispatching
     * @param {Object} event - Event to dispatch
     * @private
     */
    dispatchEvent(event) {
        if (this.domElement) {
            const customEvent = new CustomEvent(event.type, {
                detail: {
                    controls: this,
                    originalEvent: event
                },
                bubbles: true,
                cancelable: true
            });
            
            this.domElement.dispatchEvent(customEvent);
        }
    }
    
    /**
     * Add an event listener
     * @param {string} type - Event type
     * @param {Function} listener - Event listener
     */
    addEventListener(type, listener) {
        if (this.domElement) {
            this.domElement.addEventListener(type, (event) => {
                if (event.detail && event.detail.controls === this) {
                    listener(event);
                }
            });
        }
    }
    
    /**
     * Remove an event listener
     * @param {string} type - Event type
     * @param {Function} listener - Event listener
     */
    removeEventListener(type, listener) {
        if (this.domElement) {
            this.domElement.removeEventListener(type, listener);
        }
    }
    
    /**
     * Enable controls
     */
    enable() {
        this.enabled = true;
    }
    
    /**
     * Disable controls
     */
    disable() {
        this.enabled = false;
    }
} 