/**
 * Application - Main entry point for the game
 * Manages game state, loading assets, and UI interactions
 */

// Check if THREE is available globally first
if (typeof THREE === 'undefined') {
    console.error('THREE.js library not found! Make sure it is loaded before this script.');
    document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: sans-serif;">' +
        '<h1>Error: THREE.js not loaded</h1>' +
        '<p>The THREE.js library could not be found. Please check that it is loaded before the app.js module.</p>' +
        '</div>';
    throw new Error('THREE.js library not found');
}

import { Game } from './Game.js';
import { UIManager } from './ui/UIManager.js';
import { ResourceManager } from './core/ResourceManager.js';
import { AudioManager } from './core/AudioManager.js';
import { SettingsManager } from './core/SettingsManager.js';

class Application {
    constructor() {
        // Core components
        this.game = null;
        this.settingsManager = null;
        this.resourceManager = null;
        this.audioManager = null;
        this.uiManager = null;
        
        // Application state
        this.isLoading = false;
        this.hasExistingSave = false;
        
        // Bind methods to this
        this.init = this.init.bind(this);
        this.startGame = this.startGame.bind(this);
        this.resumeGame = this.resumeGame.bind(this);
        this.openOptions = this.openOptions.bind(this);
        this.saveGame = this.saveGame.bind(this);
        this.exitGame = this.exitGame.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing application...');
        
        // Create settings manager first (needed by other components)
        this.settingsManager = new SettingsManager();
        this.settingsManager.init();
        
        // Create UI Manager
        this.uiManager = new UIManager(this.settingsManager);
        this.uiManager.init();
        
        // Check for existing save
        this.hasExistingSave = localStorage.getItem('minecraft_clone_save') !== null;
        if (this.hasExistingSave) {
            // Enable load game button if there's a save
            const loadGameButton = document.getElementById('load-game');
            if (loadGameButton) {
                loadGameButton.disabled = false;
            }
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Show main menu
        this.uiManager.showScreen('main-menu');
        
        console.log('Application initialized');
    }
    
    /**
     * Set up UI event listeners
     * @private
     */
    setupEventListeners() {
        // Main menu
        const startGameButton = document.getElementById('start-game');
        const loadGameButton = document.getElementById('load-game');
        const optionsButton = document.getElementById('options');
        
        if (startGameButton) {
            startGameButton.addEventListener('click', this.startGame);
        }
        
        if (loadGameButton) {
            loadGameButton.addEventListener('click', () => {
                this.startGame(true);
            });
        }
        
        if (optionsButton) {
            optionsButton.addEventListener('click', this.openOptions);
        }
        
        // Pause menu
        const resumeButton = document.getElementById('resume-game');
        const pauseOptionsButton = document.getElementById('pause-options');
        const saveButton = document.getElementById('save-world');
        const exitButton = document.getElementById('exit-game');
        
        if (resumeButton) {
            resumeButton.addEventListener('click', this.resumeGame);
        }
        
        if (pauseOptionsButton) {
            pauseOptionsButton.addEventListener('click', this.openOptions);
        }
        
        if (saveButton) {
            saveButton.addEventListener('click', this.saveGame);
        }
        
        if (exitButton) {
            exitButton.addEventListener('click', this.exitGame);
        }
        
        // Options tabs
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Update active tab
                tabButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                
                // Show selected tab content
                const tabName = button.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.style.display = 'none';
                });
                document.getElementById(`${tabName}-tab`).style.display = 'block';
            });
        });
        
        // Options back button
        const optionsBackButton = document.getElementById('options-back');
        if (optionsBackButton) {
            optionsBackButton.addEventListener('click', () => {
                // Go back to previous screen
                if (this.game && this.game.isRunning) {
                    this.uiManager.showScreen('pause-menu');
                } else {
                    this.uiManager.showScreen('main-menu');
                }
            });
        }
        
        // Reset options button
        const resetOptionsButton = document.getElementById('reset-options');
        if (resetOptionsButton) {
            resetOptionsButton.addEventListener('click', () => {
                if (this.settingsManager) {
                    this.settingsManager.resetToDefaults();
                    
                    // Update UI with reset values
                    document.querySelectorAll('[data-setting]').forEach(input => {
                        const settingPath = input.dataset.setting;
                        const value = this.settingsManager.getSetting(settingPath);
                        
                        if (value !== undefined) {
                            if (input.type === 'checkbox') {
                                input.checked = value;
                            } else {
                                input.value = value;
                            }
                            
                            // Update display values
                            if (input.nextElementSibling && input.nextElementSibling.classList.contains('value-display')) {
                                if (settingPath === 'graphics.fov') {
                                    input.nextElementSibling.textContent = `${value}°`;
                                } else if (settingPath.includes('Volume')) {
                                    input.nextElementSibling.textContent = `${Math.round(value * 100)}%`;
                                } else if (settingPath === 'graphics.renderDistance') {
                                    input.nextElementSibling.textContent = `${value} chunks`;
                                } else {
                                    input.nextElementSibling.textContent = value;
                                }
                            }
                        }
                    });
                    
                    // Show notification
                    this.uiManager.showNotification('Settings reset to defaults', 'info');
                }
            });
        }
        
        // Update value displays for range inputs
        document.querySelectorAll('input[type="range"]').forEach(input => {
            const updateDisplay = () => {
                const display = input.nextElementSibling;
                if (display && display.classList.contains('value-display')) {
                    const settingPath = input.dataset.setting;
                    if (settingPath === 'graphics.fov') {
                        display.textContent = `${input.value}°`;
                    } else if (settingPath.includes('Volume')) {
                        display.textContent = `${Math.round(input.value * 100)}%`;
                    } else if (settingPath === 'graphics.renderDistance') {
                        display.textContent = `${input.value} chunks`;
                    } else {
                        display.textContent = input.value;
                    }
                }
            };
            
            input.addEventListener('input', updateDisplay);
            updateDisplay(); // Initial update
        });
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown);
    }
    
    /**
     * Start or load a game
     * @param {boolean} loadSave - Whether to load a saved game
     */
    async startGame(loadSave = false) {
        if (this.game) return;
        
        // Show loading screen
        this.uiManager.showScreen('loading');
        this.isLoading = true;
        
        // Simulate loading progress
        this.simulateLoading();
        
        try {
            // Create and initialize game
            this.game = new Game();
            const initSuccess = await this.game.init();
            
            if (!initSuccess) {
                throw new Error('Game initialization failed');
            }
            
            // Load saved game if requested
            if (loadSave && this.hasExistingSave) {
                const loadSuccess = this.game.loadGame();
                
                if (loadSuccess) {
                    this.uiManager.showNotification('Game loaded successfully', 'info');
                } else {
                    this.uiManager.showNotification('Failed to load game', 'error');
                }
            }
            
            // Start the game
            this.game.start();
            
            // Show game UI
            this.uiManager.showScreen('game');
            this.isLoading = false;
        } catch (error) {
            console.error('Error starting game:', error);
            this.uiManager.showNotification('Error starting game', 'error');
            this.uiManager.showScreen('main-menu');
            this.isLoading = false;
        }
    }
    
    /**
     * Simulate loading progress
     * @private
     */
    simulateLoading() {
        const progressBar = document.getElementById('loading-progress');
        const loadingText = document.getElementById('loading-text');
        const loadingTexts = [
            'Generating terrain...',
            'Spawning trees...',
            'Creating water...',
            'Adding clouds...',
            'Preparing physics...',
            'Setting up game world...'
        ];
        
        let progress = 0;
        const totalSteps = loadingTexts.length;
        const interval = setInterval(() => {
            if (!this.isLoading) {
                clearInterval(interval);
                return;
            }
            
            // Calculate progress percentage
            progress++;
            const percentage = Math.min(100, Math.floor((progress / totalSteps) * 100));
            
            // Update progress bar
            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
            }
            
            // Update loading text
            if (loadingText && progress <= totalSteps) {
                loadingText.textContent = loadingTexts[progress - 1];
            }
            
            if (progress >= totalSteps) {
                clearInterval(interval);
            }
        }, 500);
    }
    
    /**
     * Resume the game from pause
     */
    resumeGame() {
        if (!this.game) return;
        
        this.game.resume();
        this.uiManager.showScreen('game');
    }
    
    /**
     * Open options menu
     */
    openOptions() {
        this.uiManager.showScreen('options-menu');
    }
    
    /**
     * Save the current game
     */
    saveGame() {
        if (!this.game) return;
        
        const saveData = this.game.saveGame();
        
        if (saveData) {
            this.hasExistingSave = true;
            this.uiManager.showNotification('Game saved successfully', 'info');
        } else {
            this.uiManager.showNotification('Failed to save game', 'error');
        }
    }
    
    /**
     * Exit the current game
     */
    exitGame() {
        if (!this.game) return;
        
        // Ask for confirmation
        if (confirm('Are you sure you want to exit? Unsaved progress will be lost.')) {
            this.game.dispose();
            this.game = null;
            
            // Return to main menu
            this.uiManager.showScreen('main-menu');
        }
    }
    
    /**
     * Handle keyboard events
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    handleKeyDown(event) {
        // Only handle global shortcuts here
        if (event.code === 'KeyP' && event.ctrlKey) {
            // Ctrl+P to pause/resume game
            if (this.game && this.game.isRunning) {
                if (this.game.isPaused) {
                    this.resumeGame();
                } else {
                    this.game.pause();
                    this.uiManager.showScreen('pause-menu');
                }
            }
        } else if (event.code === 'KeyS' && event.ctrlKey) {
            // Ctrl+S to save game
            event.preventDefault();
            if (this.game && this.game.isRunning) {
                this.saveGame();
            }
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application');
    console.log('THREE.js version:', THREE.REVISION);
    
    try {
        const app = new Application();
        app.init();
        
        // Add direct click handler to instructions div for pointer lock
        const instructionsElement = document.getElementById('instructions');
        if (instructionsElement) {
            instructionsElement.addEventListener('click', () => {
                console.log('Instructions clicked, attempting to start game');
                if (app.game) {
                    app.game.controls.lock();
                } else {
                    // No game yet, start a new one
                    app.startGame();
                }
            });
        }
        
        // Export application for debugging
        window.MinecraftClone = { Application, app };
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: sans-serif;">' +
            '<h1>Error: Application initialization failed</h1>' +
            '<p>Error details: ' + error.message + '</p>' +
            '<p>Check the browser console for more information.</p>' +
            '</div>';
    }
});