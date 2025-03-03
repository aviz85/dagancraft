/**
 * Sky - Creates and manages the sky, weather effects, and celestial bodies
 */
export class Sky {
    constructor(scene) {
        // Core properties
        this.scene = scene;
        
        // Celestial objects
        this.sun = null;
        this.moon = null;
        this.stars = null;
        
        // Sky objects
        this.skyDome = null;
        this.skySphere = null;
        this.clouds = null;
        
        // Weather effects
        this.rain = null;
        this.snow = null;
        this.fog = null;
        
        // Time properties
        this.time = 0;             // Time of day (0-24000)
        this.dayLength = 20 * 60;  // Length of a full day in seconds (20 min)
        this.daySpeed = 1.0;       // Time multiplier
        this.paused = false;       // Whether time is paused
        
        // Colors
        this.skyColors = {
            day: new THREE.Color(0x87CEEB),    // Sky blue
            sunrise: new THREE.Color(0xFFA07A), // Light salmon
            sunset: new THREE.Color(0xFF6347),  // Tomato
            night: new THREE.Color(0x191970)    // Midnight blue
        };
        
        // Weather state
        this.currentWeather = 'clear';
        this.weatherIntensity = 0;
        
        // Initialize sky and celestial objects
        this.init();
    }
    
    /**
     * Initialize the sky and celestial objects
     */
    init() {
        console.log('Initializing sky and celestial objects...');
        
        // Create sky dome
        this.createSkyDome();
        
        // Create sun
        this.createSun();
        
        // Create moon
        this.createMoon();
        
        // Create stars
        this.createStars();
        
        // Create clouds
        this.createClouds();
        
        // Set up fog
        this.setupFog();
        
        // Set up weather effects
        this.setupWeatherEffects();
        
        console.log('Sky and celestial objects initialized');
    }
    
