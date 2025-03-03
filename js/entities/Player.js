/**
 * Player - Handles player physics, movement, inventory, and interactions
 */
export class Player {
    constructor(camera, controls, world) {
        // References to other game systems
        this.camera = camera;
        this.controls = controls;
        this.world = world;
        
        // Player state
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.playerVelocity = new THREE.Vector3(0, 0, 0); // For physics calculations
        
        // Physics properties
        this.gravity = 20;        // Gravity force
        this.jumpStrength = 10;   // Initial jump velocity
        this.moveSpeed = 5;       // Base movement speed
        this.sprintSpeed = 8;     // Sprint movement speed
        this.friction = 0.85;     // Ground friction
        this.airFriction = 0.95;  // Air friction
        
        // Movement state
        this.onGround = false;    // Whether player is on the ground
        this.jumping = false;     // Whether player is jumping
        this.sprinting = false;   // Whether player is sprinting
        this.sneaking = false;    // Whether player is sneaking (crouching)
        this.flying = false;      // Whether player is flying (creative mode)
        
        // Player dimensions
        this.height = 1.8;        // Player height
        this.width = 0.6;         // Player width
        this.eyeHeight = 1.62;    // Player eye height
        this.sneakHeight = 1.5;   // Player sneaking height
        
        // Interaction properties
        this.blockReach = 5;      // How far player can interact with blocks
        this.targetBlock = null;  // Currently targeted block
        this.targetDistance = 5;  // How far the player can reach
        
        // Player stats
        this.health = 20;         // Current health
        this.maxHealth = 20;      // Maximum health
        this.hunger = 20;         // Current hunger
        this.maxHunger = 20;      // Maximum hunger
        this.experience = 0;      // Experience points
        
        // Input state
        this.inputState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false,
            sneak: false,
            attack: false,
            use: false
        };
        
        // Inventory
        this.inventory = {
            hotbar: Array(9).fill(null),
            main: Array(27).fill(null),
            armor: Array(4).fill(null),
            offhand: null,
            selectedSlot: 0
        };
        
        // Initialize player
        this.init();
    }
    
    /**
     * Initialize the player
     */
    init() {
        // Set initial position high in the world
        this.position.set(0, 100, 0);
        
        // Set up input handlers
        this.setupInputHandlers();
        
        console.log('Player initialized');
    }
    
    /**
     * Set up keyboard and mouse input handlers
     * @private
     */
    setupInputHandlers() {
        // Keyboard input for movement
        document.addEventListener('keydown', e => this.handleKeyDown(e));
        document.addEventListener('keyup', e => this.handleKeyUp(e));
        
        // Mouse click handling
        document.addEventListener('mousedown', e => this.handleMouseDown(e));
        document.addEventListener('mouseup', e => this.handleMouseUp(e));
        
        // Mouse wheel for inventory selection
        document.addEventListener('wheel', e => this.handleWheel(e));
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} event - Key event
     * @private
     */
    handleKeyDown(event) {
        // Only handle keys when controls are locked
        if (!this.controls || !this.controls.getLockState()) return;
        
        switch (event.code) {
            case 'KeyW':
                this.inputState.forward = true;
                break;
            case 'KeyS':
                this.inputState.backward = true;
                break;
            case 'KeyA':
                this.inputState.left = true;
                break;
            case 'KeyD':
                this.inputState.right = true;
                break;
            case 'Space':
                this.inputState.jump = true;
                this.tryJump();
                break;
            case 'ShiftLeft':
                this.inputState.sprint = true;
                this.sprinting = true;
                break;
            case 'ControlLeft':
                this.inputState.sneak = true;
                this.sneaking = true;
                break;
        }
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} event - Key event
     * @private
     */
    handleKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
                this.inputState.forward = false;
                break;
            case 'KeyS':
                this.inputState.backward = false;
                break;
            case 'KeyA':
                this.inputState.left = false;
                break;
            case 'KeyD':
                this.inputState.right = false;
                break;
            case 'Space':
                this.inputState.jump = false;
                this.jumping = false;
                break;
            case 'ShiftLeft':
                this.inputState.sprint = false;
                this.sprinting = false;
                break;
            case 'ControlLeft':
                this.inputState.sneak = false;
                this.sneaking = false;
                break;
        }
    }
    
    /**
     * Handle mouse down events
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    handleMouseDown(event) {
        // Only handle mouse events when controls are locked
        if (!this.controls || !this.controls.getLockState()) return;
        
        // Left click (break block)
        if (event.button === 0) {
            this.inputState.attack = true;
            this.breakBlock();
        }
        
        // Right click (place block)
        if (event.button === 2) {
            this.inputState.use = true;
            this.placeBlock();
        }
    }
    
    /**
     * Handle mouse up events
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    handleMouseUp(event) {
        // Left click release
        if (event.button === 0) {
            this.inputState.attack = false;
        }
        
        // Right click release
        if (event.button === 2) {
            this.inputState.use = false;
        }
    }
    
    /**
     * Handle mouse wheel events
     * @param {WheelEvent} event - Wheel event
     * @private
     */
    handleWheel(event) {
        // Only handle when controls are locked
        if (!this.controls || !this.controls.isLocked()) return;
        
        // Calculate new selected slot
        const direction = event.deltaY > 0 ? 1 : -1;
        let newSlot = this.inventory.selectedSlot + direction;
        
        // Wrap around (0-8)
        if (newSlot < 0) newSlot = 8;
        if (newSlot > 8) newSlot = 0;
        
        this.inventory.selectedSlot = newSlot;
    }
    
    /**
     * Try to make the player jump
     * @private
     */
    tryJump() {
        // Only jump if on the ground or flying
        if (this.onGround || this.flying) {
            this.velocity.y = this.jumpStrength;
            this.jumping = true;
            this.onGround = false;
        }
    }
    
    /**
     * Update player physics and movement
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(delta, gameTime) {
        // Make sure we have the keys object
        if (!this.keys) {
            this.keys = this.inputState || {}; // Use inputState or empty object if keys are not defined
        }
        
        // Make sure playerDirection is initialized
        if (!this.playerDirection) {
            this.playerDirection = new THREE.Vector3(0, 0, 0);
        }
        
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
        
        // Update the player's targeted block
        this.updateTargetBlock();
    }

    /**
     * Break (remove) the targeted block
     */
    breakBlock() {
        // Check if we have a world and a target block
        if (!this.world || !this.targetBlock) return;
        
        const position = this.targetBlock.position;
        
        // Remove the block from the world
        this.world.removeBlock(
            Math.floor(position.x), 
            Math.floor(position.y), 
            Math.floor(position.z)
        );
    }

    /**
     * Place a block next to the targeted block
     */
    placeBlock() {
        // Check if we have a world and a target block
        if (!this.world || !this.targetBlock) return;
        
        const position = this.targetBlock.adjacentPosition;
        
        // Currently just place a stone block
        // In a full implementation, would use the selected block from inventory
        this.world.placeBlock(
            'stone',
            Math.floor(position.x),
            Math.floor(position.y),
            Math.floor(position.z)
        );
    }

    /**
     * Update the currently targeted block using raycasting
     */
    updateTargetBlock() {
        // If we don't have a world, we can't target blocks
        if (!this.world) return;
        
        // Create a ray from the camera position in the direction the camera is facing
        const cameraPosition = this.camera.position.clone();
        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        
        // Use the world's raycast method to find the targeted block
        this.targetBlock = this.world.getTargetBlock(cameraPosition, cameraDirection, this.targetDistance);
    }
} 