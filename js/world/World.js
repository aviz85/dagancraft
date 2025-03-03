/**
 * מחלקת World - אחראית על יצירת העולם, בלוקים והתנגשויות
 */
class World {
    constructor(scene) {
        this.scene = scene;
        this.worldSize = 20;
        this.blocks = [];
        
        // יצירת Raycaster עבור האינטראקציה עם בלוקים
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // יצירת גיאומטריה וחומרים עבור הבלוקים
        this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
        this.materials = {
            grass: new THREE.MeshLambertMaterial({ color: 0x7cfc00 }), // Green
            dirt: new THREE.MeshLambertMaterial({ color: 0x8b4513 }), // Brown
            stone: new THREE.MeshLambertMaterial({ color: 0x888888 }) // Gray
        };
        
        // יצירת העולם
        this.generateWorld();
    }
    
    generateWorld() {
        // Create a flat world with occasional obstacles
        for (let x = -this.worldSize; x <= this.worldSize; x++) {
            for (let z = -this.worldSize; z <= this.worldSize; z++) {
                // Create flat ground at y=0 with occasional random obstacles
                const block = new THREE.Mesh(this.blockGeometry, this.materials.grass);
                block.position.set(x, -1, z);  // Base ground level at -1
                block.castShadow = true;
                block.receiveShadow = true;
                this.scene.add(block);
                this.blocks.push(block);
                
                // Add dirt blocks below the ground
                for (let y = -2; y >= -3; y--) {
                    const dirtBlock = new THREE.Mesh(this.blockGeometry, this.materials.dirt);
                    dirtBlock.position.set(x, y, z);
                    dirtBlock.castShadow = true;
                    dirtBlock.receiveShadow = true;
                    this.scene.add(dirtBlock);
                    this.blocks.push(dirtBlock);
                }
                
                // Add stone at the bottom
                const stoneBlock = new THREE.Mesh(this.blockGeometry, this.materials.stone);
                stoneBlock.position.set(x, -4, z);
                stoneBlock.castShadow = true;
                stoneBlock.receiveShadow = true;
                this.scene.add(stoneBlock);
                this.blocks.push(stoneBlock);
                
                // Randomly add obstacle blocks (5% chance)
                if (Math.random() < 0.05 && Math.abs(x) > 3 && Math.abs(z) > 3) {  // Keep center area clear
                    const height = 0;  // Fixed height obstacle (1 block tall)
                    const obstacle = new THREE.Mesh(this.blockGeometry, this.materials.stone);
                    obstacle.position.set(x, height, z);  // Position on top of ground
                    obstacle.castShadow = true;
                    obstacle.receiveShadow = true;
                    this.scene.add(obstacle);
                    this.blocks.push(obstacle);
                }
            }
        }
    }
    
    // בדיקת התנגשות עם בלוק
    checkBlockCollision(position, radius) {
        // Check if player collides with any block
        for (const block of this.blocks) {
            const blockPos = block.position;
            const blockHalfSize = 0.5; // Half size of a block
            
            // Check if player is colliding with this block in each axis
            const collisionX = Math.abs(position.x - blockPos.x) < (radius + blockHalfSize);
            const collisionY = Math.abs(position.y - blockPos.y) < (radius + blockHalfSize);
            const collisionZ = Math.abs(position.z - blockPos.z) < (radius + blockHalfSize);
            
            // If colliding in all three axes, we have a collision
            if (collisionX && collisionY && collisionZ) {
                return block;
            }
        }
        return null;
    }
    
    // בדיקה אם יש בלוק מתחת לשחקן
    isBlockBelow(position) {
        // Raycasting downward to detect ground
        const rayOrigin = new THREE.Vector3(position.x, position.y - 0.9, position.z);
        const rayDirection = new THREE.Vector3(0, -1, 0); // Downward direction
        
        // Create a ray
        this.raycaster.set(rayOrigin, rayDirection);
        
        // Check intersections with blocks
        const intersects = this.raycaster.intersectObjects(this.blocks);
        
        // If we hit something below us within a short distance, we're standing on ground
        if (intersects.length > 0 && intersects[0].distance < 0.7) { // Increased detection distance
            return {
                isOnGround: true,
                block: intersects[0].object,
                distance: intersects[0].distance
            };
        }
        
        return {
            isOnGround: false,
            block: null,
            distance: Infinity
        };
    }
    
