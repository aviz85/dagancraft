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
        if (!this.controls || !this.controls.isLocked()) return;
        
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
        if (!this.controls || !this.controls.isLocked()) return;
        
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
    update(deltaTime) {
        // If no delta time, skip update
        if (!deltaTime) return;
        
        // Cap delta time to avoid large jumps
        const dt = Math.min(deltaTime, 0.1);
        
        // Update rotation from controls
        if (this.controls) {
            this.rotation.copy(this.camera.rotation);
        }
        
        // Apply friction
        if (this.onGround) {
            this.velocity.x *= this.friction;
            this.velocity.z *= this.friction;
        } else {
            this.velocity.x *= this.airFriction;
            this.velocity.z *= this.airFriction;
        }
        
        // Apply gravity if not flying
        if (!this.flying) {
            this.velocity.y -= this.gravity * dt;
        } else if (!this.inputState.jump && !this.inputState.sneak) {
            this.velocity.y *= 0.5; // Dampen vertical movement when flying
        }
        
        // Process movement input
        this.processMovementInput(dt);
        
        // Move player
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
        this.position.y += this.velocity.y * dt;
        
        // Prevent falling below ground level
        if (this.position.y < 0) {
            this.position.y = 0;
            this.velocity.y = 0;
            this.onGround = true;
        }
        
        // Perform collision detection
        this.checkCollisions();
        
        // Update camera position
        this.updateCamera();
        
        // Update target block
        this.updateTargetBlock();
    }
    
    /**
     * Process movement input from keyboard
     * @param {number} dt - Delta time
     * @private
     */
    processMovementInput(dt) {
        // Calculate movement speed
        let speed = this.moveSpeed;
        
        if (this.sprinting && !this.sneaking) {
            speed = this.sprintSpeed;
        } else if (this.sneaking && !this.flying) {
            speed = this.moveSpeed * 0.3;
        }
        
        // Calculate movement direction vector from input
        const moveDirection = new THREE.Vector3(0, 0, 0);
        
        if (this.inputState.forward) moveDirection.z -= 1;
        if (this.inputState.backward) moveDirection.z += 1;
        if (this.inputState.left) moveDirection.x -= 1;
        if (this.inputState.right) moveDirection.x += 1;
        
        // Normalize for diagonal movement
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
        }
        
        // Apply rotation to movement direction
        moveDirection.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        
        // Apply movement to velocity
        this.velocity.x += moveDirection.x * speed * dt * 10;
        this.velocity.z += moveDirection.z * speed * dt * 10;
        
        // Handle flying vertical movement
        if (this.flying) {
            if (this.inputState.jump) {
                this.velocity.y = speed / 2;
            } else if (this.inputState.sneak) {
                this.velocity.y = -speed / 2;
            }
        }
    }
    
    /**
     * Check for collisions with the world
     * @private
     */
    checkCollisions() {
        // Create player bounding box
        const playerHeight = this.sneaking ? this.sneakHeight : this.height;
        const playerBox = {
            min: new THREE.Vector3(
                this.position.x - this.width / 2,
                this.position.y,
                this.position.z - this.width / 2
            ),
            max: new THREE.Vector3(
                this.position.x + this.width / 2,
                this.position.y + playerHeight,
                this.position.z + this.width / 2
            )
        };
        
        // Handle collisions
        const result = this.world.resolveCollisions(playerBox, this.velocity);
        
        // Update position and ground state
        this.position.copy(result.position);
        
        // Update ground state
        const wasOnGround = this.onGround;
        this.onGround = result.onGround;
        
        // If we just landed, zero out the vertical velocity
        if (!wasOnGround && this.onGround) {
            this.velocity.y = 0;
            this.jumping = false;
        }
        
        // If hitting a ceiling, zero out upward velocity
        if (result.colliding && this.velocity.y > 0) {
            this.velocity.y = 0;
        }
    }
    
    /**
     * Update camera position to match player
     * @private
     */
    updateCamera() {
        // Set camera height based on sneaking
        const eyeHeight = this.sneaking ? this.sneakHeight - 0.3 : this.eyeHeight;
        
        // Position camera at player eye level
        this.camera.position.copy(this.position);
        this.camera.position.y += eyeHeight;
        
        // Apply camera rotation from controls
        this.camera.rotation.copy(this.rotation);
    }
    
    /**
     * Update the currently targeted block
     * @private
     */
    updateTargetBlock() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(this.rotation);
        
        this.targetBlock = this.world.getTargetBlock(this.camera.position, direction);
    }
    
    /**
     * Break (remove) the targeted block
     */
    breakBlock() {
        if (!this.targetBlock) return;
        
        const { position } = this.targetBlock;
        
        // Remove the block
        this.world.removeBlock(position.x, position.y, position.z);
    }
    
    /**
     * Place a block next to the targeted block
     */
    placeBlock() {
        if (!this.targetBlock) return;
        
        const { adjacentPosition } = this.targetBlock;
        
        // Check if player is colliding with the placement position
        const playerBox = {
            min: new THREE.Vector3(
                this.position.x - this.width / 2,
                this.position.y,
                this.position.z - this.width / 2
            ),
            max: new THREE.Vector3(
                this.position.x + this.width / 2,
                this.position.y + this.height,
                this.position.z + this.width / 2
            )
        };
        
        const blockBox = {
            min: new THREE.Vector3(
                Math.floor(adjacentPosition.x),
                Math.floor(adjacentPosition.y),
                Math.floor(adjacentPosition.z)
            ),
            max: new THREE.Vector3(
                Math.floor(adjacentPosition.x) + 1,
                Math.floor(adjacentPosition.y) + 1,
                Math.floor(adjacentPosition.z) + 1
            )
        };
        
        // Don't place if player is colliding with the placement position
        if (this.checkBoxCollision(playerBox, blockBox)) {
            return;
        }
        
        // Get the block type from inventory
        const blockType = this.getSelectedBlockType();
        
        if (blockType) {
            // Place the block
            this.world.placeBlock(
                blockType,
                Math.floor(adjacentPosition.x),
                Math.floor(adjacentPosition.y),
                Math.floor(adjacentPosition.z)
            );
        }
    }
    
    /**
     * Check collision between two bounding boxes
     * @param {Object} box1 - First bounding box
     * @param {Object} box2 - Second bounding box
     * @returns {boolean} - Whether the boxes collide
     * @private
     */
    checkBoxCollision(box1, box2) {
        // Check for no overlap on any axis
        if (box1.max.x <= box2.min.x || box1.min.x >= box2.max.x) return false;
        if (box1.max.y <= box2.min.y || box1.min.y >= box2.max.y) return false;
        if (box1.max.z <= box2.min.z || box1.min.z >= box2.max.z) return false;
        
        // If we got here, boxes overlap
        return true;
    }
    
    /**
     * Get the block type from the currently selected inventory slot
     * @returns {string} - Block type or null if empty
     * @private
     */
    getSelectedBlockType() {
        // For now, just return a default block type
        // In a full implementation, this would get the block from inventory
        return 'stone';
    }
    
    /**
     * Take damage
     * @param {number} amount - Amount of damage to take
     * @param {string} source - Source of damage
     */
    takeDamage(amount, source) {
        this.health = Math.max(0, this.health - amount);
        
        if (this.health <= 0) {
            this.die(source);
        }
    }
    
    /**
     * Handle player death
     * @param {string} source - Source of death
     * @private
     */
    die(source) {
        console.log(`Player died from ${source}`);
        // Handle death (respawn, drop items, etc.)
    }
    
    /**
     * Heal the player
     * @param {number} amount - Amount to heal
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    /**
     * Change player's hunger level
     * @param {number} amount - Amount to change hunger by (negative for decreasing)
     */
    changeHunger(amount) {
        this.hunger = Math.max(0, Math.min(this.maxHunger, this.hunger + amount));
    }
    
    /**
     * Toggle flying mode
     */
    toggleFlying() {
        this.flying = !this.flying;
        
        if (this.flying) {
            this.velocity.y = 0;
        }
    }
    
    /**
     * Add an item to the player's inventory
     * @param {Object} item - Item to add
     * @returns {boolean} - Whether the item was added successfully
     */
    addItem(item) {
        // Find an empty slot in hotbar first
        for (let i = 0; i < this.inventory.hotbar.length; i++) {
            if (!this.inventory.hotbar[i]) {
                this.inventory.hotbar[i] = item;
                return true;
            }
        }
        
        // Then try main inventory
        for (let i = 0; i < this.inventory.main.length; i++) {
            if (!this.inventory.main[i]) {
                this.inventory.main[i] = item;
                return true;
            }
        }
        
        // No empty slots
        return false;
    }
    
    /**
     * Get player data for saving
     * @returns {Object} - Player data
     */
    save() {
        return {
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            rotation: {
                x: this.rotation.x,
                y: this.rotation.y,
                z: this.rotation.z
            },
            health: this.health,
            hunger: this.hunger,
            experience: this.experience,
            inventory: {
                hotbar: this.inventory.hotbar,
                main: this.inventory.main,
                armor: this.inventory.armor,
                offhand: this.inventory.offhand,
                selectedSlot: this.inventory.selectedSlot
            }
        };
    }
    
    /**
     * Load player from saved data
     * @param {Object} data - Saved player data
     */
    load(data) {
        if (data.position) {
            this.position.set(data.position.x, data.position.y, data.position.z);
        }
        
        if (data.rotation) {
            this.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z, 'YXZ');
        }
        
        if (data.health !== undefined) {
            this.health = data.health;
        }
        
        if (data.hunger !== undefined) {
            this.hunger = data.hunger;
        }
        
        if (data.experience !== undefined) {
            this.experience = data.experience;
        }
        
        if (data.inventory) {
            this.inventory = data.inventory;
        }
        
        // Update camera position immediately
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