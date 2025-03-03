/**
 * ResourceManager - אחראי על טעינת וניהול משאבים במשחק
 * כולל טקסטורות, מודלים, ואיחסונם בזיכרון
 */
export class ResourceManager {
    constructor() {
        this.textures = new Map(); // מאגר טקסטורות
        this.models = new Map();   // מאגר מודלים
        this.materials = new Map(); // מאגר חומרים
        this.blockTypes = new Map(); // סוגי בלוקים
        
        this.textureLoader = new THREE.TextureLoader();
        
        // הגדרת מילון סוגי בלוקים
        this.defineBlockTypes();
    }
    
    /**
     * טעינת מספר טקסטורות בו-זמנית
     * @param {Array} texturesList - רשימת הטקסטורות לטעינה
     * @returns {Promise} - הבטחה שמסמלת את סיום הטעינה
     */
    async loadTextures(texturesList) {
        const promises = texturesList.map(textureInfo => {
            return new Promise((resolve, reject) => {
                this.textureLoader.load(
                    textureInfo.url,
                    texture => {
                        // הגדרות בסיסיות לטקסטורה
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.magFilter = THREE.NearestFilter; // פיקסלים ברורים בסגנון מיינקראפט
                        texture.minFilter = THREE.NearestFilter;
                        
                        // שמירת הטקסטורה במאגר
                        this.textures.set(textureInfo.name, texture);
                        resolve(texture);
                    },
                    undefined, // התקדמות - לא בשימוש כרגע
                    error => {
                        console.error(`Error loading texture ${textureInfo.url}:`, error);
                        reject(error);
                    }
                );
            });
        });
        
        try {
            await Promise.all(promises);
            console.log(`Loaded ${texturesList.length} textures successfully`);
            
            // יצירת חומרים מהטקסטורות שנטענו
            this.createMaterials();
            return true;
        } catch (error) {
            console.error('Failed to load some textures:', error);
            return false;
        }
    }
    