    // בדיקת התנגשות מלאה עם בלוקים
    checkFullCollision(position, radius) {
        const collidingBlocks = [];
        
        // Check all nearby blocks - optimization for performance
        for (const block of this.blocks) {
            // Only check blocks that are near the player
            if (block.position.distanceTo(position) < 2) {
                const blockPos = block.position;
                const blockHalfSize = 0.5; // Half size of a block
                
                // Check if player is colliding with this block in each axis
                const dx = Math.abs(position.x - blockPos.x);
                const dy = Math.abs(position.y - blockPos.y);
                const dz = Math.abs(position.z - blockPos.z);
                
                // If colliding in all three axes, we have a collision
                if (dx < (radius + blockHalfSize) && 
                    dy < (radius + blockHalfSize) && 
                    dz < (radius + blockHalfSize)) {
                    collidingBlocks.push({
                        block: block,
                        dx: dx,
                        dy: dy,
                        dz: dz
                    });
                }
            }
        }
        
        return collidingBlocks;
    }
    
    // פתרון התנגשות עם בלוקים
    resolveBlockCollision(position, velocity, playerRadius) {
        // Store original velocity
        const originalVelocity = velocity.clone();
        
        // Apply horizontal movement first
        const horizontalMove = new THREE.Vector3(velocity.x, 0, velocity.z);
        
        if (horizontalMove.length() > 0) {
            // Try moving horizontally
            const testPosition = position.clone().add(horizontalMove);
            
            // Check for obstacles at feet level
            const footPosition = testPosition.clone();
            footPosition.y -= playerRadius; // Check near feet
            
            // Check if there's a collision at current height
            const bodyCollisions = this.checkFullCollision(testPosition, playerRadius);
            const footCollisions = this.checkFullCollision(footPosition, playerRadius);
            
            // If there's a collision, don't allow movement
            if (bodyCollisions.length > 0 || footCollisions.length > 0) {
                // We hit something, cancel horizontal movement
                velocity.x = 0;
                velocity.z = 0;
            }
        }
        
        // Now handle vertical movement separately (important for not falling through blocks)
        if (velocity.y !== 0) {
            // Try moving vertically
            const testPosition = position.clone();
            testPosition.y += velocity.y;
            
            const collisions = this.checkFullCollision(testPosition, playerRadius);
            
            if (collisions.length > 0) {
                // Hit something above or below
                if (velocity.y < 0) {
                    // Falling - place the player exactly on top of the block
                    // Find the highest block we're colliding with
                    let highestBlock = collisions[0].block;
                    
                    for (const collision of collisions) {
                        if (collision.block.position.y > highestBlock.position.y) {
                            highestBlock = collision.block;
                        }
                    }
                    
                    // Position player directly on top of this block
                    const newY = highestBlock.position.y + 0.5 + playerRadius;
                    
                    // Only adjust if this would move the player up (prevent getting stuck in blocks)
                    if (newY > position.y) {
                        position.y = newY;
                    }
                    
                    velocity.y = 0;
                } else {
                    // Hit ceiling, just stop upward movement
                    velocity.y = 0;
                }
            }
        }
        
        return velocity;
    }
    
    // הוספת או הסרת בלוק בנקודה
    addRemoveBlock(camera, event, controls) {
        if (!controls.isLocked) return;
        
        // Update raycaster
        this.raycaster.setFromCamera(new THREE.Vector2(), camera);
        
        // Check for intersections
        const intersects = this.raycaster.intersectObjects(this.blocks);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            
            // Left click (remove block)
            if (event.button === 0) {
                this.scene.remove(intersect.object);
                this.blocks.splice(this.blocks.indexOf(intersect.object), 1);
            }
            
            // Right click (add block)
            if (event.button === 2) {
                // Calculate position for new block
                const position = intersect.object.position.clone().add(intersect.face.normal);
                
                // Create new block
                const block = new THREE.Mesh(this.blockGeometry, this.materials.stone);
                block.position.copy(position);
                block.castShadow = true;
                block.receiveShadow = true;
                this.scene.add(block);
                this.blocks.push(block);
            }
        }
    }
} 