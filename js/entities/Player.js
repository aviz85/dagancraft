/**
 * מחלקת Player - אחראית על יצירת השחקן, התנועה וההתנגשויות שלו
 */
class Player {
    constructor(scene, camera, controls, world) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.world = world;
        
        // מידות השחקן
        this.playerHeight = 1.8;
        this.playerRadius = 0.3;
        this.normalHeight = this.playerHeight;
        this.crouchHeight = this.playerHeight * 0.5;
        
        // פיזיקה של השחקן
        this.gravity = 20;
        this.jumpStrength = 10;
        this.playerVelocity = new THREE.Vector3();
        this.playerDirection = new THREE.Vector3();
        this.playerOnGround = false;
        this.isCrawling = false;
        this.isThirdPerson = false;
        
        // בקרי תנועה
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            crawl: false,
            viewToggle: false
        };
        
        // יצירת המודל
        this.createPlayerModel();
        
        // הוספת האזנה לאירועי מקלדת
        this.setupKeyboardListeners();
    }
    
    createPlayerModel() {
        this.playerGroup = new THREE.Group();
        
        // Create head
        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xF5DEB3 }); // Wheat color for skin
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 1.5;
        this.playerGroup.add(this.head);
        
        // Create body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.25);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x0000FF }); // Blue shirt
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.95;
        this.playerGroup.add(body);
        
        // Create arms
        const armGeometry = new THREE.BoxGeometry(0.15, 0.7, 0.25);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x0000FF }); // Blue
        
        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(0.325, 0.95, 0);
        this.playerGroup.add(this.rightArm);
        
        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(-0.325, 0.95, 0);
        this.playerGroup.add(this.leftArm);
        
        // Create legs
        const legGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.25);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x1E90FF }); // Blue pants
        
        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg.position.set(0.15, 0.35, 0);
        this.playerGroup.add(this.rightLeg);
        
        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.leftLeg.position.set(-0.15, 0.35, 0);
        this.playerGroup.add(this.leftLeg);
        
        // Make player model not visible in first-person
        this.playerGroup.visible = false;
        this.scene.add(this.playerGroup);
    }
    
    setupKeyboardListeners() {
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.keys.forward = true;
                    break;
                case 'KeyS':
                    this.keys.backward = true;
                    break;
                case 'KeyA':
                    this.keys.left = true;
                    break;
                case 'KeyD':
                    this.keys.right = true;
                    break;
                case 'Space':
                    this.keys.jump = true;
                    break;
                case 'ShiftLeft':
                    if (!this.keys.crawl) {
                        this.keys.crawl = true;
                        this.isCrawling = true;
                        // Lower view for crouching
                        this.updateCameraHeight();
                    }
                    break;
                case 'KeyF':
                    if (!this.keys.viewToggle) {
                        this.keys.viewToggle = true;
                        this.toggleView();
                    }
                    break;
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.keys.forward = false;
                    break;
                case 'KeyS':
                    this.keys.backward = false;
                    break;
                case 'KeyA':
                    this.keys.left = false;
                    break;
                case 'KeyD':
                    this.keys.right = false;
                    break;
                case 'Space':
                    this.keys.jump = false;
                    break;
                case 'ShiftLeft':
                    this.keys.crawl = false;
                    this.isCrawling = false;
                    // Reset height after crouching
                    this.updateCameraHeight();
                    break;
                case 'KeyF':
                    this.keys.viewToggle = false;
                    break;
            }
        });
    }
    
    toggleView() {
        this.isThirdPerson = !this.isThirdPerson;
        
        if (this.isThirdPerson) {
            // Position camera behind player
            this.playerGroup.visible = true;
            this.camera.position.z = 3; // Move back
            this.camera.position.y = this.isCrawling ? this.crouchHeight * 0.7 : this.normalHeight * 0.7; // Higher for third person
        } else {
            // Reset to first person
            this.playerGroup.visible = false;
            this.camera.position.z = 0;
            this.camera.position.y = this.isCrawling ? this.crouchHeight : this.normalHeight;
        }
    }
    
    updateCameraHeight() {
        if (this.isThirdPerson) {
            this.camera.position.y = this.isCrawling ? this.crouchHeight * 0.7 : this.normalHeight * 0.7;
        } else {
            this.camera.position.y = this.isCrawling ? this.crouchHeight : this.normalHeight;
        }
    }
    
    update(delta, gameTime) {
        // Calculate velocity based on input
        this.playerDirection.z = Number(this.keys.forward) - Number(this.keys.backward);
        this.playerDirection.x = Number(this.keys.right) - Number(this.keys.left);
        this.playerDirection.normalize();
        
        // Current position
        const playerPosition = this.controls.getObject().position;
        
        // Check if standing on ground
        const groundCheck = this.world.isBlockBelow(playerPosition);
        
        // Reset ground status if we're moving upward with significant velocity
        if (this.playerVelocity.y > 1) {
            this.playerOnGround = false;
        }
        // Update ground status if ray detects ground
        else if (groundCheck.isOnGround) {
            this.playerOnGround = true;
        } 
        // If we're moving down and no ground is detected, we're falling
        else if (this.playerVelocity.y <= 0) {
            this.playerOnGround = false;
        }
        
        // Apply gravity only when not on ground
        if (!this.playerOnGround) {
            this.playerVelocity.y -= this.gravity * delta;
            
            // Terminal velocity cap for falling
            if (this.playerVelocity.y < -20) {
                this.playerVelocity.y = -20;
            }
        }
        
        // Handle jumping - only if on ground
        if (this.keys.jump && this.playerOnGround) {
            this.playerVelocity.y = this.jumpStrength;
            this.playerOnGround = false;
        }
        
        // Set move speed based on crawling
        const currentMoveSpeed = this.isCrawling ? 2 : 5;
        
        // Movement velocity
        const moveVelocity = new THREE.Vector3(
            this.playerDirection.x * currentMoveSpeed * delta,
            this.playerVelocity.y * delta,
            this.playerDirection.z * currentMoveSpeed * delta
        );
        
        // Apply collision resolution - this updates the velocity if needed
        const resolvedVelocity = this.world.resolveBlockCollision(playerPosition, moveVelocity, this.playerRadius);
        
        // Reduce horizontal velocity on jumping to prevent huge jumps horizontally
        if (!this.playerOnGround && Math.abs(this.playerVelocity.y) > 0.1) {
            resolvedVelocity.x *= 0.8;
            resolvedVelocity.z *= 0.8;
        }
        
        // Apply movement with collision resolution
        if (resolvedVelocity.x !== 0) this.controls.moveRight(resolvedVelocity.x);
        if (resolvedVelocity.z !== 0) this.controls.moveForward(resolvedVelocity.z);
        if (resolvedVelocity.y !== 0) playerPosition.y += resolvedVelocity.y;
        
        // Ensure we don't go below ground level if on ground
        if (this.playerOnGround) {
            // Apply height adjustment for crawling
            const currentHeight = this.isCrawling ? this.crouchHeight : this.normalHeight;
            
            // Extra verification that player is at correct height when on ground
            if (groundCheck.isOnGround) {
                const blockTop = groundCheck.block.position.y + 0.5; // Top of the block
                const desiredY = blockTop + currentHeight;
                
                // Smooth adjustment if needed
                const heightDiff = desiredY - playerPosition.y;
                if (Math.abs(heightDiff) > 0.01) {
                    playerPosition.y += heightDiff * 0.3; // Slightly faster adjustment
                }
            }
        } else {
            // Extra check if player is getting stuck in a block
            const insideBlock = this.world.checkFullCollision(playerPosition, this.playerRadius * 0.8);
            if (insideBlock.length > 0) {
                // Player is stuck inside a block, push them upward
                playerPosition.y += 0.1;
                this.playerVelocity.y = Math.max(this.playerVelocity.y, 0.5);
            }
        }
        
        // Check if we are not on ground but not falling either
        if (!this.playerOnGround && Math.abs(this.playerVelocity.y) < 0.1) {
            // If we're not falling and not on ground, we might be stuck
            // Check if there's a block below us
            if (!groundCheck.isOnGround) {
                // Force gravity to apply
                this.playerVelocity.y = -0.1;
            }
        }
        
        // Extra safety to prevent falling through the world - only use as last resort
        if (playerPosition.y < -10) {
            // Teleport to a safe position above ground
            playerPosition.set(0, 2, 0);
            this.playerVelocity.set(0, 0, 0);
        }
        
        // Update player model position to follow camera
        this.playerGroup.position.x = this.camera.position.x;
        this.playerGroup.position.z = this.camera.position.z;
        this.playerGroup.position.y = this.camera.position.y - (this.isThirdPerson ? 
            (this.isCrawling ? this.crouchHeight * 0.7 : this.normalHeight * 0.7) : 
            (this.isCrawling ? this.crouchHeight : this.normalHeight));
        
        // Make player model face the same direction as camera
        this.playerGroup.rotation.y = this.controls.getObject().rotation.y;
        
        // Animate player model
        if (this.playerDirection.z !== 0 || this.playerDirection.x !== 0) {
            // Walking animation
            const walkSpeed = 8;
            const walkAmplitude = 0.2;
            
            const legSwing = Math.sin(gameTime * walkSpeed * delta) * walkAmplitude;
            this.rightLeg.rotation.x = legSwing;
            this.leftLeg.rotation.x = -legSwing;
            
            this.rightArm.rotation.x = -legSwing;
            this.leftArm.rotation.x = legSwing;
        } else {
            // Reset to standing position
            this.rightLeg.rotation.x = 0;
            this.leftLeg.rotation.x = 0;
            this.rightArm.rotation.x = 0;
            this.leftArm.rotation.x = 0;
        }
    }
} 