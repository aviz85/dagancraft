/**
 * ParticleSystem - Creates and manages particle effects
 */
export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleSystems = new Map(); // All active particle systems
        this.textureCache = new Map(); // Cache for particle textures
        
        // Default particle settings
        this.defaults = {
            count: 50,
            size: 0.1,
            lifetime: 1.0,
            gravity: 9.8,
            speed: 2.0,
            damping: 0.95,
            color: 0xffffff,
            texture: null,
            blending: THREE.NormalBlending,
            transparent: true,
            opacity: 1.0
        };
    }
    
    /**
     * Load a particle texture
     * @param {string} name - Name for referencing the texture
     * @param {string} url - URL to the texture image
     * @returns {Promise} - Promise that resolves when texture is loaded
     */
    loadTexture(name, url) {
        return new Promise((resolve, reject) => {
            if (this.textureCache.has(name)) {
                resolve(this.textureCache.get(name));
                return;
            }
            
            const loader = new THREE.TextureLoader();
            loader.load(
                url,
                texture => {
                    this.textureCache.set(name, texture);
                    resolve(texture);
                },
                undefined,
                error => {
                    console.error(`Error loading particle texture ${url}:`, error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Create a particle emitter at a specific position
     * @param {string} id - Unique identifier for this particle system
     * @param {THREE.Vector3} position - Position to create particles at
     * @param {Object} options - Particle system options
     * @returns {Object} - The created particle system
     */
    createEmitter(id, position, options = {}) {
        // Merge options with defaults
        const settings = { ...this.defaults, ...options };
        
        // Create geometry for particles
        const geometry = new THREE.BufferGeometry();
        
        // Create arrays for position, velocity, color, size, and lifetime
        const positions = new Float32Array(settings.count * 3);
        const velocities = new Float32Array(settings.count * 3);
        const colors = new Float32Array(settings.count * 3);
        const sizes = new Float32Array(settings.count);
        const lifetimes = new Float32Array(settings.count);
        const startTimes = new Float32Array(settings.count);
        
        // Convert color to RGB
        const baseColor = new THREE.Color(settings.color);
        
        // Initialize particles
        for (let i = 0; i < settings.count; i++) {
            const i3 = i * 3;
            
            // Set initial position
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;
            
            // Set random velocity
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = settings.speed * (0.5 + Math.random() * 0.5);
            
            velocities[i3] = speed * Math.sin(phi) * Math.cos(theta);
            velocities[i3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
            velocities[i3 + 2] = speed * Math.cos(phi);
            
            // Add some variation to color
            const color = new THREE.Color(baseColor);
            color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);
            
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            // Set random size
            sizes[i] = settings.size * (0.5 + Math.random());
            
            // Set lifetime
            lifetimes[i] = settings.lifetime * (0.8 + Math.random() * 0.4);
            
            // Set start time (staggered start)
            startTimes[i] = Math.random() * 0.2 * settings.lifetime;
        }
        
        // Set geometry attributes
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        geometry.setAttribute('startTime', new THREE.BufferAttribute(startTimes, 1));
        
        // Create material
        const material = new THREE.PointsMaterial({
            size: 1.0, // Will be multiplied by size attribute
            vertexColors: true,
            transparent: settings.transparent,
            opacity: settings.opacity,
            blending: settings.blending,
            depthWrite: false
        });
        
        // Add texture if specified
        if (settings.texture) {
            material.map = settings.texture;
        }
        
        // Create the particle system
        const particles = new THREE.Points(geometry, material);
        particles.name = `particles_${id}`;
        
        // Add to scene
        this.scene.add(particles);
        
        // Store the particle system with additional data
        const system = {
            id,
            particles,
            settings,
            age: 0,
            complete: false
        };
        
        this.particleSystems.set(id, system);
        return system;
    }
    
    /**
     * Create block breaking particles
     * @param {THREE.Vector3} position - Position of the block
     * @param {number} color - Color of the block
     * @returns {Object} - The created particle system
     */
    createBlockBreakParticles(position, color) {
        const id = `block_break_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        return this.createEmitter(id, position, {
            count: 20,
            size: 0.08,
            lifetime: 0.8,
            gravity: 12,
            speed: 1.5,
            color,
            blending: THREE.AdditiveBlending
        });
    }
    
    /**
     * Create explosion particles
     * @param {THREE.Vector3} position - Position of the explosion
     * @param {number} size - Size of the explosion
     * @returns {Object} - The created particle system
     */
    createExplosionParticles(position, size = 1.0) {
        const id = `explosion_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        return this.createEmitter(id, position, {
            count: 100 * size,
            size: 0.15 * size,
            lifetime: 1.2,
            gravity: 5,
            speed: 5 * size,
            color: 0xff5500,
            blending: THREE.AdditiveBlending
        });
    }
    
    /**
     * Create particles for footsteps
     * @param {THREE.Vector3} position - Position of the footstep
     * @param {number} color - Color of the surface
     * @returns {Object} - The created particle system
     */
    createFootstepParticles(position, color) {
        const id = `footstep_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        return this.createEmitter(id, position, {
            count: 5,
            size: 0.05,
            lifetime: 0.5,
            gravity: 2,
            speed: 0.3,
            color,
            blending: THREE.NormalBlending
        });
    }
    
    /**
     * Create particles for item pickup
     * @param {THREE.Vector3} position - Position of the item
     * @returns {Object} - The created particle system
     */
    createItemPickupParticles(position) {
        const id = `item_pickup_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        return this.createEmitter(id, position, {
            count: 15,
            size: 0.07,
            lifetime: 0.7,
            gravity: -1, // Float upward
            speed: 0.8,
            color: 0xffffff,
            blending: THREE.AdditiveBlending
        });
    }
    
    /**
     * Update all particle systems
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update each particle system
        for (const [id, system] of this.particleSystems.entries()) {
            // Skip if already complete
            if (system.complete) continue;
            
            // Update system age
            system.age += deltaTime;
            
            // Check if system is expired
            if (system.age > system.settings.lifetime * 1.2) {
                this.removeParticleSystem(id);
                continue;
            }
            
            // Update particles
            this.updateParticles(system, deltaTime);
        }
    }
    
    /**
     * Update particles in a system
     * @param {Object} system - Particle system to update
     * @param {number} deltaTime - Time since last update in seconds
     * @private
     */
    updateParticles(system, deltaTime) {
        const geometry = system.particles.geometry;
        const positions = geometry.attributes.position.array;
        const velocities = geometry.attributes.velocity.array;
        const lifetimes = geometry.attributes.lifetime.array;
        const startTimes = geometry.attributes.startTime.array;
        const sizes = geometry.attributes.size.array;
        
        // Track if any particles are still alive
        let anyAlive = false;
        
        // Update each particle
        for (let i = 0; i < system.settings.count; i++) {
            const i3 = i * 3;
            
            // Calculate particle age
            const particleAge = system.age - startTimes[i];
            
            // Skip if not started yet
            if (particleAge < 0) {
                anyAlive = true;
                continue;
            }
            
            // Calculate life ratio (0 to 1)
            const lifeRatio = particleAge / lifetimes[i];
            
            // Skip if particle is dead
            if (lifeRatio >= 1.0) {
                // Hide dead particles
                positions[i3 + 1] = -1000;
                continue;
            }
            
            // Particle is alive
            anyAlive = true;
            
            // Apply gravity
            velocities[i3 + 1] -= system.settings.gravity * deltaTime;
            
            // Apply damping (air resistance)
            velocities[i3] *= system.settings.damping;
            velocities[i3 + 1] *= system.settings.damping;
            velocities[i3 + 2] *= system.settings.damping;
            
            // Update position based on velocity
            positions[i3] += velocities[i3] * deltaTime;
            positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
            
            // Shrink particle as it ages
            sizes[i] = system.settings.size * (1.0 - lifeRatio * 0.5);
        }
        
        // Mark as complete if no particles are alive
        if (!anyAlive) {
            system.complete = true;
        }
        
        // Mark attributes as needing update
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.size.needsUpdate = true;
    }
    
    /**
     * Remove a particle system
     * @param {string} id - ID of the system to remove
     */
    removeParticleSystem(id) {
        if (!this.particleSystems.has(id)) return;
        
        const system = this.particleSystems.get(id);
        
        // Remove from scene
        this.scene.remove(system.particles);
        
        // Dispose resources
        system.particles.geometry.dispose();
        system.particles.material.dispose();
        
        // Remove from map
        this.particleSystems.delete(id);
    }
    
    /**
     * Remove all particle systems
     */
    removeAll() {
        for (const id of this.particleSystems.keys()) {
            this.removeParticleSystem(id);
        }
    }
    
    /**
     * Set global visibility of particles
     * @param {boolean} visible - Whether particles should be visible
     */
    setVisibility(visible) {
        for (const system of this.particleSystems.values()) {
            system.particles.visible = visible;
        }
    }
    
    /**
     * Clean up and dispose resources
     */
    dispose() {
        this.removeAll();
        this.textureCache.clear();
    }
} 