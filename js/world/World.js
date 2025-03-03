/**
 * World - Handles the game world, including terrain generation, chunks, and block interactions
 */
export class World {
    constructor(scene, resourceManager) {
        // Core properties
        this.scene = scene;
        this.resourceManager = resourceManager;
        
        // World properties
        this.chunks = new Map(); // Map of chunks by coordinates: "x,z"
        this.blockSize = 1.0;    // Size of each block
        this.chunkSize = {
            x: 16,
            y: 256, // World height
            z: 16
        };
        this.gravity = 20;       // Gravity constant
        
        // Render properties
        this.visibleChunks = []; // Currently rendered chunks
        this.renderDistance = 6; // Chunks to render in each direction
        
        // Block data
        this.blockData = new Map(); // Maps position to block type
        
        // Physics and collision
        this.collidableObjects = []; // Objects that can be collided with
        
        // World generation properties
        this.seed = Math.floor(Math.random() * 2147483647);
        this.noiseGenerators = this.initNoiseGenerators();
        
        // Terrain height range
        this.terrainHeightMin = 64;
        this.terrainHeightMax = 128;
        
        // Block manipulation properties
        this.maxReach = 5; // How far the player can reach to manipulate blocks
        this.raycaster = new THREE.Raycaster();
        
        // Structure templates
        this.structures = {
            tree: this.createTreeTemplate(),
            cave: this.createCaveTemplate()
        };
    }

    /**
     * Initialize all noise generators for terrain
     * @private
     */
    initNoiseGenerators() {
        // Uses simplex noise for terrain generation
        // We'll use different noise patterns for different features
        return {
            // Primary terrain noise
            terrain: {
                scale: 0.01,      // Scale of the noise (higher = more stretched out)
                height: 40,       // How much height variation
                octaves: 4,       // Number of noise layers
                persistence: 0.5, // How much each octave contributes
                lacunarity: 2.0,  // How much detail is added at each octave
                offset: [0, 0]    // Offset to apply to the noise
            },
            
            // Secondary noise for more detail
            detail: {
                scale: 0.05,
                height: 8,
                octaves: 2,
                persistence: 0.5,
                lacunarity: 2.0,
                offset: [100, 100]
            },
            
            // Biome noise
            biome: {
                scale: 0.005,     // Biomes change slowly
                octaves: 2,
                persistence: 0.5,
                lacunarity: 2.0,
                offset: [200, 200]
            },
            
            // Cave noise
            cave: {
                scale: 0.03,
                threshold: 0.6,   // Threshold for cave formation
                octaves: 3,
                persistence: 0.5,
                lacunarity: 2.0,
                offset: [300, 300, 300]
            }
        };
    }
    
    /**
     * Create a tree structure template
     * @private
     */
    createTreeTemplate() {
        // Define a simple tree structure
        // 0 = air, 1 = trunk, 2 = leaves
        return {
            height: 5, // Total height of tree
            trunkHeight: 4, // Height of trunk
            canopyRadius: 2, // Radius of leaf canopy
            // Function to get block at relative position
            getBlock: (x, y, z) => {
                // Trunk
                if (x === 0 && z === 0 && y < 4) {
                    return 'wood';
                }
                
                // Leaves
                if (y >= 3 && y <= 6) {
                    const distance = Math.sqrt(x*x + (y-5)*(y-5) + z*z);
                    if (distance <= 2.5) {
                        return 'leaves';
                    }
                }
                
                return 'air';
            }
        };
    }
    
    /**
     * Create a cave structure template
     * @private
     */
    createCaveTemplate() {
        return {
            // Using 3D noise for cave generation
            // This will be used in the chunk generation process
            threshold: 0.55 // Value at which a block becomes air in a cave
        };
    }
    
    /**
     * Initialize the world and generate initial chunks
     * @param {Object} options - World generation options
     */
    init(options = {}) {
        console.log('Initializing world...');
        
        // Set world options
        if (options.seed !== undefined) {
            this.seed = options.seed;
        }
        
        if (options.renderDistance !== undefined) {
            this.renderDistance = options.renderDistance;
        }
        
        // Initialize noise with seed
        // this.noise.seed(this.seed);
        
        // Placeholder for actual noise seed setup
        console.log(`World initialized with seed: ${this.seed}`);
    }
    
