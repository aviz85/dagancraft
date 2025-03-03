/**
 * Test module to verify imports are working
 */

// Test if THREE is available
export class GameTest {
    constructor() {
        console.log('GameTest constructor called');
        
        try {
            console.log('THREE available in module:', typeof THREE !== 'undefined');
            
            if (typeof THREE !== 'undefined') {
                // Create a test scene to verify THREE is working
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                console.log('Successfully created THREE objects');
            } else {
                console.error('THREE is not defined in the module scope');
            }
        } catch (error) {
            console.error('Error in GameTest constructor:', error);
        }
    }
    
    test() {
        console.log('GameTest.test() called');
        return 'Test successful';
    }
} 