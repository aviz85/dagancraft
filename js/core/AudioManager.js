/**
 * AudioManager - Responsible for loading and playing all game sounds
 * Handles background music, ambient sounds, and sound effects
 */
export class AudioManager {
    constructor() {
        // Main audio properties
        this.sounds = new Map();
        this.music = new Map();
        this.listener = new THREE.AudioListener();
        this.audioLoader = new THREE.AudioLoader();
        
        // Volume settings
        this.masterVolume = 1.0;
        this.sfxVolume = 1.0;
        this.musicVolume = 0.7;
        this.ambientVolume = 0.5;
        
        // Currently playing audio
        this.currentMusic = null;
        this.ambientSounds = [];
        
        // Sound categories for organization
        this.categories = {
            player: [], // Player sounds (walk, jump, etc)
            blocks: [], // Block interaction sounds
            environment: [], // Environment sounds
            ui: []      // UI sounds
        };
    }
    
    /**
     * Initialize the audio listener with a camera
     * @param {THREE.Camera} camera - The game camera to attach the listener to
     */
    init(camera) {
        camera.add(this.listener);
        console.log('Audio listener initialized');
    }
    
    /**
     * Load multiple sound files
     * @param {Array} soundsList - List of sound objects to load
     * @returns {Promise} - Promise resolving when all sounds are loaded
     */
    async loadSounds(soundsList) {
        const promises = soundsList.map(soundInfo => {
            return new Promise((resolve, reject) => {
                this.audioLoader.load(
                    soundInfo.url,
                    buffer => {
                        // Create audio object based on the type
                        let sound;
                        
                        if (soundInfo.type === 'music') {
                            // Music is played in background with loop
                            sound = new THREE.Audio(this.listener);
                            sound.setBuffer(buffer);
                            sound.setLoop(true);
                            sound.setVolume(this.musicVolume * this.masterVolume);
                            this.music.set(soundInfo.name, sound);
                        } else if (soundInfo.type === 'ambient') {
                            // Ambient sounds are positional and looped
                            sound = new THREE.Audio(this.listener);
                            sound.setBuffer(buffer);
                            sound.setLoop(true);
                            sound.setVolume(this.ambientVolume * this.masterVolume);
                            this.sounds.set(soundInfo.name, sound);
                        } else {
                            // Regular sound effects
                            sound = new THREE.Audio(this.listener);
                            sound.setBuffer(buffer);
                            sound.setLoop(false);
                            sound.setVolume(this.sfxVolume * this.masterVolume);
                            this.sounds.set(soundInfo.name, sound);
                            
                            // Add to category if specified
                            if (soundInfo.category && this.categories[soundInfo.category]) {
                                this.categories[soundInfo.category].push(soundInfo.name);
                            }
                        }
                        
                        resolve(sound);
                    },
                    undefined, // Progress callback not used
                    error => {
                        console.error(`Error loading sound ${soundInfo.url}:`, error);
                        reject(error);
                    }
                );
            });
        });
        
        try {
            await Promise.all(promises);
            console.log(`Loaded ${soundsList.length} sounds successfully`);
            return true;
        } catch (error) {
            console.error('Failed to load some sounds:', error);
            return false;
        }
    }
    
    /**
     * Play a sound effect
     * @param {string} name - Name of the sound to play
     * @param {Object} options - Options for playback (volume, delay)
     */
    playSound(name, options = {}) {
        if (!this.sounds.has(name)) {
            console.warn(`Sound ${name} not found`);
            return;
        }
        
        const sound = this.sounds.get(name);
        
        // If already playing, need to clone for overlapping sounds
        if (sound.isPlaying) {
            const soundClone = sound.clone();
            soundClone.play();
            
            // Clean up the clone when finished
            soundClone.onEnded = () => {
                soundClone.disconnect();
            };
            return;
        }
        
        // Custom volume if specified
        if (options.volume !== undefined) {
            sound.setVolume(options.volume * this.sfxVolume * this.masterVolume);
        }
        
        // Delay playback if specified
        if (options.delay) {
            setTimeout(() => sound.play(), options.delay * 1000);
        } else {
            sound.play();
        }
    }
    
