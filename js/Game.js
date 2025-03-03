/**
 * Game - The main game class that coordinates all game components
 */
import { ResourceManager } from './core/ResourceManager.js';
import { AudioManager } from './core/AudioManager.js';
import { SettingsManager } from './core/SettingsManager.js';
import { PointerLockControls } from './core/PointerLockControls.js';
import { World } from './world/World.js';
import { Sky } from './world/Sky.js';
import { Player } from './entities/Player.js';

export class Game {
    constructor() {
        // Core properties
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Game components
        this.clock = new THREE.Clock();
        this.controls = null;
        this.player = null;
        this.world = null;
        this.sky = null;
        
        // System managers
        this.resourceManager = null;
        this.audioManager = null;
        this.settingsManager = null;
        
        // Lighting
        this.ambientLight = null;
        this.directionalLight = null;
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.isLoading = false;
        
        // Performance
        this.stats = null;
        this.lastTime = 0;
        this.frameCounter = 0;
        this.fps = 0;
        this.updateFPS = true;
        
        // Bind methods to this
        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }
    
    /**
     * Initialize the game
     * @param {Object} options - Game initialization options
     * @returns {Promise} - Promise that resolves when initialization is complete
     */
    async init(options = {}) {
        console.log('Initializing game...');
        this.isLoading = true;
        
        try {
            // Create system managers
            await this.createManagers();
            
            // Create the 3D scene
            this.createScene();
            
            // Create renderer
            this.createRenderer();
            
            // Create camera
            this.createCamera();
            
            // Create lighting
            this.createLighting();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Create game components
            await this.createGameComponents();
            
            // Performance monitoring
            this.setupPerformanceMonitoring();
            
            // Set initial resize
            this.onWindowResize();
            
            this.isLoading = false;
            console.log('Game initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Error initializing game:', error);
            this.isLoading = false;
            return false;
        }
    }
    
    /**
     * Create system managers
     * @private
     */
    async createManagers() {
        // Create settings manager
        this.settingsManager = new SettingsManager();
        this.settingsManager.init();
        
        // Create resource manager
        this.resourceManager = new ResourceManager();
        
        // Load resources
        await this.loadResources();
        
        // Create audio manager
        this.audioManager = new AudioManager();
    }
    
    /**
     * Load game resources
     * @private
     */
    async loadResources() {
        // Define textures to load
        const textures = [
            { name: 'dirt', url: 'assets/textures/dirt.png' },
            { name: 'grass_top', url: 'assets/textures/grass_top.png' },
            { name: 'grass_side', url: 'assets/textures/grass_side.png' },
            { name: 'stone', url: 'assets/textures/stone.png' },
            { name: 'sand', url: 'assets/textures/sand.png' },
            { name: 'water', url: 'assets/textures/water.png' },
            { name: 'wood', url: 'assets/textures/wood.png' },
            { name: 'leaves', url: 'assets/textures/leaves.png' }
        ];
        
        // Load textures
        await this.resourceManager.loadTextures(textures);
    }
    