    /**
     * Create the sky dome
     * @private
     */
    createSkyDome() {
        const skyGeometry = new THREE.SphereGeometry(1000, 32, 32);
        
        // Make it render on the inside
        skyGeometry.scale(-1, 1, 1);
        
        // Create shader material for sky with color gradient
        const vertexShader = `
            varying vec3 vWorldPosition;
            varying vec3 vSunDirection;
            varying float vSunfade;
            varying vec3 vBetaR;
            varying vec3 vBetaM;
            varying float vSunE;
            
            uniform float luminance;
            uniform float mieCoefficient;
            uniform float mieDirectionalG;
            uniform vec3 sunPosition;
            
            void main() {
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                vSunDirection = normalize(sunPosition);
                
                vSunE = dot(vSunDirection, up);
                vSunfade = 1.0 - clamp(1.0 - exp((vSunE - 0.1) * 6.0), 0.0, 1.0);
                
                float rayleighCoefficient = 1.0;
                vBetaR = totalRayleigh * rayleighCoefficient;
                vBetaM = totalMie(turbidity) * mieCoefficient;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            varying vec3 vWorldPosition;
            varying vec3 vSunDirection;
            varying float vSunfade;
            varying vec3 vBetaR;
            varying vec3 vBetaM;
            varying float vSunE;
            
            uniform float luminance;
            uniform float mieCoefficient;
            uniform float mieDirectionalG;
            uniform vec3 sunPosition;
            uniform vec3 up;
            
            // Colors
            uniform vec3 zenith;
            uniform vec3 nadir;
            
            void main() {
                // Simple gradient sky
                vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
                float y = dot(viewDirection, vec3(0.0, 1.0, 0.0));
                
                // Blend between zenith and nadir colors based on view angle
                vec3 color = mix(nadir, zenith, clamp(y * 0.5 + 0.5, 0.0, 1.0));
                
                // Apply sun influence near the sun direction
                float sunInfluence = max(0.0, dot(viewDirection, vSunDirection));
                sunInfluence = pow(sunInfluence, 32.0);
                
                // Add sun glow
                color += vec3(1.0, 0.8, 0.6) * sunInfluence * 0.5;
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        
        // Simplified: Using a basic material instead of complex sky shader
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: this.skyColors.day,
            side: THREE.BackSide
        });
        
        this.skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
        this.skyDome.name = 'SkyDome';
        this.scene.add(this.skyDome);
    }
    
    /**
     * Create the sun
     * @private
     */
    createSun() {
        // Create a sun with a simple glow effect
        const sunGeometry = new THREE.SphereGeometry(40, 16, 16);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff80,
            transparent: true,
            opacity: 1
        });
        
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.position.set(0, 0, -900);
        this.sun.name = 'Sun';
        this.scene.add(this.sun);
        
        // Add sun light
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.copy(this.sun.position);
        this.sunLight.name = 'SunLight';
        
        // Set up shadows
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 1500;
        
        // Adjust shadow camera area
        const shadowSize = 200;
        this.sunLight.shadow.camera.left = -shadowSize;
        this.sunLight.shadow.camera.right = shadowSize;
        this.sunLight.shadow.camera.top = shadowSize;
        this.sunLight.shadow.camera.bottom = -shadowSize;
        
        this.scene.add(this.sunLight);
    }
    
    /**
     * Create the moon
     * @private
     */
    createMoon() {
        // Create a moon
        const moonGeometry = new THREE.SphereGeometry(30, 16, 16);
        const moonMaterial = new THREE.MeshBasicMaterial({
            color: 0xE6E6FA,
            transparent: true,
            opacity: 0.8
        });
        
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.position.set(0, 0, 900);
        this.moon.name = 'Moon';
        this.scene.add(this.moon);
        
        // Add moon light
        this.moonLight = new THREE.DirectionalLight(0x9090ff, 0.25);
        this.moonLight.position.copy(this.moon.position);
        this.moonLight.name = 'MoonLight';
        this.scene.add(this.moonLight);
    }
    
    /**
     * Create stars
     * @private
     */
    createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 2000;
        const positions = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);
        
        // Create random stars
        for (let i = 0; i < starsCount; i++) {
            // Distribute randomly on the sphere
            const i3 = i * 3;
            const radius = 900;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Random star sizes
            sizes[i] = Math.random() * 2 + 0.5;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create shader material for stars with twinkling effect
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            opacity: 0,
            sizeAttenuation: false
        });
        
        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.stars.name = 'Stars';
        this.scene.add(this.stars);
    }
    
    /**
     * Create clouds
     * @private
     */
    createClouds() {
        // Create a cloud layer with a simple textured plane
        const cloudGeometry = new THREE.PlaneGeometry(2000, 2000, 20, 20);
        const cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.clouds.rotation.x = Math.PI / 2;
        this.clouds.position.y = 200;
        this.clouds.name = 'Clouds';
        this.scene.add(this.clouds);
    }
    
    /**
     * Set up fog
     * @private
     */
    setupFog() {
        this.fog = new THREE.FogExp2(0xCCCCFF, 0.0005);
        this.scene.fog = this.fog;
    }
    
    /**
     * Set up weather effects
     * @private
     */
    setupWeatherEffects() {
        // Rain particles
        const rainGeometry = new THREE.BufferGeometry();
        const rainCount = 5000;
        const rainPositions = new Float32Array(rainCount * 3);
        const rainVelocities = new Float32Array(rainCount);
        
        // Create random rain drops
        for (let i = 0; i < rainCount; i++) {
            const i3 = i * 3;
            rainPositions[i3] = (Math.random() * 2 - 1) * 500;
            rainPositions[i3 + 1] = Math.random() * 500;
            rainPositions[i3 + 2] = (Math.random() * 2 - 1) * 500;
            
            // Rain velocities (for animation)
            rainVelocities[i] = 0.1 + Math.random() * 0.3;
        }
        
        rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
        rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(rainVelocities, 1));
        
        const rainMaterial = new THREE.PointsMaterial({
            color: 0x606060,
            size: 1.5,
            transparent: true,
            opacity: 0.6
        });
        
        this.rain = new THREE.Points(rainGeometry, rainMaterial);
        this.rain.name = 'Rain';
        this.rain.visible = false;
        this.scene.add(this.rain);
        
        // Snow particles (similar to rain but with different properties)
        const snowGeometry = new THREE.BufferGeometry();
        const snowCount = 3000;
        const snowPositions = new Float32Array(snowCount * 3);
        const snowVelocities = new Float32Array(snowCount);
        
        // Create random snowflakes
        for (let i = 0; i < snowCount; i++) {
            const i3 = i * 3;
            snowPositions[i3] = (Math.random() * 2 - 1) * 500;
            snowPositions[i3 + 1] = Math.random() * 500;
            snowPositions[i3 + 2] = (Math.random() * 2 - 1) * 500;
            
            // Snow velocities (for animation)
            snowVelocities[i] = 0.05 + Math.random() * 0.1;
        }
        
        snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
        snowGeometry.setAttribute('velocity', new THREE.BufferAttribute(snowVelocities, 1));
        
        const snowMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            transparent: true,
            opacity: 0.8
        });
        
        this.snow = new THREE.Points(snowGeometry, snowMaterial);
        this.snow.name = 'Snow';
        this.snow.visible = false;
        this.scene.add(this.snow);
    }
    
    /**
     * Update the sky based on time of day and weather
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (this.paused) return;
        
        // Update time of day
        this.time += deltaTime * this.daySpeed * (24000 / this.dayLength);
        if (this.time >= 24000) this.time -= 24000;
        
        // Update celestial bodies positions
        this.updateCelestialPositions();
        
        // Update sky color
        this.updateSkyColor();
        
        // Update weather effects
        this.updateWeather(deltaTime);
    }
    
    /**
     * Update the positions of the sun, moon, and stars
     * @private
     */
    updateCelestialPositions() {
        // Calculate sun and moon rotation
        const angle = (this.time / 24000) * Math.PI * 2;
        
        // Rotate sun
        if (this.sun) {
            this.sun.position.x = Math.cos(angle) * 900;
            this.sun.position.y = Math.sin(angle) * 900;
            
            // Update sun light position
            if (this.sunLight) {
                this.sunLight.position.copy(this.sun.position);
                this.sunLight.position.normalize();
            }
        }
        
        // Rotate moon (opposite to sun)
        if (this.moon) {
            this.moon.position.x = Math.cos(angle + Math.PI) * 900;
            this.moon.position.y = Math.sin(angle + Math.PI) * 900;
            
            // Update moon light position
            if (this.moonLight) {
                this.moonLight.position.copy(this.moon.position);
                this.moonLight.position.normalize();
            }
        }
        
        // Update light intensities based on time
        if (this.sunLight) {
            // Fade sunlight at night
            const sunHeight = Math.sin(angle);
            const sunIntensity = Math.max(0, sunHeight);
            this.sunLight.intensity = sunIntensity;
        }
        
        if (this.moonLight) {
            // Fade moonlight during day
            const moonHeight = Math.sin(angle + Math.PI);
            const moonIntensity = Math.max(0, moonHeight) * 0.25;
            this.moonLight.intensity = moonIntensity;
        }
        
        // Update stars visibility
        if (this.stars) {
            const isDaytime = this.time > 6000 && this.time < 18000;
            const fadeTransition = 1500; // Transition time in ticks
            
            if (isDaytime) {
                // Fade out stars during day
                const morningFade = Math.max(0, 1 - (this.time - 6000) / fadeTransition);
                const eveningFade = Math.max(0, (this.time - (18000 - fadeTransition)) / fadeTransition);
                this.stars.material.opacity = Math.max(morningFade, eveningFade);
            } else {
                // Fade in stars during night
                const nightProgress = this.time < 6000 ? 
                    Math.min(1, (6000 - this.time) / fadeTransition) : 
                    Math.min(1, (this.time - 18000) / fadeTransition);
                this.stars.material.opacity = nightProgress;
            }
        }
    }
    
    /**
     * Update the sky color based on time of day
     * @private
     */
    updateSkyColor() {
        if (!this.skyDome) return;
        
        // Determine time of day
        const isDay = this.time >= 6000 && this.time <= 18000;
        const isSunrise = this.time >= 5000 && this.time <= 7000;
        const isSunset = this.time >= 17000 && this.time <= 19000;
        
        // Current sky color
        let skyColor = new THREE.Color();
        
        if (isSunrise) {
            // Sunrise - blend from night to sunrise to day
            if (this.time < 6000) {
                // Night to sunrise
                const t = (this.time - 5000) / 1000;
                skyColor.copy(this.skyColors.night).lerp(this.skyColors.sunrise, t);
            } else {
                // Sunrise to day
                const t = (this.time - 6000) / 1000;
                skyColor.copy(this.skyColors.sunrise).lerp(this.skyColors.day, t);
            }
        } else if (isSunset) {
            // Sunset - blend from day to sunset to night
            if (this.time < 18000) {
                // Day to sunset
                const t = (this.time - 17000) / 1000;
                skyColor.copy(this.skyColors.day).lerp(this.skyColors.sunset, t);
            } else {
                // Sunset to night
                const t = (this.time - 18000) / 1000;
                skyColor.copy(this.skyColors.sunset).lerp(this.skyColors.night, t);
            }
        } else if (isDay) {
            // Regular daytime
            skyColor.copy(this.skyColors.day);
        } else {
            // Regular nighttime
            skyColor.copy(this.skyColors.night);
        }
        
        // Apply sky color
        this.skyDome.material.color.copy(skyColor);
        
        // Adjust fog color to match sky
        if (this.scene.fog) {
            this.scene.fog.color.copy(skyColor);
        }
    }
    
    /**
     * Update weather effects
     * @param {number} deltaTime - Time since last update in seconds
     * @private
     */
    updateWeather(deltaTime) {
        // Update rain animation
        if (this.rain && this.rain.visible) {
            const positions = this.rain.geometry.attributes.position.array;
            const velocities = this.rain.geometry.attributes.velocity.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                // Move raindrops down
                positions[i + 1] -= velocities[i / 3] * deltaTime * 200;
                
                // Reset position if below ground
                if (positions[i + 1] < 0) {
                    positions[i] = (Math.random() * 2 - 1) * 500;
                    positions[i + 1] = 500;
                    positions[i + 2] = (Math.random() * 2 - 1) * 500;
                }
            }
            
            this.rain.geometry.attributes.position.needsUpdate = true;
        }
        
        // Update snow animation
        if (this.snow && this.snow.visible) {
            const positions = this.snow.geometry.attributes.position.array;
            const velocities = this.snow.geometry.attributes.velocity.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                // Move snowflakes down with some side-to-side movement
                positions[i + 1] -= velocities[i / 3] * deltaTime * 50;
                positions[i] += Math.sin(this.time / 1000 + i) * deltaTime * 0.5;
                positions[i + 2] += Math.cos(this.time / 1000 + i) * deltaTime * 0.5;
                
                // Reset position if below ground
                if (positions[i + 1] < 0) {
                    positions[i] = (Math.random() * 2 - 1) * 500;
                    positions[i + 1] = 500;
                    positions[i + 2] = (Math.random() * 2 - 1) * 500;
                }
            }
            
            this.snow.geometry.attributes.position.needsUpdate = true;
        }
        
        // Update clouds animation
        if (this.clouds) {
            this.clouds.position.x = (this.clouds.position.x + deltaTime * 2) % 1000;
        }
    }
    
    /**
     * Set the weather type
     * @param {string} type - Weather type ('clear', 'rain', 'snow')
     * @param {number} intensity - Weather intensity (0-1)
     */
    setWeather(type, intensity = 0.5) {
        this.currentWeather = type;
        this.weatherIntensity = Math.max(0, Math.min(1, intensity));
        
        // Update visibility of weather effects
        if (this.rain) {
            this.rain.visible = type === 'rain';
            if (this.rain.visible && this.rain.material) {
                this.rain.material.opacity = 0.6 * this.weatherIntensity;
            }
        }
        
        if (this.snow) {
            this.snow.visible = type === 'snow';
            if (this.snow.visible && this.snow.material) {
                this.snow.material.opacity = 0.8 * this.weatherIntensity;
            }
        }
        
        // Adjust fog density based on weather
        if (this.scene.fog) {
            let baseFogDensity = 0.0005;
            
            switch (type) {
                case 'clear':
                    this.scene.fog.density = baseFogDensity;
                    break;
                case 'rain':
                    this.scene.fog.density = baseFogDensity + 0.001 * this.weatherIntensity;
                    break;
                case 'snow':
                    this.scene.fog.density = baseFogDensity + 0.0015 * this.weatherIntensity;
                    break;
            }
        }
        
        // Adjust cloud opacity based on weather
        if (this.clouds && this.clouds.material) {
            let baseOpacity = 0.3;
            
            switch (type) {
                case 'clear':
                    this.clouds.material.opacity = baseOpacity * (0.3 + this.weatherIntensity * 0.3);
                    break;
                case 'rain':
                    this.clouds.material.opacity = baseOpacity * (0.6 + this.weatherIntensity * 0.4);
                    break;
                case 'snow':
                    this.clouds.material.opacity = baseOpacity * (0.7 + this.weatherIntensity * 0.3);
                    break;
            }
        }
    }
    
    /**
     * Set the time of day
     * @param {number} time - Time in ticks (0-24000)
     */
    setTime(time) {
        this.time = Math.max(0, Math.min(24000, time));
        
        // Update celestial bodies immediately
        this.updateCelestialPositions();
        this.updateSkyColor();
    }
    
    /**
     * Set the day length
     * @param {number} minutes - Length of a full day in minutes
     */
    setDayLength(minutes) {
        this.dayLength = minutes * 60;
    }
    
    /**
     * Set time speed multiplier
     * @param {number} speed - Time speed multiplier
     */
    setTimeSpeed(speed) {
        this.daySpeed = speed;
    }
    
    /**
     * Pause time progression
     */
    pauseTime() {
        this.paused = true;
    }
    
    /**
     * Resume time progression
     */
    resumeTime() {
        this.paused = false;
    }
    
    /**
     * Toggle time progression
     * @returns {boolean} - New paused state
     */
    toggleTimePause() {
        this.paused = !this.paused;
        return this.paused;
    }
    
    /**
     * Get current time of day info
     * @returns {Object} - Time info
     */
    getTimeInfo() {
        // Convert ticks to hours and minutes
        const totalHours = (this.time / 24000) * 24;
        const hours = Math.floor(totalHours);
        const minutes = Math.floor((totalHours - hours) * 60);
        
        // Determine time of day category
        let period;
        if (this.time < 6000) period = 'night';
        else if (this.time < 7000) period = 'sunrise';
        else if (this.time < 17000) period = 'day';
        else if (this.time < 19000) period = 'sunset';
        else period = 'night';
        
        return {
            ticks: this.time,
            hours,
            minutes,
            period,
            isDay: period === 'day' || period === 'sunrise' || period === 'sunset',
            isNight: period === 'night'
        };
    }
    
    /**
     * Clean up and dispose resources
     */
    dispose() {
        // Dispose geometries and materials
        if (this.skyDome) {
            this.scene.remove(this.skyDome);
            this.skyDome.geometry.dispose();
            this.skyDome.material.dispose();
        }
        
        if (this.sun) {
            this.scene.remove(this.sun);
            this.sun.geometry.dispose();
            this.sun.material.dispose();
        }
        
        if (this.moon) {
            this.scene.remove(this.moon);
            this.moon.geometry.dispose();
            this.moon.material.dispose();
        }
        
        if (this.stars) {
            this.scene.remove(this.stars);
            this.stars.geometry.dispose();
            this.stars.material.dispose();
        }
        
        if (this.clouds) {
            this.scene.remove(this.clouds);
            this.clouds.geometry.dispose();
            this.clouds.material.dispose();
        }
        
        if (this.rain) {
            this.scene.remove(this.rain);
            this.rain.geometry.dispose();
            this.rain.material.dispose();
        }
        
        if (this.snow) {
            this.scene.remove(this.snow);
            this.snow.geometry.dispose();
            this.snow.material.dispose();
        }
        
        if (this.sunLight) {
            this.scene.remove(this.sunLight);
        }
        
        if (this.moonLight) {
            this.scene.remove(this.moonLight);
        }
        
        // Remove fog
        this.scene.fog = null;
    }
} 