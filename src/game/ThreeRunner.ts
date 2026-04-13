import * as THREE from 'three';

export type GameStats = {
  score: number;
  coins: number;
  aiNodes: number;
  cloudTokens: number;
  securityShields: number;
};

class Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;

  constructor(scene: THREE.Scene, pos: THREE.Vector3, color: number) {
    const geo = new THREE.SphereGeometry(0.12, 6, 4);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(pos);
    scene.add(this.mesh);
    
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      Math.random() * 10 + 2,
      (Math.random() - 0.5) * 8
    );
    this.maxLife = 0.5 + Math.random() * 0.4;
    this.life = this.maxLife;
  }

  update(dt: number, scene: THREE.Scene) {
    this.life -= dt;
    this.velocity.y -= 15 * dt; // gravity
    this.mesh.position.addScaledVector(this.velocity, dt);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = this.life / this.maxLife;
    if (this.life <= 0) scene.remove(this.mesh);
  }
}

type OnScoreUpdate = (score: number, coins: number, speed: number, multiplier: number, powerups: { magnet: number }) => void;
type OnGameOver = (stats: GameStats) => void;

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const LANE_WIDTH = 3;
const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];
const SEGMENT_LENGTH = 20;
const VISIBLE_SEGMENTS = 12;
const JUMP_FORCE = 18;
const GRAVITY = -40;
const PLAYER_Z = 0; // Player always at z=0, world scrolls

// Neon palette
const COL = {
  cyan:   0x00f2ff,
  purple: 0xd575ff,
  pink:   0xff0088,
  yellow: 0xffd500,
  red:    0xff3344,
  green:  0x00ff88,
};

// ─────────────────────────────────────────────
//  Main Three.js Runner Engine
// ─────────────────────────────────────────────
export class ThreeRunner {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Player
  private playerGroup!: THREE.Group;
  private limbAngle = 0;
  private currentLane = 1; // 0,1,2
  private targetLaneX = 0;
  private playerY = 0;
  private velocityY = 0;
  private isSliding = false;
  private isJumping = false;
  private slideTimer = 0;

  // World / Track
  private trackSegments: THREE.Group[] = [];
  private worldZ = 0; // How far the world has moved
  private speed = 12; // units/s
  private readonly MAX_SPEED = 40;
  private readonly ACCEL = 0.004;

  // Power-ups
  private magnetTimer = 0;
  private activeParticles: Particle[] = [];
  
  // Speed Trail
  private trailCooldown = 0;

  // Objects in world
  private worldObjects: THREE.Object3D[] = [];

  // Score
  private score = 0;
  private coins = 0;
  private multiplier = 1;
  private stats: GameStats = { score: 0, coins: 0, aiNodes: 0, cloudTokens: 0, securityShields: 0 };

  private frameCount = 0;
  private running = true;
  private animFrameId = 0;
  private clock = new THREE.Clock();

  // Callbacks (React)
  private onScoreUpdate: OnScoreUpdate;
  private onGameOver: OnGameOver;

  constructor(canvas: HTMLCanvasElement, onScoreUpdate: OnScoreUpdate, onGameOver: OnGameOver) {
    this.onScoreUpdate = onScoreUpdate;
    this.onGameOver = onGameOver;

    // ─── Scene ───
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08091a);
    this.scene.fog = new THREE.Fog(0x08091a, 40, 120);

    // ─── Camera (behind + slightly above player) ───
    this.camera = new THREE.PerspectiveCamera(65, canvas.width / canvas.height, 0.1, 200);
    this.camera.position.set(0, 6, 12);
    this.camera.lookAt(0, 1, -30);

    // ─── Renderer ───
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ─── Lighting ───
    const ambient = new THREE.AmbientLight(0x111133, 3);
    this.scene.add(ambient);

    // Key light (neon cyan from top-front)
    const keyLight = new THREE.DirectionalLight(0x00f2ff, 4);
    keyLight.position.set(0, 15, 10);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Fill light (purple from rear)
    const fillLight = new THREE.DirectionalLight(0xd575ff, 2);
    fillLight.position.set(0, 5, -20);
    this.scene.add(fillLight);