    /**
     * Create the 3D scene
     * @private
     */
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
    }
    
    /**
     * Create the WebGL renderer
     * @private
     */
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.settingsManager.getSetting('graphics.antialiasing'),
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = this.settingsManager.getSetting('graphics.shadows');
        
        // Set shadow map type based on quality setting
        const shadowQuality = this.settingsManager.getSetting('graphics.shadowQuality');
        if (shadowQuality === 'low') {
            this.renderer.shadowMap.type = THREE.BasicShadowMap;
        } else if (shadowQuality === 'medium') {
            this.renderer.shadowMap.type = THREE.PCFShadowMap;
        } else if (shadowQuality === 'high') {
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        // Add renderer to DOM
        document.getElementById('game-container').appendChild(this.renderer.domElement);
    }
    
    /**
     * Create the camera
     * @private
     */
    createCamera() {
        const fov = this.settingsManager.getSetting('graphics.fov');
        const aspect = window.innerWidth / window.innerHeight;
        
        this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
        this.camera.position.set(0, 100, 0);
        this.camera.lookAt(0, 100, -1);
    }
    
    /**
     * Create lighting
     * @private
     */
    createLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);
        
        // Directional light
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        this.directionalLight.position.set(1, 1, 0.5);
        this.directionalLight.castShadow = true;
        
        // Configure shadow properties
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -50;
        this.directionalLight.shadow.camera.right = 50;
        this.directionalLight.shadow.camera.top = 50;
        this.directionalLight.shadow.camera.bottom = -50;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        
        this.scene.add(this.directionalLight);
    }
    
    /**
     * Set up event listeners
     * @private
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.onWindowResize);
        
        // Keyboard events
        document.addEventListener('keydown', this.onKeyDown);
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', () => {
            this.isPaused = !this.controls.getLockState();
            
            // Pause audio when game is paused
            if (this.isPaused) {
                if (this.audioManager) this.audioManager.pauseAll();
            } else {
                if (this.audioManager) this.audioManager.resumeAll();
            }
        });
    }
    
    /**
     * Create game components
     * @private
     */
    async createGameComponents() {
        // Create controls
        this.controls = new PointerLockControls(this.camera, this.renderer.domElement, this.settingsManager);
        this.controls.enable();
        
        // Initialize audio with camera
        if (this.audioManager) {
            this.audioManager.init(this.camera);
            
            // Load sounds
            const sounds = [
                // Examples for loading sounds
                { name: 'walk_dirt', url: 'assets/sounds/walk_dirt.mp3', category: 'player' },
                { name: 'break_block', url: 'assets/sounds/break_block.mp3', category: 'blocks' },
                { name: 'place_block', url: 'assets/sounds/place_block.mp3', category: 'blocks' },
                { name: 'jump', url: 'assets/sounds/jump.mp3', category: 'player' },
                { name: 'background', url: 'assets/sounds/background.mp3', type: 'music' }
            ];
            
            // Uncomment to load sounds when they're available
            // await this.audioManager.loadSounds(sounds);
        }
        
        // Create sky
        this.sky = new Sky(this.scene);
        this.sky.setTime(8000); // Set to morning
        
        // Create world
        this.world = new World(this.scene, this.resourceManager);
        this.world.init({
            renderDistance: this.settingsManager.getSetting('graphics.renderDistance')
        });
        
        // Create player
        this.player = new Player(this.camera, this.controls, this.world);
        this.player.init();
    }
    
    /**
     * Set up performance monitoring
     * @private
     */
    setupPerformanceMonitoring() {
        // Simple FPS counter
        setInterval(() => {
            this.fps = this.frameCounter;
            this.frameCounter = 0;
            
            // Update FPS in UI if enabled
            if (this.updateFPS) {
                const fpsElement = document.getElementById('fps-counter');
                if (fpsElement) {
                    fpsElement.textContent = `${this.fps} FPS`;
                }
            }
        }, 1000);
    }
    
    /**
     * Handle window resize
     * @private
     */
    onWindowResize() {
        // Update camera
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Handle keyboard input
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    onKeyDown(event) {
        if (event.code === 'Escape') {
            if (this.controls.getLockState()) {
                this.controls.unlock();
            }
        } else if (event.code === 'KeyP' || event.code === 'Pause') {
            this.togglePause();
        } else if (event.code === 'KeyF' && event.altKey) {
            // Toggle FPS counter
            this.updateFPS = !this.updateFPS;
        }
    }
    
    /**
     * Start the game
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.clock.start();
        
        // Lock controls
        if (this.controls) {
            this.controls.lock();
        }
        
        // Play background music
        if (this.audioManager) {
            this.audioManager.playMusic('background', true);
        }
        
        // Start animation loop
        this.animate();
        
        console.log('Game started');
    }
    
    /**
     * Main animation loop
     * @private
     */
    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(this.animate);
        
        const time = performance.now();
        this.frameCounter++;
        
        if (!this.isPaused) {
            // Get delta time
            const deltaTime = this.clock.getDelta();
            
            // Update game components
            this.updateGame(deltaTime);
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        this.lastTime = time;
    }
    
    /**
     * Update all game components
     * @param {number} deltaTime - Time since last update in seconds
     * @private
     */
    updateGame(deltaTime) {
        // Update player
        if (this.player) {
            this.player.update(deltaTime);
        }
        
        // Update world
        if (this.world) {
            this.world.update(deltaTime, this.player.position);
        }
        
        // Update sky
        if (this.sky) {
            this.sky.update(deltaTime);
        }
        
        // Update UI elements
        this.updateUI();
    }
    
    /**
     * Update UI elements
     * @private
     */
    updateUI() {
        // Update coordinates display
        if (this.player) {
            const coords = document.getElementById('coordinates');
            if (coords) {
                const pos = this.player.position;
                coords.textContent = `X: ${Math.floor(pos.x)} Y: ${Math.floor(pos.y)} Z: ${Math.floor(pos.z)}`;
            }
            
            // Update health bar
            const healthBar = document.getElementById('health-bar');
            if (healthBar) {
                // Implementation depends on health bar HTML structure
            }
        }
    }
    
    /**
     * Pause the game
     */
    pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.isPaused = true;
        
        // Unlock controls
        if (this.controls) {
            this.controls.unlock();
        }
        
        // Pause audio
        if (this.audioManager) {
            this.audioManager.pauseAll();
        }
        
        // Pause sky time progression
        if (this.sky) {
            this.sky.pauseTime();
        }
        
        console.log('Game paused');
    }
    
    /**
     * Resume the game
     */
    resume() {
        if (!this.isRunning || !this.isPaused) return;
        
        this.isPaused = false;
        
        // Lock controls
        if (this.controls) {
            this.controls.lock();
        }
        
        // Resume audio
        if (this.audioManager) {
            this.audioManager.resumeAll();
        }
        
        // Resume sky time progression
        if (this.sky) {
            this.sky.resumeTime();
        }
        
        console.log('Game resumed');
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }
    
    /**
     * Stop the game
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.isPaused = false;
        this.clock.stop();
        
        // Unlock controls
        if (this.controls) {
            this.controls.unlock();
        }
        
        // Stop audio
        if (this.audioManager) {
            this.audioManager.pauseAll();
        }
        
        console.log('Game stopped');
    }
    
    /**
     * Save the game state
     * @returns {Object} - Game state data
     */
    saveGame() {
        const gameData = {
            version: 1,
            timestamp: Date.now(),
            player: this.player ? this.player.save() : null,
            world: {
                seed: this.world ? this.world.seed : Math.floor(Math.random() * 2147483647),
                time: this.sky ? this.sky.time : 8000,
                weather: this.sky ? this.sky.currentWeather : 'clear',
                blocks: this.world ? this.world.save().blocks : []
            }
        };
        
        // Save to local storage
        try {
            localStorage.setItem('minecraft_clone_save', JSON.stringify(gameData));
            console.log('Game saved successfully');
            return gameData;
        } catch (error) {
            console.error('Error saving game:', error);
            return null;
        }
    }
    
    /**
     * Load a saved game
     * @param {Object} saveData - Saved game data (optional, will load from storage if not provided)
     * @returns {boolean} - Whether the load was successful
     */
    loadGame(saveData = null) {
        try {
            // If no save data provided, try to load from storage
            if (!saveData) {
                const savedData = localStorage.getItem('minecraft_clone_save');
                if (!savedData) {
                    console.warn('No saved game found');
                    return false;
                }
                
                saveData = JSON.parse(savedData);
            }
            
            // Check version compatibility
            if (saveData.version !== 1) {
                console.warn('Incompatible save version');
                return false;
            }
            
            // Load player data
            if (saveData.player && this.player) {
                this.player.load(saveData.player);
            }
            
            // Load world data
            if (saveData.world) {
                // Set seed and regenerate world
                if (this.world) {
                    this.world.load(saveData.world);
                }
                
                // Set time and weather
                if (this.sky) {
                    this.sky.setTime(saveData.world.time || 8000);
                    this.sky.setWeather(saveData.world.weather || 'clear');
                }
            }
            
            console.log('Game loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading game:', error);
            return false;
        }
    }
    
    /**
     * Reset the game to a new state
     */
    resetGame() {
        // Stop the current game
        this.stop();
        
        // Clear the scene
        while (this.scene.children.length > 0) {
            const object = this.scene.children[0];
            this.scene.remove(object);
        }
        
        // Create new components
        this.createLighting();
        this.createGameComponents();
        
        // Start the game again
        this.start();
        
        console.log('Game reset');
    }
    
    /**
     * Clean up and dispose resources
     */
    dispose() {
        // Stop the game
        this.stop();
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        document.removeEventListener('keydown', this.onKeyDown);
        
        // Dispose components
        if (this.controls) {
            this.controls.dispose();
        }
        
        if (this.world) {
            this.world.clear();
        }
        
        if (this.sky) {
            this.sky.dispose();
        }
        
        if (this.audioManager) {
            this.audioManager.dispose();
        }
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            
            // Remove from DOM
            const element = this.renderer.domElement;
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
        
        console.log('Game disposed');
    }
} 