    /**
     * Play a random sound from a category
     * @param {string} category - Category to choose from
     * @param {Object} options - Playback options
     */
    playRandomFromCategory(category, options = {}) {
        if (!this.categories[category] || this.categories[category].length === 0) {
            console.warn(`Sound category ${category} not found or empty`);
            return;
        }
        
        const soundNames = this.categories[category];
        const randomIndex = Math.floor(Math.random() * soundNames.length);
        this.playSound(soundNames[randomIndex], options);
    }
    
    /**
     * Play background music
     * @param {string} name - Name of the music track
     * @param {boolean} fadeIn - Whether to fade in the music
     */
    playMusic(name, fadeIn = true) {
        if (!this.music.has(name)) {
            console.warn(`Music track ${name} not found`);
            return;
        }
        
        // Stop currently playing music if any
        if (this.currentMusic && this.currentMusic.isPlaying) {
            if (fadeIn) {
                this.fadeOut(this.currentMusic, () => {
                    this.startNewMusic(name, fadeIn);
                });
            } else {
                this.currentMusic.stop();
                this.startNewMusic(name, fadeIn);
            }
        } else {
            this.startNewMusic(name, fadeIn);
        }
    }
    
    /**
     * Helper to start new music track
     * @private
     */
    startNewMusic(name, fadeIn) {
        const music = this.music.get(name);
        this.currentMusic = music;
        
        if (fadeIn) {
            // Start with volume 0 and fade in
            music.setVolume(0);
            music.play();
            this.fadeIn(music);
        } else {
            music.setVolume(this.musicVolume * this.masterVolume);
            music.play();
        }
    }
    
    /**
     * Fade in an audio track
     * @param {THREE.Audio} audio - Audio object to fade in
     */
    fadeIn(audio, callback, duration = 2) {
        const targetVolume = this.musicVolume * this.masterVolume;
        const initialVolume = audio.getVolume();
        const startTime = performance.now();
        
        const fadeStep = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const t = Math.min(elapsed / duration, 1);
            const newVolume = initialVolume + (targetVolume - initialVolume) * t;
            
            audio.setVolume(newVolume);
            
            if (t < 1) {
                requestAnimationFrame(fadeStep);
            } else if (callback) {
                callback();
            }
        };
        