    // Ground bounce (warm accent from below)
    const groundLight = new THREE.PointLight(0xff0088, 3, 30);
    groundLight.position.set(0, -1, -5);
    this.scene.add(groundLight);

    this.buildPlayer();
    this.buildInitialTrack();
    this.buildSkyElements();
    this.setupInput();
    this.loop();
  }

  // ─────────────────────────────────────────────────────
  //  PLAYER — Procedural Articulated Character
  // ─────────────────────────────────────────────────────
  private buildPlayer() {
    this.playerGroup = new THREE.Group();
    this.scene.add(this.playerGroup);
    this.playerGroup.position.set(LANE_POSITIONS[1], 0, PLAYER_Z);

    const mat = (color: number, emissive?: number) => new THREE.MeshStandardMaterial({
      color,
      emissive: emissive ?? color,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.7
    });

    const box = (w: number, h: number, d: number, mat: THREE.Material) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.castShadow = true;
      return m;
    };

    // Head
    const head = box(0.6, 0.6, 0.6, mat(0x00f2ff, 0x00f2ff));
    head.position.set(0, 2.6, 0);
    head.name = 'head';
    this.playerGroup.add(head);

    // Torso
    const torso = box(0.9, 1.0, 0.45, mat(0x1a1a4a));
    torso.position.set(0, 1.7, 0);
    torso.name = 'torso';
    this.playerGroup.add(torso);

    // Visor glow (bright strip on chest)
    const visor = box(0.7, 0.08, 0.5, mat(0x00f2ff, 0x00f2ff));
    visor.position.set(0, 1.95, 0);
    torso.add(visor);

    // Hips
    const hips = box(0.85, 0.45, 0.4, mat(0x111144));
    hips.position.set(0, 1.1, 0);
    this.playerGroup.add(hips);

    // LEFT ARM (group for rotation pivot at shoulder)
    const lArmGroup = new THREE.Group();
    lArmGroup.position.set(0.6, 2.2, 0);
    lArmGroup.name = 'lArm';
    const lUpper = box(0.28, 0.7, 0.28, mat(0xd575ff, 0xd575ff));
    lUpper.position.y = -0.35;
    lArmGroup.add(lUpper);
    const lForearm = box(0.22, 0.6, 0.22, mat(0xaa44ee));
    lForearm.position.y = -1.0;
    lArmGroup.add(lForearm);
    this.playerGroup.add(lArmGroup);

    // RIGHT ARM
    const rArmGroup = new THREE.Group();
    rArmGroup.position.set(-0.6, 2.2, 0);
    rArmGroup.name = 'rArm';
    const rUpper = box(0.28, 0.7, 0.28, mat(0xd575ff, 0xd575ff));
    rUpper.position.y = -0.35;
    rArmGroup.add(rUpper);
    const rForearm = box(0.22, 0.6, 0.22, mat(0xaa44ee));
    rForearm.position.y = -1.0;
    rArmGroup.add(rForearm);
    this.playerGroup.add(rArmGroup);

    // LEFT LEG
    const lLegGroup = new THREE.Group();
    lLegGroup.position.set(0.28, 1.1, 0);
    lLegGroup.name = 'lLeg';
    const lThigh = box(0.35, 0.75, 0.35, mat(0x2222aa));
    lThigh.position.y = -0.375;
    lLegGroup.add(lThigh);
    const lShin = box(0.28, 0.65, 0.28, mat(0x1111cc));
    lShin.position.y = -1.02;
    lLegGroup.add(lShin);
    const lFoot = box(0.28, 0.2, 0.55, mat(0x00f2ff, 0x00f2ff));
    lFoot.position.set(0, -1.42, 0.12);
    lLegGroup.add(lFoot);
    this.playerGroup.add(lLegGroup);

    // RIGHT LEG
    const rLegGroup = new THREE.Group();
    rLegGroup.position.set(-0.28, 1.1, 0);
    rLegGroup.name = 'rLeg';
    const rThigh = box(0.35, 0.75, 0.35, mat(0x2222aa));
    rThigh.position.y = -0.375;
    rLegGroup.add(rThigh);
    const rShin = box(0.28, 0.65, 0.28, mat(0x1111cc));
    rShin.position.y = -1.02;
    rLegGroup.add(rShin);
    const rFoot = box(0.28, 0.2, 0.55, mat(0x00f2ff, 0x00f2ff));
    rFoot.position.set(0, -1.42, 0.12);
    rLegGroup.add(rFoot);
    this.playerGroup.add(rLegGroup);

    // Neon Reactor (on back)
    const reactor = box(0.6, 0.7, 0.3, mat(0x0a0a2a, 0x00f2ff));
    reactor.position.set(0, 1.8, -0.4);
    reactor.name = 'reactor';
    this.playerGroup.add(reactor);

    // Shoulder Pads
    [0.7, -0.7].forEach(side => {
      const pad = box(0.4, 0.25, 0.5, mat(0x111144, 0xd575ff));
      pad.position.set(side, 2.2, 0);
      this.playerGroup.add(pad);
    });

    // Neon edge light (emissive ring around player feet)
    const footGlow = new THREE.PointLight(0x00f2ff, 2.5, 4);
    footGlow.position.set(0, 0.1, 0);
    this.playerGroup.add(footGlow);
  }

  // ─────────────────────────────────────────────────────
  //  TRACK — Procedurally scrolling lane segments
  // ─────────────────────────────────────────────────────
  private buildInitialTrack() {
    for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
      this.addTrackSegment(-i * SEGMENT_LENGTH);
    }
  }

  private addTrackSegment(zPos: number) {
    const seg = new THREE.Group();
    seg.position.z = zPos;

    // Floor tile (dark with grid lines via texture or grid helper)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080818,
      emissive: 0x000511,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(LANE_WIDTH * 3, SEGMENT_LENGTH),
      floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -SEGMENT_LENGTH / 2;
    floor.receiveShadow = true;
    seg.add(floor);

    // Lane divider lines (cyan)
    for (let laneDiv of [-LANE_WIDTH / 2 - 0.02, LANE_WIDTH / 2 + 0.02]) {
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.35 });
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.04, SEGMENT_LENGTH), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(laneDiv, 0.01, -SEGMENT_LENGTH / 2);
      seg.add(line);
    }

    // Side walls (neon wireframe buildings)
    this.addSideBuilding(seg, -LANE_WIDTH * 1.8 - 2, 0xff0088); // Left
    this.addSideBuilding(seg, LANE_WIDTH * 1.8 + 2, 0xffd500);  // Right

    this.trackSegments.push(seg);
    this.scene.add(seg);
  }

  private addSideBuilding(parent: THREE.Group, x: number, color: number) {
    const height = THREE.MathUtils.randFloat(4, 10);
    const width = THREE.MathUtils.randFloat(3, 6);
    const depth = SEGMENT_LENGTH;

    const geo = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.position.set(x, height / 2, -SEGMENT_LENGTH / 2);
    parent.add(wireframe);

    // Glow window dots
    for (let row = 1; row < Math.floor(height / 2); row++) {
      for (let col = -1; col <= 1; col++) {
        if (Math.random() > 0.5) {
          const dot = new THREE.Mesh(
            new THREE.PlaneGeometry(0.25, 0.25),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 + Math.random() * 0.4 })
          );
          dot.position.set(x + col * 0.8, row * 1.6, -SEGMENT_LENGTH / 4 + (Math.random() - 0.5) * depth * 0.8);
          dot.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
          parent.add(dot);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────
  //  SKY — Stars + horizon glow
  // ─────────────────────────────────────────────────────
  private buildSkyElements() {
    // Star field
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(600);
    for (let i = 0; i < 200; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = 10 + Math.random() * 50;
      positions[i * 3 + 2] = -(Math.random() * 200);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25 }));
    this.scene.add(stars);

    // Horizon neon sun (big flat circle far away)
    const sunGeo = new THREE.CircleGeometry(8, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xff0088, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 6, -100);
    this.scene.add(sun);

    // Sun glow ring
    const ringGeo = new THREE.RingGeometry(8.2, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4466, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 6, -100.1);
    this.scene.add(ring);

    // Horizontal stripes on the sun (synthwave)
    for (let i = -3; i <= 3; i++) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 0.25),
        new THREE.MeshBasicMaterial({ color: 0x0a0a20, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      stripe.position.set(0, 6 + i * 1.1, -99.8);
      this.scene.add(stripe);
    }
  }

  // ─────────────────────────────────────────────────────
  //  OBSTACLES & COLLECTIBLES
  // SPAWN DISTANCE: fixed 60 units ahead of camera
  // ─────────────────────────────────────────────────────
  private get spawnZ(): number {
    // Spawn objects 60 units in front of camera (~5s at base speed)
    return -60;
  }

  private spawnObject() {
    const laneIdx = Math.floor(Math.random() * 3);
    const x = LANE_POSITIONS[laneIdx];
    const z = this.spawnZ;

    const rand = Math.random();
    if (rand < 0.35) {
      this.spawnCoinRow(z);
    } else if (rand < 0.48) {
      this.spawnTechToken(x, z);
    } else if (rand < 0.62) {
      this.spawnBarrier(x, z);
    } else if (rand < 0.74) {
      this.spawnLaser(laneIdx, z);
    } else if (rand < 0.85) {
      this.spawnBug(x, z);
    } else {
      this.spawnMagnet(x, z);
    }
  }

  // Rare Magnet Power-up token
  private spawnMagnet(x: number, z: number) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: COL.cyan, emissive: COL.cyan, emissiveIntensity: 1.2 })
    );
    core.rotation.x = Math.PI / 2;
    g.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    g.add(ring);
    
    const glow = new THREE.PointLight(COL.cyan, 3, 4);
    g.add(glow);

    g.position.set(x, 1.2, z);
    g.userData = { type: 'magnet' };
    this.worldObjects.push(g);
    this.scene.add(g);
  }

  // Gold spinning coin (collectible)
  private spawnCoin(x: number, z: number) {
    const g = new THREE.Group();

    // Outer ring
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.14, 12, 24),
      new THREE.MeshStandardMaterial({ color: COL.yellow, emissive: COL.yellow, emissiveIntensity: 0.9, metalness: 0.9, roughness: 0.1 })
    );
    g.add(torus);

    // Star inside
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    g.add(star);

    // Glow light
    const glow = new THREE.PointLight(COL.yellow, 1.5, 2.5);
    g.add(glow);

    g.position.set(x, 1.3, z);
    g.userData = { type: 'coin' };
    this.worldObjects.push(g);
    this.scene.add(g);
  }

  // Row of 3 coins across lanes
  private spawnCoinRow(z: number) {
    const allThree = Math.random() > 0.5;
    if (allThree) {
      LANE_POSITIONS.forEach(lx => this.spawnCoin(lx, z));
    } else {
      const laneIdx = Math.floor(Math.random() * 3);
      // 3 coins in sequence in same lane
      for (let i = 0; i < 4; i++) {
        this.spawnCoin(LANE_POSITIONS[laneIdx], z - i * 4);
      }
    }
  }

  // Branded tech token: Azure, Cloud, Supabase, .NET
  private spawnTechToken(x: number, z: number) {
    const brands = [
      { label: 'Az', color: 0x0078d4, emissive: 0x0078d4, type: 'azure', shape: 'hex' },
      { label: '☁', color: 0x00b4d8, emissive: 0x00b4d8, type: 'cloud', shape: 'sphere' },
      { label: 'SB', color: 0x3fcf8e, emissive: 0x3fcf8e, type: 'supabase', shape: 'diamond' },
      { label: '.N', color: 0x512bd4, emissive: 0x512bd4, type: 'dotnet', shape: 'hex' },
    ];
    const brand = brands[Math.floor(Math.random() * brands.length)];

    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: brand.color, emissive: brand.emissive, emissiveIntensity: 0.7,
      metalness: 0.6, roughness: 0.2
    });

    let mesh: THREE.Mesh;
    if (brand.shape === 'sphere') {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat);
    } else if (brand.shape === 'diamond') {
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.65), mat);
    } else {
      // Hexagonal prism approximated as cylinder
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.35, 6), mat);
    }
    mesh.position.y = 0.35;
    g.add(mesh);

    // Glow outline (EdgesGeometry)
    const edgeMat = new THREE.LineBasicMaterial({ color: brand.color, transparent: true, opacity: 0.8 });
    const edgeGeo = new THREE.EdgesGeometry(mesh.geometry);
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.y = 0.35;
    g.add(edges);

    // Top floating text panel (brand label)
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6),
      new THREE.MeshBasicMaterial({ color: brand.color })
    );
    pillar.position.y = 1.2;
    g.add(pillar);

    // Glow point light
    const glow = new THREE.PointLight(brand.color, 2, 3);
    glow.position.y = 0.5;
    g.add(glow);

    g.position.set(x, 0, z);
    g.userData = { type: brand.type, scoreValue: 1000 };
    this.worldObjects.push(g);
    this.scene.add(g);
  }

  // BARRIER — tall wall, must JUMP over it
  private spawnBarrier(x: number, z: number) {
    const g = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.88
    });
    const block = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 0.5), mat);
    block.position.y = 1.2;
    g.add(block);

    // Hazard edges
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6, 2.4, 0.5)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
    );
    edges.position.y = 1.2;
    g.add(edges);

    // Warning stripes across barrier
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.15, 0.55),
        new THREE.MeshBasicMaterial({ color: 0xffd500 })
      );
      stripe.position.y = 0.4 + i * 0.8;
      g.add(stripe);
    }

    // Glow
    const glow = new THREE.PointLight(0xff0044, 3, 5);
    glow.position.y = 1.2;
    g.add(glow);

    g.position.set(x, 0, z);
    g.userData = { type: 'barrier' };
    this.worldObjects.push(g);
    this.scene.add(g);
  }

  // LASER — low beam, must SLIDE under it
  private spawnLaser(laneIdx: number, z: number) {
    const g = new THREE.Group();
    // Group positioned at lane x, world z (just like all other objects)
    const x = LANE_POSITIONS[laneIdx];
    g.position.set(x, 0, z);

    // Posts on each side (local coords relative to group)
    const postMat = new THREE.MeshStandardMaterial({ color: 0x223355, emissive: 0x001133 });
    [-1.4, 1.4].forEach(side => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8), postMat);
      post.position.set(side, 0.6, 0); // Relative to group, NOT world
      g.add(post);
    });

    // The beam (local coords)
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, LANE_WIDTH * 1.0, 8),
      new THREE.MeshStandardMaterial({ color: COL.cyan, emissive: COL.cyan, emissiveIntensity: 1.5, transparent: true, opacity: 0.95 })
    );
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, 1.0, 0); // Relative to group
    g.add(beam);

    // Glow (local)
    const glow = new THREE.PointLight(COL.cyan, 4, 4);
    glow.position.set(0, 1.0, 0);
    g.add(glow);

    g.userData = { type: 'laser' };
    this.worldObjects.push(g);
    this.scene.add(g);
  }

  // BUG — enemy, must JUMP over it
  private spawnBug(x: number, z: number) {
    const g = new THREE.Group();

    // Body (big red glowing sphere)
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.8 })
    );
    body.position.y = 0.8;
    g.add(body);

    // Bug eyes (two bright dots)
    [[-0.2, 0.2], [0.2, 0.2]].forEach(([ex, ey]) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      eye.position.set(ex, ey, 0.55);
      body.add(eye);
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      pupil.position.z = 0.06;
      eye.add(pupil);
    });

    // 6 legs (3 each side)
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.03, 1.0, 4),
          new THREE.MeshBasicMaterial({ color: 0xcc0000 })
        );
        leg.position.set(side * 0.65, 0.5 - i * 0.15, 0);
        leg.rotation.z = side * (Math.PI / 4 + i * 0.15);
        g.add(leg);
      }
    }

    // Red glow
    const glow = new THREE.PointLight(0xff0000, 3, 4);
    glow.position.y = 0.8;
    g.add(glow);

    g.position.set(x, 0, z);
    g.userData = { type: 'bug' };
    this.worldObjects.push(g);
    this.scene.add(g);
  }

  // ─────────────────────────────────────────────────────
  //  INPUT
  // ─────────────────────────────────────────────────────
  private setupInput() {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.changeLane(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.changeLane(1);
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') this.jump();
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.startSlide();
    };
    window.addEventListener('keydown', onKey);

    // Touch swipes
    let touchStartX = 0, touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 40) this.changeLane(1); else if (dx < -40) this.changeLane(-1);
      } else {
        if (dy < -40) this.jump(); else if (dy > 40) this.startSlide();
      }
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
  }

  changeLane(dir: number) {
    const next = THREE.MathUtils.clamp(this.currentLane + dir, 0, 2);
    if (next !== this.currentLane) {
      this.currentLane = next;
      this.targetLaneX = LANE_POSITIONS[next];
    }
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.velocityY = JUMP_FORCE;
    }
  }

  startSlide() {
    if (!this.isJumping && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = 0.7;
    }
  }

  // ─────────────────────────────────────────────────────
  //  ANIMATION — Running Cycle
  // ─────────────────────────────────────────────────────
  private animateCharacter(dt: number) {
    if (!this.playerGroup) return;
    this.limbAngle += dt * 8 * (this.speed / 15);

    const lLeg = this.playerGroup.getObjectByName('lLeg') as THREE.Group;
    const rLeg = this.playerGroup.getObjectByName('rLeg') as THREE.Group;
    const lArm = this.playerGroup.getObjectByName('lArm') as THREE.Group;
    const rArm = this.playerGroup.getObjectByName('rArm') as THREE.Group;

    if (this.isSliding) {
      // Slide: crouch down
      this.playerGroup.scale.y = THREE.MathUtils.lerp(this.playerGroup.scale.y, 0.5, 0.2);
      this.playerGroup.position.y = THREE.MathUtils.lerp(this.playerGroup.position.y, -0.5, 0.2);
    } else if (this.isJumping) {
      // Jump: legs slightly tucked
      this.playerGroup.scale.y = THREE.MathUtils.lerp(this.playerGroup.scale.y, 1, 0.15);
      if (lLeg) lLeg.rotation.x = THREE.MathUtils.lerp(lLeg.rotation.x, -0.8, 0.2);
      if (rLeg) rLeg.rotation.x = THREE.MathUtils.lerp(rLeg.rotation.x, -0.8, 0.2);
      if (lArm) lArm.rotation.x = THREE.MathUtils.lerp(lArm.rotation.x, -1.0, 0.2);
      if (rArm) rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, -1.0, 0.2);
    } else {
      // Normal running cycle
      this.playerGroup.scale.y = THREE.MathUtils.lerp(this.playerGroup.scale.y, 1, 0.15);
      this.playerGroup.position.y = THREE.MathUtils.lerp(this.playerGroup.position.y, this.playerY, 0.3);
      const swing = Math.sin(this.limbAngle) * 0.8;
      if (lLeg) lLeg.rotation.x = swing;
      if (rLeg) rLeg.rotation.x = -swing;
      if (lArm) lArm.rotation.x = -swing * 0.7;
      if (rArm) rArm.rotation.x = swing * 0.7;
    }

    // Body bob
    const head = this.playerGroup.getObjectByName('head');
    if (head) head.position.y = 2.6 + Math.abs(Math.sin(this.limbAngle * 2)) * 0.07;

    // Reactor pulse
    const reactor = this.playerGroup.getObjectByName('reactor') as THREE.Mesh;
    if (reactor) {
      const reactorMat = reactor.material as THREE.MeshStandardMaterial;
      reactorMat.emissiveIntensity = 0.5 + Math.sin(this.frameCount * 0.1) * 0.3;
    }

    // Speed Trail Logic
    if (this.speed > 20) {
      this.trailCooldown -= dt;
      if (this.trailCooldown <= 0) {
        this.spawnTrail();
        this.trailCooldown = 0.05 + (40 - this.speed) * 0.005; 
      }
    }

    // Smooth lane change
    this.playerGroup.position.x = THREE.MathUtils.lerp(this.playerGroup.position.x, this.targetLaneX, dt * 14);
  }

  private spawnTrail() {
    const geo = new THREE.PlaneGeometry(0.8, 0.1);
    const mat = new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.4 });
    const trail = new THREE.Mesh(geo, mat);
    trail.rotation.x = -Math.PI / 2;
    // Set position at feet
    trail.position.copy(this.playerGroup.position);
    trail.position.y = 0.05;
    trail.userData = { type: 'trail', life: 0.4 };
    this.worldObjects.push(trail);
    this.scene.add(trail);
  }

  // ─────────────────────────────────────────────────────
  //  COLLISION
  //  - Bugs: must JUMP (playerY > 1.2), else game over
  //  - Barriers: must JUMP HIGH (playerY > 2.0), else game over
  //  - Lasers: must SLIDE, else game over
  //  - Coins / Tech Tokens: auto collect on contact
  // ─────────────────────────────────────────────────────
  private checkCollisions() {
    const DIST_Z = 2.8;   // z tolerance for collision
    const DIST_X = 1.6;   // x tolerance (lane width ~1.4)
    const PLAYER_X = this.playerGroup.position.x;

    for (let i = this.worldObjects.length - 1; i >= 0; i--) {
      const obj = this.worldObjects[i];
      const dz = Math.abs(obj.position.z - PLAYER_Z);
      const dx = Math.abs(obj.position.x - PLAYER_X);

      if (dz > DIST_Z || dx > DIST_X) continue;

      const type = obj.userData.type as string;

      // ── COLLECTIBLES ──
      if (type === 'coin') {
        this.coins++;
        this.stats.coins++;
        this.score += 300;
        this.spawnBurst(obj.position, COL.yellow, 8);
        this.scene.remove(obj);
        this.worldObjects.splice(i, 1);
        continue;
      }

      if (['azure', 'cloud', 'supabase', 'dotnet'].includes(type)) {
        if (type === 'azure') this.stats.aiNodes++;
        else if (type === 'cloud') this.stats.cloudTokens++;
        else if (type === 'supabase') this.stats.securityShields++;
        this.score += obj.userData.scoreValue ?? 1000;
        const color = (obj.children[0] as THREE.Mesh).material instanceof THREE.MeshStandardMaterial 
          ? ((obj.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHex() 
          : COL.cyan;
        this.spawnBurst(obj.position, color, 15);
        this.scene.remove(obj);
        this.worldObjects.splice(i, 1);
        continue;
      }

      if (type === 'magnet') {
        this.magnetTimer = 10; // 10 seconds of magnet
        this.score += 500;
        this.spawnBurst(obj.position, COL.cyan, 25);
        this.scene.remove(obj);
        this.worldObjects.splice(i, 1);
        continue;
      }

      // ── HAZARDS ──
      if (type === 'bug') {
        if (this.playerY > 1.2) {
          this.score += 1500;
          this.spawnBurst(obj.position, COL.red, 12);
          this.scene.remove(obj);
          this.worldObjects.splice(i, 1);
          continue;
        }
        this.triggerGameOver();
        return;
      }

      if (type === 'barrier') {
        if (this.playerY > 2.0) {
          this.score += 2000;
          this.spawnBurst(obj.position, COL.pink, 12);
          this.scene.remove(obj);
          this.worldObjects.splice(i, 1);
          continue;
        }
        this.triggerGameOver();
        return;
      }

      if (type === 'laser') {
        if (this.isSliding) {
          this.score += 1200;
          this.spawnBurst(obj.position, COL.cyan, 12);
          this.scene.remove(obj);
          this.worldObjects.splice(i, 1);
          continue;
        }
        this.triggerGameOver();
        return;
      }
    }
  }

  private spawnBurst(pos: THREE.Vector3, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const p = new Particle(this.scene, pos, color);
      this.activeParticles.push(p);
    }
  }

  public triggerGameOver() {
    this.spawnBurst(this.playerGroup.position, COL.red, 60);
    this.running = false;
    this.stats.score = this.score;
    this.onGameOver(this.stats);
  }

  // ─────────────────────────────────────────────────────
  //  MAIN LOOP
  // ─────────────────────────────────────────────────────
  private loop() {
    this.animFrameId = requestAnimationFrame(() => this.loop());
    if (!this.running) return;

    const dt = Math.min(this.clock.getDelta(), 0.05); // Cap dt to prevent spiral
    this.frameCount++;

    // Accelerate
    if (this.speed < this.MAX_SPEED) this.speed += this.ACCEL * this.speed;
    this.multiplier = Math.floor(1 + this.speed / 10);

    // Score
    this.score += Math.floor(this.speed * dt * 2);
    this.stats.score = this.score;

    // Slide timer
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.isSliding = false;
    }

    // Power-up timers
    if (this.magnetTimer > 0) {
      this.magnetTimer -= dt;
    }

    // Update particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.update(dt, this.scene);
      if (p.life <= 0) {
        this.activeParticles.splice(i, 1);
      }
    }

    // Gravity
    if (this.isJumping || this.playerY > 0) {
      this.velocityY += GRAVITY * dt;
      this.playerY += this.velocityY * dt;
      if (this.playerY <= 0) {
        this.playerY = 0;
        this.velocityY = 0;
        this.isJumping = false;
      }
    }
    this.playerGroup.position.y = this.playerY;

    // Animate character
    this.animateCharacter(dt);

    // Scroll the world (move all track segments toward camera)
    const move = this.speed * dt;
    this.worldZ += move;

    this.trackSegments.forEach(seg => {
      seg.position.z += move;
      if (seg.position.z > 2 * SEGMENT_LENGTH) {
        // Recycle segment to far end
        const minZ = Math.min(...this.trackSegments.map(s => s.position.z));
        seg.position.z = minZ - SEGMENT_LENGTH;
      }
    });

    // Move world objects
    this.worldObjects.forEach(obj => { 
      const type = obj.userData.type;
      
      // Magnet Pull logic
      if (this.magnetTimer > 0 && (type === 'coin' || ['azure', 'cloud', 'supabase', 'dotnet'].includes(type))) {
        const dist = obj.position.distanceTo(this.playerGroup.position);
        if (dist < 12) {
          // Pull toward player
          const pullSpeed = 25 * dt;
          const dir = new THREE.Vector3().subVectors(this.playerGroup.position, obj.position).normalize();
          obj.position.addScaledVector(dir, pullSpeed);
        }
      }

      obj.position.z += move; 
    });

    // Remove objects that passed camera
    for (let i = this.worldObjects.length - 1; i >= 0; i--) {
      if (this.worldObjects[i].position.z > 15) {
        this.scene.remove(this.worldObjects[i]);
        this.worldObjects.splice(i, 1);
      }
    }

    // Spawn objects — every 60 frames at base speed (~1s), faster at higher speeds
    const spawnEvery = Math.max(35, Math.floor(80 - this.speed));
    if (this.frameCount % spawnEvery === 0) this.spawnObject();

    // Animate world objects
    this.worldObjects.forEach(obj => {
      const type = obj.userData.type as string;
      if (type === 'coin') {
        obj.rotation.y += dt * 4;
      } else if (['azure', 'cloud', 'supabase', 'dotnet'].includes(type)) {
        obj.rotation.y += dt * 1.2;
        // Float up/down
        obj.position.y = Math.sin(this.frameCount * 0.05 + obj.position.x) * 0.15;
      } else if (type === 'bug') {
        // Bug wobble
        obj.rotation.y = Math.sin(this.frameCount * 0.1) * 0.3;
      } else if (type === 'trail') {
        // Fade out trail
        obj.userData.life -= dt;
        const mat = (obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = (obj.userData.life / 0.4) * 0.4;
        if (obj.userData.life <= 0) {
           obj.position.z = 100; // Trigger removal
        }
      }
    });

    // Camera follow (slight Y offset when jumping)
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 6 + this.playerY * 0.3, 0.1);

    // Collision detection
    this.checkCollisions();

    // Notify React
    if (this.frameCount % 6 === 0) {
      this.onScoreUpdate(this.score, this.coins, this.speed, this.multiplier, {
        magnet: Math.max(0, this.magnetTimer / 10),
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  // ─────────────────────────────────────────────────────
  //  RESIZE
  // ─────────────────────────────────────────────────────
  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
    this.renderer.dispose();
  }
}
