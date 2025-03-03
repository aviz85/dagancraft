/**
 * מחלקת Game - המחלקה המרכזית של המשחק, מאחדת את כל החלקים
 */
class Game {
    constructor() {
        // אובייקטים במשחק
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.player = null;
        this.world = null;
        this.sky = null;
        
        // תאורה
        this.ambientLight = null;
        this.directionalLight = null;
        
        // זמן
        this.clock = new THREE.Clock();
    }
    
    init() {
        // יצירת הסצנה
        this.scene = new THREE.Scene();
        
        // יצירת המצלמה
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 0);
        
        // יצירת הרנדרר
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // יצירת התאורה
        this.createLighting();
        
        // יצירת בקרים
        this.controls = new PointerLockControls(this.camera, document.body);
        
        // טיפול באירועי נעילה/שחרור של הבקרים
        this.setupControlsListeners();
        
        // יצירת העולם
        this.world = new World(this.scene);
        
        // יצירת השמיים
        this.sky = new Sky(this.scene);
        
        // יצירת השחקן
        this.player = new Player(this.scene, this.camera, this.controls, this.world);
        
        // הוספת האזנה לאירועי מקלדת ועכבר
        this.setupEventListeners();
        
        // טיפול בשינוי גודל החלון
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // התחלת לולאת האנימציה
        this.animate();
    }
    
    createLighting() {
        // אור סביבתי
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);
        
        // אור כיווני (כמו השמש)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(50, 200, 100);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 1024;
        this.directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(this.directionalLight);
    }
    
    setupControlsListeners() {
        // טיפול באירועי לחיצה ונעילת הבקרים
        document.addEventListener('click', () => {
            if (!this.controls.isLocked) {
                this.controls.lock();
            }
        });
        
        this.controls.addEventListener('lock', () => {
            document.getElementById('instructions').style.display = 'none';
        });
        
        this.controls.addEventListener('unlock', () => {
            document.getElementById('instructions').style.display = 'block';
        });
    }
    
    setupEventListeners() {
        // הוספת האזנה לאירועי עכבר עבור הוספה/הסרה של בלוקים
        window.addEventListener('mousedown', (event) => {
            this.world.addRemoveBlock(this.camera, event, this.controls);
        });
        
        // מניעת תפריט קליק ימני
        document.addEventListener('contextmenu', (event) => event.preventDefault());
    }
    
    onWindowResize() {
        // טיפול בשינוי גודל החלון
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        // בקשת פריים הבא
        requestAnimationFrame(this.animate.bind(this));
        
        // חישוב זמן שעבר מהפריים האחרון
        const delta = Math.min(this.clock.getDelta(), 0.1);
        
        // עדכון השמיים
        const skyInfo = this.sky.update(delta);
        
        // עדכון תצוגת הזמן
        document.getElementById('time-display').textContent = this.sky.getTimeFormatted();
        
        // עדכון התאורה
        this.sky.updateLighting(this.ambientLight, this.directionalLight);
        
        // עדכון השחקן
        this.player.update(delta, skyInfo.gameTime);
        
        // רינדור הסצנה
        this.renderer.render(this.scene, this.camera);
    }
} 