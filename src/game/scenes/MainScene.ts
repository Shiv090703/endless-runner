import * as Phaser from 'phaser';

interface ProjResult {
    sx: number;
    sy: number;
    scale: number;
}

export default class MainScene extends Phaser.Scene {
  private score: number = 0;
  private stats = { aiNodes: 0, cloudTokens: 0, securityShields: 0, coins: 0 };
  
  // 3D Engine Constants
  private FOCAL_LENGTH = 300;
  private CAMERA_Y = 300; 
  private HORIZON = 0; 
  
  // Game Logic
  private runSpeed: number = 2000; 
  private maxRunSpeed: number = 8000;
  private acceleration: number = 3; 
  
  // Player
  private player!: Phaser.GameObjects.Sprite;
  private currentLane: number = 1; 
  private laneX: number[] = [-400, 0, 400]; 
  private playerZ: number = 200; 
  
  // Gravity Physics
  private playerY: number = 0; 
  private velocityY: number = 0;
  private gravity: number = 1500;
  private jumpPower: number = -800;
  private isSliding: boolean = false;
  
  // 3D Entities
  private entities: Phaser.GameObjects.Sprite[] = [];
  
  // Grid
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private horizontalLinesZ: number[] = [];

  private onGameOverCallback?: (stats: any) => void;
  private onScoreUpdate?: (score: number, coins: number, speed: number) => void;

  constructor() {
    super('MainScene');
  }

  preload() {
    // Neon wireframe human character
    this.load.svg('player', '/assets/player.svg', { width: 80, height: 120 });
    
    // Obstacles
    this.load.svg('bug', '/assets/bug.svg', { width: 100, height: 100 });
    this.load.svg('barrier', '/assets/barrier.svg', { width: 120, height: 150 });
    this.load.svg('laser', '/assets/laser.svg', { width: 200, height: 100 });
    
    // Items
    this.load.svg('ai_node', '/assets/ai_node.svg', { width: 64, height: 64 });
    this.load.svg('cloud_azure', '/assets/cloud_azure.svg', { width: 64, height: 64 });
    this.load.svg('shield_supabase', '/assets/shield_supabase.svg', { width: 64, height: 64 });
    this.load.svg('coin', '/assets/coin.svg', { width: 48, height: 48 });
  }

  init(data: any) {
    this.onGameOverCallback = data.onGameOver;
    this.onScoreUpdate = data.onScoreUpdate;
    this.score = 0;
    this.stats = { aiNodes: 0, cloudTokens: 0, securityShields: 0, coins: 0 };
    this.runSpeed = 2000; 
    this.entities = [];
    this.playerY = 0;
    this.velocityY = 0;
    this.isSliding = false;
  }

  create() {
    const { width, height } = this.scale;
    this.HORIZON = height * 0.4;
    
    // Sky
    const bgGraphics = this.add.graphics();
    bgGraphics.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x1f0b3b, 0x1f0b3b, 1);
    bgGraphics.fillRect(0, 0, width, this.HORIZON);

    // Sun
    const sunGraphics = this.add.graphics();
    sunGraphics.fillStyle(0xff0088, 1);
    sunGraphics.beginPath();
    sunGraphics.arc(width / 2, this.HORIZON, 100, Math.PI, 0, false);
    sunGraphics.fillPath();

    // Grid
    this.gridGraphics = this.add.graphics();
    for(let i=0; i<15; i++) {
        this.horizontalLinesZ.push((i / 15) * 5000);
    }