    /**
     * Generate and load chunks around a position
     * @param {THREE.Vector3} position - Center position for chunk loading
     */
    loadChunksAroundPosition(position) {
        // Convert position to chunk coordinates
        const centerChunkX = Math.floor(position.x / (this.chunkSize.x * this.blockSize));
        const centerChunkZ = Math.floor(position.z / (this.chunkSize.z * this.blockSize));
        
        // Track newly loaded chunks and chunks to unload
        const newlyLoadedChunks = [];
        const chunksToKeep = new Set();
        
        // Generate chunks in render distance
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                const chunkX = centerChunkX + x;
                const chunkZ = centerChunkZ + z;
                const chunkKey = `${chunkX},${chunkZ}`;
                
                // Mark this chunk to keep
                chunksToKeep.add(chunkKey);
                
                // Skip if chunk already exists
                if (this.chunks.has(chunkKey)) {
                    continue;
                }
                
                // Generate the chunk
                const chunk = this.generateChunk(chunkX, chunkZ);
                this.chunks.set(chunkKey, chunk);
                newlyLoadedChunks.push(chunk);
                
                // Add chunk to scene
                this.scene.add(chunk.mesh);
            }
        }
        
        // Unload chunks outside render distance
        for (const [chunkKey, chunk] of this.chunks.entries()) {
            if (!chunksToKeep.has(chunkKey)) {
                // Remove chunk from scene
                this.scene.remove(chunk.mesh);
                
                // Dispose geometry and materials
                if (chunk.mesh.geometry) {
                    chunk.mesh.geometry.dispose();
                }
                
                if (Array.isArray(chunk.mesh.material)) {
                    chunk.mesh.material.forEach(material => material.dispose());
                } else if (chunk.mesh.material) {
                    chunk.mesh.material.dispose();
                }
                
                // Remove from chunks map
                this.chunks.delete(chunkKey);
            }
        }
        
        console.log(`Loaded ${newlyLoadedChunks.length} new chunks, total chunks: ${this.chunks.size}`);
        
        // Update collidable objects
        this.updateCollidableObjects();
        
        return newlyLoadedChunks;
    }
    
    /**
     * Generate a single chunk
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {Object} - The generated chunk
     * @private
     */
    generateChunk(chunkX, chunkZ) {
        console.log(`Generating chunk at ${chunkX}, ${chunkZ}`);
        
        const chunkBlocks = [];
        const chunkWorldX = chunkX * this.chunkSize.x;
        const chunkWorldZ = chunkZ * this.chunkSize.z;
        
        // Generate heightmap for this chunk
        const heightMap = this.generateHeightMap(chunkX, chunkZ);
        
        // Create blocks based on height map
        for (let x = 0; x < this.chunkSize.x; x++) {
            for (let z = 0; z < this.chunkSize.z; z++) {
                const worldX = chunkWorldX + x;
                const worldZ = chunkWorldZ + z;
                
                // Get height at this position
                const height = heightMap[x][z];
                
                // Generate blocks up to the height
                for (let y = 0; y < this.chunkSize.y; y++) {
                    const blockType = this.determineBlockType(worldX, y, worldZ, height);
                    
                    // Skip air blocks
                    if (blockType === 'air') {
                        continue;
                    }
                    
                    // Create the block
                    const block = this.createBlock(blockType, worldX, y, worldZ);
                    
                    if (block) {
                        chunkBlocks.push(block);
                        
                        // Store block data
                        this.blockData.set(`${worldX},${y},${worldZ}`, blockType);
                    }
                }
                
                // Generate trees or other structures
                if (this.shouldGenerateTree(worldX, height, worldZ)) {
                    this.generateStructure('tree', worldX, height, worldZ, chunkBlocks);
                }
            }
        }
        
        // Create merged geometry for better performance
        const chunkMesh = this.createMergedChunkMesh(chunkBlocks, chunkX, chunkZ);
        
        return {
            position: { x: chunkX, z: chunkZ },
            blocks: chunkBlocks,
            mesh: chunkMesh,
            loaded: true
        };
    }
    
    /**
     * Generate a height map for a chunk
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {Array} - 2D array of height values
     * @private
     */
    generateHeightMap(chunkX, chunkZ) {
        const heightMap = [];
        const chunkWorldX = chunkX * this.chunkSize.x;
        const chunkWorldZ = chunkZ * this.chunkSize.z;
        
        for (let x = 0; x < this.chunkSize.x; x++) {
            heightMap[x] = [];
            
            for (let z = 0; z < this.chunkSize.z; z++) {
                const worldX = chunkWorldX + x;
                const worldZ = chunkWorldZ + z;
                
                // Generate base terrain height using noise
                // This is a placeholder for actual noise implementation
                const nx = worldX * this.noiseGenerators.terrain.scale;
                const nz = worldZ * this.noiseGenerators.terrain.scale;
                
                // Simplified noise calculation (replace with actual noise function)
                const noise1 = Math.sin(nx) * Math.cos(nz) * 0.5 + 0.5;
                const noise2 = Math.cos(nx * 0.5) * Math.sin(nz * 0.5) * 0.5 + 0.5;
                
                // Combine noise values
                const combinedNoise = (noise1 * 0.7 + noise2 * 0.3);
                
                // Calculate final height
                let height = Math.floor(
                    this.terrainHeightMin + 
                    combinedNoise * (this.terrainHeightMax - this.terrainHeightMin)
                );
                
                // Add some random variation
                height += Math.floor(Math.random() * 3) - 1;
                
                heightMap[x][z] = height;
            }
        }
        
        return heightMap;
    }
    
    /**
     * Determine the type of block to place at a given position
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     * @param {number} surfaceHeight - Surface height at this x,z position
     * @returns {string} - Type of block to place
     * @private
     */
    determineBlockType(x, y, z, surfaceHeight) {
        // Bedrock at bottom
        if (y === 0) {
            return 'stone';
        }
        
        // Below surface
        if (y < surfaceHeight - 4) {
            // Occasional ore veins would go here
            return 'stone';
        }
        
        // Just below surface
        if (y < surfaceHeight) {
            return 'dirt';
        }
        
        // Surface block
        if (y === surfaceHeight) {
            // Determine biome and surface block
            // For now just use grass
            return 'grass';
        }
        
        // Above surface (air)
        return 'air';
    }
    
    /**
     * Check if a tree should be generated at this position
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate (surface height)
     * @param {number} z - World Z coordinate
     * @returns {boolean} - Whether to generate a tree
     * @private
     */
    shouldGenerateTree(x, y, z) {
        // Simple random tree placement
        // More complex biome-based generation would go here
        return Math.random() < 0.02; // 2% chance per block
    }
    
    /**
     * Generate a structure at a specific position
     * @param {string} structureType - Type of structure to generate
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate (base)
     * @param {number} z - World Z coordinate
     * @param {Array} blockArray - Array to add new blocks to
     * @private
     */
    generateStructure(structureType, x, y, z, blockArray) {
        const structure = this.structures[structureType];
        
        if (!structure) {
            console.warn(`Unknown structure type: ${structureType}`);
            return;
        }
        
        // Tree generation
        if (structureType === 'tree') {
            const height = structure.height;
            const radius = structure.canopyRadius;
            
            // Generate structure blocks in the area
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = 0; dy <= height; dy++) {
                    for (let dz = -radius; dz <= radius; dz++) {
                        const blockType = structure.getBlock(dx, dy, dz);
                        
                        if (blockType !== 'air') {
                            const blockX = x + dx;
                            const blockY = y + dy;
                            const blockZ = z + dz;
                            
                            // Create the block
                            const block = this.createBlock(blockType, blockX, blockY, blockZ);
                            
                            if (block) {
                                blockArray.push(block);
                                
                                // Store block data
                                this.blockData.set(`${blockX},${blockY},${blockZ}`, blockType);
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Create a block of a specific type
     * @param {string} blockType - Type of block to create
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     * @returns {THREE.Mesh} - The created block mesh
     * @private
     */
    createBlock(blockType, x, y, z) {
        // Use ResourceManager to create a block
        const block = this.resourceManager.createBlock(blockType, { x, y, z });
        
        if (block) {
            // Set block position
            block.position.set(x, y, z);
            
            // Mark as a specific block type
            block.userData.blockType = blockType;
            block.userData.isBlock = true;
            
            return block;
        }
        
        return null;
    }
    
    /**
     * Create a merged mesh for an entire chunk
     * @param {Array} blocks - Array of blocks in the chunk
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {THREE.Mesh} - Merged chunk mesh
     * @private
     */
    createMergedChunkMesh(blocks, chunkX, chunkZ) {
        // For simplified implementation, return a group of blocks
        // In a full implementation, this would create an optimized merged geometry
        const chunkGroup = new THREE.Group();
        chunkGroup.name = `chunk_${chunkX}_${chunkZ}`;
        
        blocks.forEach(block => {
            chunkGroup.add(block);
        });
        
        return chunkGroup;
    }
    
    /**
     * Update the list of collidable objects in the world
     * @private
     */
    updateCollidableObjects() {
        this.collidableObjects = [];
        
        // Add all chunk meshes to collidable objects
        for (const chunk of this.chunks.values()) {
            // For simple implementation, each block is its own mesh
            if (chunk.blocks) {
                this.collidableObjects.push(...chunk.blocks);
            }
        }
    }
    
    /**
     * Get block at a specific position
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     * @returns {string} - Block type at position or 'air' if none
     */
    getBlockAt(x, y, z) {
        const blockKey = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
        return this.blockData.get(blockKey) || 'air';
    }
    
    /**
     * Check if a position is solid (contains a non-air block)
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     * @returns {boolean} - Whether the position is solid
     */
    isSolid(x, y, z) {
        const blockType = this.getBlockAt(x, y, z);
        
        // Get block data
        const blockInfo = this.resourceManager.getBlockType(blockType);
        
        // Check if block is solid
        return blockInfo && blockInfo.solid;
    }
    
    /**
     * Place a block in the world
     * @param {string} blockType - Type of block to place
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     * @returns {boolean} - Whether the block was placed successfully
     */
    placeBlock(blockType, x, y, z) {
        // Ensure coordinates are integers
        x = Math.floor(x);
        y = Math.floor(y);
        z = Math.floor(z);
        
        // Check if there's already a block here
        if (this.getBlockAt(x, y, z) !== 'air') {
            return false;
        }
        
        // Create the block
        const block = this.createBlock(blockType, x, y, z);
        
        if (!block) {
            return false;
        }
        
        // Get the chunk this block belongs to
        const chunkX = Math.floor(x / this.chunkSize.x);
        const chunkZ = Math.floor(z / this.chunkSize.z);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Add block to the appropriate chunk
        if (this.chunks.has(chunkKey)) {
            const chunk = this.chunks.get(chunkKey);
            chunk.blocks.push(block);
            chunk.mesh.add(block);
            
            // Update block data
            this.blockData.set(`${x},${y},${z}`, blockType);
            
            // Update collidable objects
            this.collidableObjects.push(block);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Remove a block from the world
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     * @returns {boolean} - Whether the block was removed successfully
     */
    removeBlock(x, y, z) {
        // Ensure coordinates are integers
        x = Math.floor(x);
        y = Math.floor(y);
        z = Math.floor(z);
        
        // Check if there's a block here
        const blockType = this.getBlockAt(x, y, z);
        
        if (blockType === 'air') {
            return false;
        }
        
        // Get the chunk this block belongs to
        const chunkX = Math.floor(x / this.chunkSize.x);
        const chunkZ = Math.floor(z / this.chunkSize.z);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Remove block from the appropriate chunk
        if (this.chunks.has(chunkKey)) {
            const chunk = this.chunks.get(chunkKey);
            
            // Find and remove the block from the chunk
            const blockIndex = chunk.blocks.findIndex(block => 
                block.position.x === x && 
                block.position.y === y && 
                block.position.z === z
            );
            
            if (blockIndex !== -1) {
                const block = chunk.blocks[blockIndex];
                
                // Remove from scene
                chunk.mesh.remove(block);
                
                // Dispose geometry and material
                if (block.geometry) {
                    block.geometry.dispose();
                }
                
                if (Array.isArray(block.material)) {
                    block.material.forEach(mat => mat.dispose());
                } else if (block.material) {
                    block.material.dispose();
                }
                
                // Remove from blocks array
                chunk.blocks.splice(blockIndex, 1);
                
                // Update block data
                this.blockData.delete(`${x},${y},${z}`);
                
                // Update collidable objects
                this.updateCollidableObjects();
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Ray casting to find the block the player is looking at
     * @param {THREE.Vector3} position - Player position
     * @param {THREE.Vector3} direction - Look direction
     * @returns {Object} - Information about the targeted block or null
     */
    getTargetBlock(position, direction) {
        this.raycaster.set(position, direction.normalize());
        
        // Find intersections with collidable objects
        const intersects = this.raycaster.intersectObjects(this.collidableObjects, false);
        
        if (intersects.length > 0) {
            const intersection = intersects[0];
            
            // Check if intersection is within reach
            if (intersection.distance <= this.maxReach) {
                const block = intersection.object;
                
                // Calculate block position
                const blockPosition = block.position.clone();
                
                // Calculate face normal to determine which face was hit
                const faceNormal = intersection.face.normal.clone();
                
                // Adjacent block position (where a new block would be placed)
                const adjacentPosition = blockPosition.clone().add(faceNormal);
                
                return {
                    position: blockPosition,
                    adjacentPosition: adjacentPosition,
                    normal: faceNormal,
                    distance: intersection.distance,
                    blockType: block.userData.blockType
                };
            }
        }
        
        return null;
    }
    
    /**
     * Get a collision box for physics checks
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     * @returns {Object} - Collision box with min and max points
     */
    getCollisionBox(x, y, z) {
        if (!this.isSolid(x, y, z)) {
            return null;
        }
        
        // Create a simple axis-aligned bounding box
        return {
            min: { x: x, y: y, z: z },
            max: { x: x + 1, y: y + 1, z: z + 1 }
        };
    }
    
    /**
     * Check for collision between a player and all blocks
     * @param {Object} playerBox - Player's bounding box
     * @returns {Array} - Array of collision results
     */
    checkBlockCollisions(playerBox) {
        const collisions = [];
        
        // Check blocks in the vicinity of the player
        const minX = Math.floor(playerBox.min.x - 1);
        const minY = Math.floor(playerBox.min.y - 1);
        const minZ = Math.floor(playerBox.min.z - 1);
        const maxX = Math.ceil(playerBox.max.x + 1);
        const maxY = Math.ceil(playerBox.max.y + 1);
        const maxZ = Math.ceil(playerBox.max.z + 1);
        
        for (let x = minX; x < maxX; x++) {
            for (let y = minY; y < maxY; y++) {
                for (let z = minZ; z < maxZ; z++) {
                    if (this.isSolid(x, y, z)) {
                        const blockBox = this.getCollisionBox(x, y, z);
                        
                        if (blockBox && this.checkBoxCollision(playerBox, blockBox)) {
                            collisions.push({
                                position: { x, y, z },
                                blockType: this.getBlockAt(x, y, z),
                                box: blockBox
                            });
                        }
                    }
                }
            }
        }
        
        return collisions;
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
     * Calculate collision resolution vectors
     * @param {Object} playerBox - Player's bounding box
     * @param {Object} blockBox - Block's bounding box
     * @returns {THREE.Vector3} - Collision resolution vector
     * @private
     */
    calculateResolutionVector(playerBox, blockBox) {
        // Calculate overlap on each axis
        const xOverlap = Math.min(
            playerBox.max.x - blockBox.min.x,
            blockBox.max.x - playerBox.min.x
        );
        
        const yOverlap = Math.min(
            playerBox.max.y - blockBox.min.y,
            blockBox.max.y - playerBox.min.y
        );
        
        const zOverlap = Math.min(
            playerBox.max.z - blockBox.min.z,
            blockBox.max.z - playerBox.min.z
        );
        
        // Find the smallest overlap to resolve the collision
        const resolution = new THREE.Vector3();
        
        if (xOverlap < yOverlap && xOverlap < zOverlap) {
            resolution.x = playerBox.max.x > blockBox.max.x ? xOverlap : -xOverlap;
        } else if (yOverlap < xOverlap && yOverlap < zOverlap) {
            resolution.y = playerBox.max.y > blockBox.max.y ? yOverlap : -yOverlap;
        } else {
            resolution.z = playerBox.max.z > blockBox.max.z ? zOverlap : -zOverlap;
        }
        
        return resolution;
    }
    
    /**
     * Resolve collisions with the world
     * @param {Object} playerBox - Player's bounding box
     * @param {THREE.Vector3} velocity - Player's current velocity
     * @returns {Object} - Resolved position and collision flags
     */
    resolveCollisions(playerBox, velocity) {
        // Check for collisions
        const collisions = this.checkBlockCollisions(playerBox);
        
        // No collisions, return unchanged
        if (collisions.length === 0) {
            return {
                position: new THREE.Vector3(
                    (playerBox.min.x + playerBox.max.x) / 2,
                    playerBox.min.y,
                    (playerBox.min.z + playerBox.max.z) / 2
                ),
                onGround: false,
                colliding: false
            };
        }
        
        // Track if player is on ground
        let onGround = false;
        let resolvedPosition = new THREE.Vector3(
            (playerBox.min.x + playerBox.max.x) / 2,
            playerBox.min.y,
            (playerBox.min.z + playerBox.max.z) / 2
        );
        
        // For each collision, calculate resolution
        for (const collision of collisions) {
            const resolution = this.calculateResolutionVector(playerBox, collision.box);
            
            // Apply resolution to position
            resolvedPosition.add(resolution);
            
            // Check if player is on ground (colliding with a block below)
            if (resolution.y > 0 && Math.abs(resolution.y) > Math.abs(resolution.x) && 
                Math.abs(resolution.y) > Math.abs(resolution.z)) {
                onGround = true;
            }
        }
        
        return {
            position: resolvedPosition,
            onGround,
            colliding: true
        };
    }
    
    /**
     * Save the world state
     * @returns {Object} - World data for saving
     */
    save() {
        const worldData = {
            seed: this.seed,
            blocks: [], // Only save non-default blocks
            version: 1
        };
        
        // Convert block data to array for storage
        for (const [key, value] of this.blockData.entries()) {
            // Only save blocks that differ from the default generated terrain
            // For simple implementation, save all blocks
            const [x, y, z] = key.split(',').map(Number);
            
            worldData.blocks.push({
                x, y, z,
                type: value
            });
        }
        
        return worldData;
    }
    
    /**
     * Load a world from saved data
     * @param {Object} worldData - Saved world data
     */
    load(worldData) {
        // Reset current world
        this.clear();
        
        // Set seed
        this.seed = worldData.seed;
        
        // Load blocks
        if (worldData.blocks) {
            for (const block of worldData.blocks) {
                this.blockData.set(`${block.x},${block.y},${block.z}`, block.type);
            }
        }
        
        console.log(`World loaded with seed ${this.seed}`);
    }
    
    /**
     * Clear the entire world
     */
    clear() {
        // Remove all chunks from scene
        for (const chunk of this.chunks.values()) {
            this.scene.remove(chunk.mesh);
            
            // Dispose of resources
            if (chunk.blocks) {
                for (const block of chunk.blocks) {
                    if (block.geometry) block.geometry.dispose();
                    if (block.material) {
                        if (Array.isArray(block.material)) {
                            block.material.forEach(m => m.dispose());
                        } else {
                            block.material.dispose();
                        }
                    }
                }
            }
        }
        
        // Clear data structures
        this.chunks.clear();
        this.blockData.clear();
        this.collidableObjects = [];
    }
    
    /**
     * Update the world
     * @param {number} deltaTime - Time since last update in seconds
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    update(deltaTime, playerPosition) {
        // Load chunks around player
        this.loadChunksAroundPosition(playerPosition);
        
        // Update any dynamic world elements here
        // For example, water animation, day/night cycle, etc.
    }
} 