/**
 * מחלקת PointerLockControls - אחראית על נעילת הסמן וסיבוב המצלמה
 */
class PointerLockControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || document.body;
        this.isLocked = false;
        
        // Initial camera rotation
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.vector = new THREE.Vector3();
        
        // Rotation state
        this.minPolarAngle = 0;
        this.maxPolarAngle = Math.PI;
        
        this.changeEvent = { type: 'change' };
        this.lockEvent = { type: 'lock' };
        this.unlockEvent = { type: 'unlock' };
        
        // Bind methods to this instance
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onPointerlockChange = this.onPointerlockChange.bind(this);
        this.onPointerlockError = this.onPointerlockError.bind(this);
        
        this.connect();
    }
    
    connect() {
        this.domElement.ownerDocument.addEventListener('mousemove', this.onMouseMove);
        this.domElement.ownerDocument.addEventListener('pointerlockchange', this.onPointerlockChange);
        this.domElement.ownerDocument.addEventListener('pointerlockerror', this.onPointerlockError);
    }
    
    disconnect() {
        this.domElement.ownerDocument.removeEventListener('mousemove', this.onMouseMove);
        this.domElement.ownerDocument.removeEventListener('pointerlockchange', this.onPointerlockChange);
        this.domElement.ownerDocument.removeEventListener('pointerlockerror', this.onPointerlockError);
    }
    
    dispose() {
        this.disconnect();
    }
    
    getObject() {
        return this.camera;
    }
    
    getDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        const rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        rotation.set(this.euler.x, this.euler.y, 0);
        direction.applyEuler(rotation);
        return direction;
    }
    
    moveForward(distance) {
        this.vector.setFromMatrixColumn(this.camera.matrix, 0);
        this.vector.crossVectors(this.camera.up, this.vector);
        this.camera.position.addScaledVector(this.vector, distance);
    }
    
    moveRight(distance) {
        this.vector.setFromMatrixColumn(this.camera.matrix, 0);
        this.camera.position.addScaledVector(this.vector, distance);
    }
    
    lock() {
        this.domElement.requestPointerLock();
    }
    
    unlock() {
        this.domElement.ownerDocument.exitPointerLock();
    }
    
    onMouseMove(event) {
        if (!this.isLocked) return;
        
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        this.euler.y -= movementX * 0.002;
        this.euler.x -= movementY * 0.002;
        
        this.euler.x = Math.max(Math.PI / 2 - this.maxPolarAngle, Math.min(Math.PI / 2 - this.minPolarAngle, this.euler.x));
        
        this.camera.quaternion.setFromEuler(this.euler);
        
        this.dispatchEvent(this.changeEvent);
    }
    
    onPointerlockChange() {
        if (this.domElement.ownerDocument.pointerLockElement === this.domElement) {
            this.dispatchEvent(this.lockEvent);
            this.isLocked = true;
        } else {
            this.dispatchEvent(this.unlockEvent);
            this.isLocked = false;
        }
    }
    
    onPointerlockError() {
        console.error('PointerLockControls: Unable to use Pointer Lock API');
    }
    
    addEventListener(type, listener) {
        if (!this._listeners) this._listeners = {};
        if (!this._listeners[type]) this._listeners[type] = [];
        if (this._listeners[type].indexOf(listener) === -1) {
            this._listeners[type].push(listener);
        }
    }
    
    removeEventListener(type, listener) {
        if (!this._listeners) return;
        if (!this._listeners[type]) return;
        const index = this._listeners[type].indexOf(listener);
        if (index !== -1) {
            this._listeners[type].splice(index, 1);
        }
    }
    
    dispatchEvent(event) {
        if (!this._listeners) return;
        const listeners = this._listeners[event.type];
        if (listeners) {
            for (let i = 0, l = listeners.length; i < l; i++) {
                listeners[i].call(this, event);
            }
        }
    }
} 