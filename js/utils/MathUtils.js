/**
 * MathUtils - Provides various math utilities for the game
 */
export class MathUtils {
    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Clamped value
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} - Interpolated value
     */
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * Smooth step interpolation
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} - Smoothly interpolated value
     */
    static smoothStep(a, b, t) {
        t = t * t * (3 - 2 * t);
        return this.lerp(a, b, t);
    }
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} - Angle in radians
     */
    static degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
    
    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} - Angle in degrees
     */
    static radToDeg(radians) {
        return radians * 180 / Math.PI;
    }
    
    /**
     * Get a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random integer
     */
    static randomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    /**
     * Get a random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random float
     */
    static randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    /**
     * Check if two 3D boxes intersect (AABB collision detection)
     * @param {Object} box1 - First box with min and max properties
     * @param {Object} box2 - Second box with min and max properties
     * @returns {boolean} - Whether the boxes intersect
     */
    static boxIntersect(box1, box2) {
        return (
            box1.min.x <= box2.max.x &&
            box1.max.x >= box2.min.x &&
            box1.min.y <= box2.max.y &&
            box1.max.y >= box2.min.y &&
            box1.min.z <= box2.max.z &&
            box1.max.z >= box2.min.z
        );
    }
    
    /**
     * Calculate distance between two 3D points
     * @param {THREE.Vector3} point1 - First point
     * @param {THREE.Vector3} point2 - Second point
     * @returns {number} - Distance between points
     */
    static distance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const dz = point2.z - point1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    /**
     * Calculate squared distance between two 3D points (faster than distance)
     * @param {THREE.Vector3} point1 - First point
     * @param {THREE.Vector3} point2 - Second point
     * @returns {number} - Squared distance between points
     */
    static distanceSquared(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const dz = point2.z - point1.z;
        return dx * dx + dy * dy + dz * dz;
    }
    
    /**
     * Calculate Manhattan distance between two 3D points
     * @param {THREE.Vector3} point1 - First point
     * @param {THREE.Vector3} point2 - Second point
     * @returns {number} - Manhattan distance between points
     */
    static manhattanDistance(point1, point2) {
        return (
            Math.abs(point2.x - point1.x) +
            Math.abs(point2.y - point1.y) +
            Math.abs(point2.z - point1.z)
        );
    }
    
    /**
     * Get the block coordinates from a world position
     * @param {THREE.Vector3} position - World position
     * @returns {Object} - Block coordinates (x, y, z)
     */
    static worldToBlock(position) {
        return {
            x: Math.floor(position.x),
            y: Math.floor(position.y),
            z: Math.floor(position.z)
        };
    }
    
    /**
     * Get the chunk coordinates from a world position
     * @param {THREE.Vector3} position - World position
     * @param {Object} chunkSize - Chunk size in blocks
     * @returns {Object} - Chunk coordinates (x, z)
     */
    static worldToChunk(position, chunkSize) {
        return {
            x: Math.floor(position.x / chunkSize.x),
            z: Math.floor(position.z / chunkSize.z)
        };
    }
    
    /**
     * Get the normalized direction vector from a rotation
     * @param {THREE.Euler} rotation - Rotation in Euler angles
     * @returns {THREE.Vector3} - Direction vector
     */
    static directionFromRotation(rotation) {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(rotation);
        return direction.normalize();
    }
    
    /**
     * Calculate a simple noise value at coordinates (simplified Perlin noise)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate (optional)
     * @returns {number} - Noise value between 0 and 1
     */
    static simpleNoise(x, y, z = 0) {
        // Simple noise function for demonstration
        // For better results, use a proper noise library
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        
        const A = (X + Y) & 255;
        const B = (X + Y + 1) & 255;
        
        // Use sine functions for a simple hash
        // Not as good as a real noise function but works for demonstration
        const h1 = Math.sin(A + Z) * 43758.5453123;
        const h2 = Math.sin(B + Z) * 43758.5453123;
        const h3 = Math.sin(A + Z + 1) * 43758.5453123;
        const h4 = Math.sin(B + Z + 1) * 43758.5453123;
        
        const noise = this.lerp(
            this.lerp(h1, h2, u),
            this.lerp(h3, h4, u),
            v
        );
        
        // Map to 0-1 range
        return (noise - Math.floor(noise));
    }
    
    /**
     * Fade function for noise
     * @param {number} t - Value to fade
     * @returns {number} - Faded value
     * @private
     */
    static fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    /**
     * Generate a 32-bit hash from a string
     * @param {string} str - String to hash
     * @returns {number} - 32-bit hash value
     */
    static hashString(str) {
        let hash = 0;
        
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return hash;
    }
    
    /**
     * Linear congruential generator for deterministic random numbers
     * @param {number} seed - Seed value
     * @returns {Function} - Function that returns a random number between 0 and 1
     */
    static createRandomGenerator(seed) {
        const a = 1664525;
        const c = 1013904223;
        const m = Math.pow(2, 32);
        
        let current = seed;
        
        return () => {
            current = (a * current + c) % m;
            return current / m;
        };
    }
    
    /**
     * Convert RGB color components to hex
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {number} - Hex color value
     */
    static rgbToHex(r, g, b) {
        return (r << 16) | (g << 8) | b;
    }
    
    /**
     * Convert hex color to RGB components
     * @param {number} hex - Hex color value
     * @returns {Object} - RGB components {r, g, b} (0-255)
     */
    static hexToRgb(hex) {
        return {
            r: (hex >> 16) & 255,
            g: (hex >> 8) & 255,
            b: hex & 255
        };
    }
} 