    // Player — Neon wireframe human
    this.player = this.add.sprite(0, 0, 'player');
    this.player.setDepth(10000);
    // Animate a subtle body-bob tween to simulate running
    this.tweens.add({
        targets: this.player,
        scaleY: 0.96,
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // Input
    if (this.input.keyboard) {
        this.input.keyboard.on('keydown-LEFT', () => this.switchLane(-1));
        this.input.keyboard.on('keydown-RIGHT', () => this.switchLane(1));
        this.input.keyboard.on('keydown-UP', () => this.handleJump());
        this.input.keyboard.on('keydown-DOWN', () => this.handleSlide());
    }

    this.time.addEvent({ delay: 800, callback: this.spawnEntity, callbackScope: this, loop: true });
  }

  project(x: number, y: number, z: number): ProjResult {
    const safeZ = Math.max(z, 1);
    const scale = this.FOCAL_LENGTH / safeZ;
    const sx = (this.scale.width / 2) + (x * scale);
    const sy = this.HORIZON + ((y + this.CAMERA_Y) * scale);
    return { sx, sy, scale };
  }

  drawGrid() {
      this.gridGraphics.clear();
      const { width, height } = this.scale;
      this.gridGraphics.fillStyle(0x0a0518, 1);
      this.gridGraphics.fillRect(0, this.HORIZON, width, height - this.HORIZON);

      this.gridGraphics.lineStyle(3, 0xd575ff, 0.4);
      this.gridGraphics.beginPath();
      const laneXs = [-800, -400, 0, 400, 800];
      laneXs.forEach(lx => {
          const far = this.project(lx, 0, 5000);
          const near = this.project(lx, 0, 10);
          this.gridGraphics.moveTo(far.sx, far.sy);
          this.gridGraphics.lineTo(near.sx, near.sy);
      });
      this.gridGraphics.strokePath();

      this.gridGraphics.lineStyle(2, 0x00f2ff, 0.8);
      this.gridGraphics.beginPath();
      this.horizontalLinesZ.forEach(z => {
          if (z < 10) return;
          const left = this.project(-1200, 0, z);
          const right = this.project(1200, 0, z);
          this.gridGraphics.moveTo(left.sx, left.sy);
          this.gridGraphics.lineTo(right.sx, right.sy);
      });
      this.gridGraphics.strokePath();
      
      this.gridGraphics.lineStyle(4, 0xff0088, 1);
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(0, this.HORIZON);
      this.gridGraphics.lineTo(width, this.HORIZON);
      this.gridGraphics.strokePath();
  }

  switchLane(dir: number) {
      this.currentLane = Phaser.Math.Clamp(this.currentLane + dir, 0, 2);
  }

  handleJump() {
      if(this.playerY === 0 && !this.isSliding) {
          this.velocityY = this.jumpPower;
          // Squash effect on jump
          this.tweens.add({ targets: this.player, scaleX: 0.85, scaleY: 1.2, duration: 80, yoyo: true, ease: 'Back.easeOut' });
      }
  }

  handleSlide() {
      if(this.playerY === 0 && !this.isSliding) {
          this.isSliding = true;
          this.player.setAngle(90); // Tilt sideways = slide
          this.time.delayedCall(700, () => {
              this.isSliding = false;
              this.player.setAngle(0);
          });
      }
  }

  spawnEntity() {
      const laneIdx = Phaser.Math.Between(0, 2);
      const x = this.laneX[laneIdx];
      const z = 5000; 
      
      const rand = Phaser.Math.Between(1, 100);
      let key = 'coin';
      let typeStr = 'coin';
      let yOffset = 0;
      
      if(rand <= 15) {
          key = 'barrier';
          typeStr = 'barrier';
      } else if (rand <= 30) {
          key = 'laser';
          typeStr = 'laser';
          yOffset = -150; // Lasers float
      } else if (rand <= 40) {
          key = 'bug';
          typeStr = 'bug';
      } else if (rand <= 50) {
          key = 'ai_node'; typeStr = 'ai';
      } else if (rand <= 80) {
          key = 'coin'; typeStr = 'coin';
          yOffset = -50;
      }

      const sprite = this.add.sprite(0, 0, key);
      sprite.setData('x3d', x);
      sprite.setData('y3d', yOffset);
      sprite.setData('z3d', z);
      sprite.setData('type', typeStr);
      
      this.entities.push(sprite);
  }

  update(time: number, delta: number) {
      const dt = delta / 1000;
      if(this.runSpeed < this.maxRunSpeed) this.runSpeed += this.acceleration;
      const speedDt = this.runSpeed * dt;

      // Gravity
      if(this.playerY < 0 || this.velocityY !== 0) {
          this.velocityY += this.gravity * dt;
          this.playerY += this.velocityY * dt;
          
          if(this.playerY > 0) {
              this.playerY = 0;
              this.velocityY = 0;
              if(!this.isSliding) this.player.play('run');
          }
      }

      this.score += Math.floor(speedDt / 10);
      if(this.onScoreUpdate && Math.floor(time) % 5 === 0) this.onScoreUpdate(this.score, this.stats.coins, this.runSpeed);

      for(let i=0; i<this.horizontalLinesZ.length; i++) {
          this.horizontalLinesZ[i] -= speedDt;
          if(this.horizontalLinesZ[i] <= 10) this.horizontalLinesZ[i] = 5000;
      }
      this.drawGrid();

      // Project Player
      const sway = (this.playerY === 0 && !this.isSliding) ? Math.sin(time / 150) * 8 : 0;
      const slideOffset = this.isSliding ? 40 : 0;
      const proj = this.project(this.laneX[this.currentLane] + sway, slideOffset + this.playerY - 280, this.playerZ);
      this.player.setPosition(proj.sx, proj.sy);
      this.player.setScale(proj.scale * 2.2); // Larger to be visible

      const HIT_THRESHOLD = 150; 
      
      for(let i=this.entities.length-1; i>=0; i--) {
          const ent = this.entities[i];
          let ez = ent.getData('z3d') - speedDt;
          
          if(ez < 10) {
              ent.destroy();
              this.entities.splice(i, 1);
              continue;
          }

          ent.setData('z3d', ez);
          const ex = ent.getData('x3d');
          const ey = ent.getData('y3d');
          const type = ent.getData('type');
          
          const ep = this.project(ex, ey, ez);
          ent.setPosition(ep.sx, ep.sy);
          
          if(type === 'coin') {
              ent.scaleX = ep.scale * Math.abs(Math.sin(time / 150)); 
              ent.scaleY = ep.scale;
          } else {
              ent.setScale(ep.scale * 1.5);
          }
          ent.setDepth(10000 / ez);

          // Collision
          if(Math.abs(ez - this.playerZ) < HIT_THRESHOLD && Math.abs(ex - this.laneX[this.currentLane]) < 100) {
              let hit = false;
              
              if(type === 'bug') {
                  if (this.playerY > -100) hit = true;
              } else if (type === 'barrier') {
                  if (this.playerY > -400) hit = true; // Must jump high
              } else if (type === 'laser') {
                  if (!this.isSliding) hit = true; // Must slide
              }

              if(hit) {
                  this.scene.pause();
                  if(this.onGameOverCallback) this.onGameOverCallback({ ...this.stats, score: this.score });
              } else if (type !== 'bug' && type !== 'barrier' && type !== 'laser') {
                  // Collectible
                  if(type === 'ai') this.stats.aiNodes++;
                  else if(type === 'cloud') this.stats.cloudTokens++;
                  else if(type === 'security') this.stats.securityShields++;
                  else if(type === 'coin') this.stats.coins++;
                  
                  this.score += 500;
                  this.runSpeed += 50;
                  ent.destroy();
                  this.entities.splice(i, 1);
              }
          }
      }
  }
}