        requestAnimationFrame(fadeStep);
    }
    
    /**
     * Fade out an audio track
     * @param {THREE.Audio} audio - Audio object to fade out
     */
    fadeOut(audio, callback, duration = 1.5) {
        if (!audio.isPlaying) {
            if (callback) callback();
            return;
        }
        
        const initialVolume = audio.getVolume();
        const startTime = performance.now();
        
        const fadeStep = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const t = Math.min(elapsed / duration, 1);
            const newVolume = initialVolume * (1 - t);
            
            audio.setVolume(newVolume);
            
            if (t < 1) {
                requestAnimationFrame(fadeStep);
            } else {
                audio.stop();
                if (callback) callback();
            }
        };
        
        requestAnimationFrame(fadeStep);
    }
    
    /**
     * Pause all currently playing sounds
     */
    pauseAll() {
        // Pause music
        if (this.currentMusic && this.currentMusic.isPlaying) {
            this.currentMusic.pause();
        }
        
        // Pause all ambient sounds
        this.ambientSounds.forEach(sound => {
            if (sound.isPlaying) sound.pause();
        });
        
        // Pause all sound effects that are still playing
        this.sounds.forEach(sound => {
            if (sound.isPlaying) sound.pause();
        });
    }
    
    /**
     * Resume all paused sounds
     */
    resumeAll() {
        // Resume music
        if (this.currentMusic && !this.currentMusic.isPlaying) {
            this.currentMusic.play();
        }
        
        // Resume ambient sounds
        this.ambientSounds.forEach(sound => {
            if (!sound.isPlaying) sound.play();
        });
    }
    
    /**
     * Set master volume and update all sounds
     * @param {number} volume - New master volume (0.0 to 1.0)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(volume, 1));
        
        // Update all sound volumes
        this.updateAllVolumes();
    }
    
    /**
     * Set sfx volume and update all sounds
     * @param {number} volume - New sfx volume (0.0 to 1.0)
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(volume, 1));
        
        // Update only sfx volumes
        this.sounds.forEach(sound => {
            if (!this.ambientSounds.includes(sound)) {
                sound.setVolume(this.sfxVolume * this.masterVolume);
            }
        });
    }
    
    /**
     * Set music volume and update music tracks
     * @param {number} volume - New music volume (0.0 to 1.0)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(volume, 1));
        
        // Update all music volumes
        this.music.forEach(music => {
            music.setVolume(this.musicVolume * this.masterVolume);
        });
    }
    
    /**
     * Set ambient volume and update ambient sounds
     * @param {number} volume - New ambient volume (0.0 to 1.0)
     */
    setAmbientVolume(volume) {
        this.ambientVolume = Math.max(0, Math.min(volume, 1));
        
        // Update all ambient volumes
        this.ambientSounds.forEach(sound => {
            sound.setVolume(this.ambientVolume * this.masterVolume);
        });
    }
    
    /**
     * Update all sound volumes based on current settings
     * @private
     */
    updateAllVolumes() {
        // Update music volumes
        this.music.forEach(music => {
            music.setVolume(this.musicVolume * this.masterVolume);
        });
        
        // Update ambient volumes
        this.ambientSounds.forEach(sound => {
            sound.setVolume(this.ambientVolume * this.masterVolume);
        });
        
        // Update sfx volumes
        this.sounds.forEach(sound => {
            if (!this.ambientSounds.includes(sound)) {
                sound.setVolume(this.sfxVolume * this.masterVolume);
            }
        });
    }
    
    /**
     * Play a positional sound in the 3D world
     * @param {string} name - Name of the sound to play
     * @param {THREE.Vector3} position - Position in 3D space
     * @param {Object} options - Playback options
     */
    playPositionalSound(name, position, options = {}) {
        if (!this.sounds.has(name)) {
            console.warn(`Sound ${name} not found`);
            return;
        }
        
        // Create a positional audio source at the specified position
        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(this.sounds.get(name).buffer);
        sound.setRefDistance(options.refDistance || 10);
        sound.setRolloffFactor(options.rolloffFactor || 1);
        sound.setVolume((options.volume || 1) * this.sfxVolume * this.masterVolume);
        
        // Create temporary object to hold the sound
        const soundObject = new THREE.Object3D();
        soundObject.position.copy(position);
        soundObject.add(sound);
        
        // Add to scene
        if (options.scene) {
            options.scene.add(soundObject);
            
            // Remove after playing
            sound.onEnded = () => {
                options.scene.remove(soundObject);
                sound.disconnect();
            };
            
            sound.play();
        } else {
            console.warn('Scene not provided for positional sound');
        }
        
        return sound;
    }
    
    /**
     * Clean up and dispose of all audio resources
     */
    dispose() {
        // Stop all sounds
        this.sounds.forEach(sound => {
            if (sound.isPlaying) sound.stop();
            sound.disconnect();
        });
        
        this.music.forEach(music => {
            if (music.isPlaying) music.stop();
            music.disconnect();
        });
        
        // Clear all collections
        this.sounds.clear();
        this.music.clear();
        this.ambientSounds = [];
        this.currentMusic = null;
        
        Object.keys(this.categories).forEach(key => {
            this.categories[key] = [];
        });
    }
} 