    /**
     * יצירת חומרים מהטקסטורות שנטענו
     */
    createMaterials() {
        // חומרים בסיסיים לכל סוג בלוק
        if (this.textures.has('dirt')) {
            const dirtMaterial = new THREE.MeshLambertMaterial({ 
                map: this.textures.get('dirt'),
                side: THREE.FrontSide
            });
            this.materials.set('dirt', dirtMaterial);
        }
        
        // חומר דשא - שונה בכל פאה
        if (this.textures.has('grass_top') && this.textures.has('grass_side') && this.textures.has('dirt')) {
            // יצירת מערך חומרים - שונה לכל פאה של הקוביה
            const grassMaterials = [
                new THREE.MeshLambertMaterial({ map: this.textures.get('grass_side') }), // right
                new THREE.MeshLambertMaterial({ map: this.textures.get('grass_side') }), // left
                new THREE.MeshLambertMaterial({ map: this.textures.get('grass_top') }),  // top
                new THREE.MeshLambertMaterial({ map: this.textures.get('dirt') }),       // bottom
                new THREE.MeshLambertMaterial({ map: this.textures.get('grass_side') }), // front
                new THREE.MeshLambertMaterial({ map: this.textures.get('grass_side') })  // back
            ];
            this.materials.set('grass', grassMaterials);
        }
        
        // חומר אבן
        if (this.textures.has('stone')) {
            const stoneMaterial = new THREE.MeshLambertMaterial({ 
                map: this.textures.get('stone'),
                side: THREE.FrontSide
            });
            this.materials.set('stone', stoneMaterial);
        }
        
        // חומר חול
        if (this.textures.has('sand')) {
            const sandMaterial = new THREE.MeshLambertMaterial({ 
                map: this.textures.get('sand'),
                side: THREE.FrontSide
            });
            this.materials.set('sand', sandMaterial);
        }
        
        // חומר מים - שקיפות
        if (this.textures.has('water')) {
            const waterMaterial = new THREE.MeshLambertMaterial({ 
                map: this.textures.get('water'),
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            this.materials.set('water', waterMaterial);
        }
        
        // חומר עץ
        if (this.textures.has('wood')) {
            const woodMaterial = new THREE.MeshLambertMaterial({ 
                map: this.textures.get('wood'),
                side: THREE.FrontSide
            });
            this.materials.set('wood', woodMaterial);
        }
        
        // חומר עלים - שקיפות חלקית
        if (this.textures.has('leaves')) {
            const leavesMaterial = new THREE.MeshLambertMaterial({ 
                map: this.textures.get('leaves'),
                transparent: true,
                alphaTest: 0.5,
                side: THREE.DoubleSide
            });
            this.materials.set('leaves', leavesMaterial);
        }
    }
    
    /**
     * הגדרת סוגי בלוקים ומאפייניהם
     */
    defineBlockTypes() {
        this.blockTypes.set('air', {
            id: 0,
            name: 'Air',
            transparent: true,
            solid: false,
            material: null,
            icon: null
        });
        
        this.blockTypes.set('stone', {
            id: 1,
            name: 'Stone',
            transparent: false,
            solid: true,
            material: 'stone',
            icon: 'stone',
            hardness: 2.0,
            drops: 'stone',
            tool: 'pickaxe'
        });
        
        this.blockTypes.set('grass', {
            id: 2,
            name: 'Grass Block',
            transparent: false,
            solid: true,
            material: 'grass',
            icon: 'grass_side',
            hardness: 0.6,
            drops: 'dirt',
            tool: 'shovel'
        });
        
        this.blockTypes.set('dirt', {
            id: 3,
            name: 'Dirt',
            transparent: false,
            solid: true,
            material: 'dirt',
            icon: 'dirt',
            hardness: 0.5,
            drops: 'dirt',
            tool: 'shovel'
        });
        
        this.blockTypes.set('sand', {
            id: 4,
            name: 'Sand',
            transparent: false,
            solid: true,
            material: 'sand',
            icon: 'sand',
            hardness: 0.5,
            drops: 'sand',
            tool: 'shovel',
            physics: 'falling'
        });
        
        this.blockTypes.set('water', {
            id: 5,
            name: 'Water',
            transparent: true,
            solid: false,
            material: 'water',
            icon: 'water',
            physics: 'fluid'
        });
        
        this.blockTypes.set('wood', {
            id: 6,
            name: 'Wood',
            transparent: false,
            solid: true,
            material: 'wood',
            icon: 'wood',
            hardness: 2.0,
            drops: 'wood',
            tool: 'axe'
        });
        
        this.blockTypes.set('leaves', {
            id: 7,
            name: 'Leaves',
            transparent: true,
            solid: true,
            material: 'leaves',
            icon: 'leaves',
            hardness: 0.2,
            drops: 'leaves',
            tool: 'shears'
        });
    }
    
    /**
     * קבלת טקסטורה לפי שם
     */
    getTexture(name) {
        if (!this.textures.has(name)) {
            console.warn(`Texture ${name} not found`);
            return null;
        }
        return this.textures.get(name);
    }
    
    /**
     * קבלת חומר לפי שם
     */
    getMaterial(name) {
        if (!this.materials.has(name)) {
            console.warn(`Material ${name} not found`);
            return new THREE.MeshLambertMaterial({ color: 0xFF00FF }); // חומר שגיאה בצבע סגול
        }
        return this.materials.get(name);
    }
    
    /**
     * קבלת סוג בלוק לפי שם
     */
    getBlockType(name) {
        if (!this.blockTypes.has(name)) {
            console.warn(`Block type ${name} not found`);
            return this.blockTypes.get('air');
        }
        return this.blockTypes.get(name);
    }
    
    /**
     * קבלת סוג בלוק לפי מזהה
     */
    getBlockTypeById(id) {
        for (const [name, type] of this.blockTypes.entries()) {
            if (type.id === id) {
                return type;
            }
        }
        console.warn(`Block with id ${id} not found`);
        return this.blockTypes.get('air');
    }
    
    /**
     * יצירת אובייקט בלוק מסוג מסויים
     */
    createBlock(typeName, position = { x: 0, y: 0, z: 0 }) {
        const blockType = this.getBlockType(typeName);
        
        if (blockType.name === 'Air') {
            return null; // בלוק אוויר הוא בעצם ריק
        }
        
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = this.getMaterial(blockType.material);
        
        const block = new THREE.Mesh(geometry, material);
        block.position.set(position.x, position.y, position.z);
        
        // שמירת מידע על סוג הבלוק
        block.userData.type = blockType;
        
        // הגדרות צל
        block.castShadow = true;
        block.receiveShadow = true;
        
        return block;
    }
} 