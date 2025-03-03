/**
 * מחלקת Sky - אחראית על השמיים, שמש, ירח, כוכבים ועננים
 */
class Sky {
    constructor(scene) {
        this.scene = scene;
        this.skyRadius = 500;
        this.gameTime = 0;
        
        // יצירת שמיים בסיסיים
        this.createSky();
        
        // יצירת כוכבים
        this.createStars();
        
        // יצירת שמש וירח
        this.createSunAndMoon();
        
        // יצירת עננים
        this.createClouds();
    }
    
    createSky() {
        const skyGeometry = new THREE.SphereGeometry(this.skyRadius, 32, 32);
        // We're turning the sphere inside out by scaling it negatively
        skyGeometry.scale(-1, 1, 1);
        
        // Sky materials for day and night
        this.daySkyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB, // Sky blue
            side: THREE.BackSide
        });
        
        this.nightSkyMaterial = new THREE.MeshBasicMaterial({
            color: 0x0a0a2a, // Dark blue
            side: THREE.BackSide
        });
        
        this.sky = new THREE.Mesh(skyGeometry, this.daySkyMaterial);
        this.scene.add(this.sky);
    }
    
    createStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 1,
            sizeAttenuation: false,
            transparent: true
        });
        
        const starVertices = [];
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * 2 - 1;
            const y = Math.random() * 0.5 + 0.2; // mostly above horizon
            const z = Math.random() * 2 - 1;
            const normalizationFactor = 1 / Math.sqrt(x * x + y * y + z * z);
            
            starVertices.push(
                x * normalizationFactor * this.skyRadius * 0.95, 
                y * normalizationFactor * this.skyRadius * 0.95, 
                z * normalizationFactor * this.skyRadius * 0.95
            );
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.stars.visible = false; // Initially not visible during day
        this.scene.add(this.stars);
    }
    
    createSunAndMoon() {
        // Create Sun
        const sunGeometry = new THREE.SphereGeometry(20, 16, 16);
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.position.set(0, 400, 0);
        this.scene.add(this.sun);
        
        // Create Moon
        const moonGeometry = new THREE.SphereGeometry(15, 16, 16);
        const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.position.set(0, -400, 0);
        this.scene.add(this.moon);
    }
    
    createCloud(x, y, z, scale) {
        const cloudGroup = new THREE.Group();
        
        // Create multiple spheres to form a cloud
        const sphereGeom = new THREE.SphereGeometry(10, 8, 8);
        const cloudMat = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        // Create main cloud part
        const mainSphere = new THREE.Mesh(sphereGeom, cloudMat);
        cloudGroup.add(mainSphere);
        
        // Add more spheres to create a cloud-like shape
        for (let i = 0; i < 5; i++) {
            const sphere = new THREE.Mesh(sphereGeom, cloudMat);
            sphere.position.set(
                Math.random() * 15 - 7.5,
                Math.random() * 5 - 2.5,
                Math.random() * 15 - 7.5
            );
            sphere.scale.set(
                Math.random() * 0.5 + 0.5,
                Math.random() * 0.3 + 0.5,
                Math.random() * 0.5 + 0.5
            );
            cloudGroup.add(sphere);
        }
        
        cloudGroup.position.set(x, y, z);
        cloudGroup.scale.set(scale, scale / 2, scale);
        
        return cloudGroup;
    }
    
    createClouds() {
        this.clouds = new THREE.Group();
        
        // Create multiple clouds at random positions
        for (let i = 0; i < 15; i++) {
            const cloudSize = Math.random() * 1.5 + 1;
            const cloudX = Math.random() * 800 - 400;
            const cloudY = 80 + Math.random() * 40; // Keep clouds at roughly same height
            const cloudZ = Math.random() * 800 - 400;
            
            const cloud = this.createCloud(cloudX, cloudY, cloudZ, cloudSize);
            cloud.userData = {
                speed: Math.random() * 0.05 + 0.05, // Each cloud has a unique speed
                direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
            };
            
            this.clouds.add(cloud);
        }
        
        this.scene.add(this.clouds);
    }
    
    update(delta) {
        // Update game time (full day-night cycle in 10 minutes)
        this.gameTime += delta * 40; // 24000 / (10 * 60) = 40 time units per second
        if (this.gameTime >= 24000) this.gameTime = 0;
        
        // Sky color based on time
        const isDay = this.gameTime >= 0 && this.gameTime < 12000;
        
        if (isDay) {
            // Daytime - gradual transition from dawn to noon to dusk
            let dayProgress;
            
            if (this.gameTime < 6000) {
                // Dawn transition 0-6000
                dayProgress = this.gameTime / 6000;
                this.sky.material = this.daySkyMaterial;
                // בבוקר: התחלה בצבע כתום-ורוד ומעבר לכחול בהיר
                const sunriseHue = 0.05 + (0.6 - 0.05) * dayProgress; // מ-אדמדם לכחול
                const sunriseSat = 0.8;
                const sunriseLightness = 0.5 + 0.3 * dayProgress; // מאפל לבהיר
                this.sky.material.color.setHSL(sunriseHue, sunriseSat, sunriseLightness);
            } else {
                // Dusk transition 6000-12000
                dayProgress = (12000 - this.gameTime) / 6000;
                this.sky.material = this.daySkyMaterial;
                // בערב: מכחול בהיר לכתום-סגול
                const sunsetHue = 0.6 - (0.6 - 0.05) * (1 - dayProgress); // מכחול לאדמדם
                const sunsetSat = 0.8;
                const sunsetLightness = 0.5 + 0.3 * dayProgress; // מבהיר לאפל
                this.sky.material.color.setHSL(sunsetHue, sunsetSat, sunsetLightness);
            }
            
            // Hide stars during day
            this.stars.visible = false;
        } else {
            // Nighttime
            this.sky.material = this.nightSkyMaterial;
            // לילה - כחול כהה עד שחור
            const nightProgress = (this.gameTime - 12000) / 12000; // 0-1 במהלך הלילה
            const nightHue = 0.7; // כחול כהה
            const nightSat = 0.8;
            const nightLightness = Math.max(0.05, 0.2 - nightProgress * 0.15); // יותר כהה באמצע הלילה
            this.sky.material.color.setHSL(nightHue, nightSat, nightLightness);
            
            // Show stars at night
            this.stars.visible = true;
        }
        
        // Update sun and moon positions
        const timeAngle = (this.gameTime / 24000) * Math.PI * 2;
        this.sun.position.x = Math.cos(timeAngle) * this.skyRadius * 0.8;
        this.sun.position.y = Math.sin(timeAngle) * this.skyRadius * 0.8;
        
        // Moon is opposite the sun
        this.moon.position.x = Math.cos(timeAngle + Math.PI) * this.skyRadius * 0.8;
        this.moon.position.y = Math.sin(timeAngle + Math.PI) * this.skyRadius * 0.8;
        
        // Move clouds
        this.clouds.children.forEach(cloud => {
            cloud.position.x += cloud.userData.direction.x * cloud.userData.speed;
            cloud.position.z += cloud.userData.direction.z * cloud.userData.speed;
            
            // Reset cloud position if it goes too far
            if (Math.abs(cloud.position.x) > 500 || Math.abs(cloud.position.z) > 500) {
                const newPos = new THREE.Vector3(
                    Math.random() * 800 - 400,
                    cloud.position.y,
                    Math.random() * 800 - 400
                );
                cloud.position.copy(newPos);
            }
            
            // Slowly rotate cloud for a more dynamic look
            cloud.rotation.y += 0.001;
        });
        
        return {
            gameTime: this.gameTime,
            isDay: isDay
        };
    }
    
    getTimeFormatted() {
        // Convert game time to hours for display
        const hours = Math.floor((this.gameTime / 1000) % 24);
        const minutes = Math.floor((this.gameTime % 1000) / 1000 * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    updateLighting(ambientLight, directionalLight) {
        const isDay = this.gameTime >= 0 && this.gameTime < 12000;
        
        if (isDay) {
            // Day light
            let lightIntensity;
            if (this.gameTime < 6000) {
                // Dawn transition
                lightIntensity = 0.2 + (this.gameTime / 6000) * 0.6;
            } else {
                // Dusk transition
                lightIntensity = 0.2 + ((12000 - this.gameTime) / 6000) * 0.6;
            }
            ambientLight.intensity = lightIntensity;
            directionalLight.intensity = lightIntensity * 1.5;
        } else {
            // Night light
            ambientLight.intensity = 0.2;
            directionalLight.intensity = 0.3;
        }
    }
} 