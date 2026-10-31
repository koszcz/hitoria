// Draws the game with three.js. This file owns the camera and the per-frame loop; each part of
// the picture lives in its own file in this folder.
import * as THREE from 'three';
import { Game, Building, Settler, Good, GOODS } from '../game';
import { World } from '../world';
import { TW, toIso, fromIso } from '../iso';
import type { P } from '../path';
import { ART } from '../art';
import { Model, iconY, makeBuilding, makeFlag, noRoadSign } from './buildings';
import { CARRY_Y, Person, makePerson } from './people';
import { Terrain } from './terrain';
import { Scenery } from './scenery';
import { Goods } from './goods';
import { Animals } from './animals';
import { drawRoads } from './roads';
import { Overlays, View } from './overlays';
import { disposeModel } from './merge';
import { GRAPHICS, type Graphics } from '../quality/levels';
import { clock, daylightAt } from './daylight';

export type { View } from './overlays';

// World tile (x, y) maps to the 3D ground at (X = x, Z = y); Y is up. One tile is one unit.
// The camera keeps the old 2:1 isometric angle (45° around, 30° down), so `cam` still pans in
// the same screen-pixel space as the 2D renderer did.

const PX = TW / Math.SQRT2; // screen pixels per world unit at zoom 1
const ELEV = Math.PI / 6;
const VIEW_DIR = new THREE.Vector3(Math.cos(ELEV) / Math.SQRT2, Math.sin(ELEV), Math.cos(ELEV) / Math.SQRT2);

export class Renderer {
  cam = { x: 0, y: 0, zoom: 1.3 };
  w = 0;
  h = 0;

  private gl: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  private sun = new THREE.DirectionalLight(ART.sun, ART.sunPower);
  private hemi = new THREE.HemisphereLight(ART.hemiSky, ART.hemiGround, ART.hemi);
  private sunDir = new THREE.Vector3(-0.9, 1.3, 0.35).normalize();
  private ray = new THREE.Raycaster();

  private world: World | null = null;
  private terrKey = -1;
  private ground: Terrain;
  private scenery: Scenery;
  private goods: Goods;
  private animals: Animals;
  private overlays: Overlays;

  private roads = new THREE.Group();
  private roadNet = -1;
  private wornKey = -1; // game.worn when the ground was last painted
  private models = new Map<number, Model>();
  private flags = new Map<number, Model>();
  private people = new Map<number, Person>();
  private graphics: Graphics = GRAPHICS.high;

  constructor(public canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.gl.toneMapping = THREE.NeutralToneMapping;
    this.gl.toneMappingExposure = ART.exposure;
    this.resize();
    addEventListener('resize', () => this.resize());

    const { scene, sun } = this;
    scene.background = new THREE.Color(ART.sky);
    scene.add(this.hemi);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);

    this.ground = new Terrain(scene);
    this.scenery = new Scenery(scene, this.ground);
    this.goods = new Goods(scene);
    this.animals = new Animals(scene, this.ground);
    scene.add(this.roads);
    this.overlays = new Overlays(scene, this.ground);
    this.setGraphics(this.graphics);
  }

  // Changes how sharp the picture is and how shadows are drawn. Safe to call while playing.
  setGraphics(g: Graphics) {
    const shadowsBefore = this.gl.shadowMap.enabled && this.gl.shadowMap.type;
    this.graphics = g;
    const { gl, sun } = this;
    gl.shadowMap.enabled = sun.castShadow = g.shadows !== 'off';
    gl.shadowMap.type = g.shadows === 'soft' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (sun.shadow.mapSize.x !== g.shadowSize) {
      sun.shadow.mapSize.set(g.shadowSize, g.shadowSize);
      sun.shadow.map?.dispose();
      sun.shadow.map = null; // three makes a new one at the new size
    }
    // Shaders are built for one kind of shadow, so they must be built again.
    if (shadowsBefore !== (gl.shadowMap.enabled && gl.shadowMap.type))
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m) for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true;
      });
    this.resize();
  }

  // Draw calls and triangles in the last frame, shadows included. Shown with F3.
  stats() {
    const { calls, triangles } = this.gl.info.render;
    return { calls, triangles, pixelRatio: this.gl.getPixelRatio() };
  }

  resize() {
    this.w = innerWidth;
    this.h = innerHeight;
    this.gl.setPixelRatio(Math.min(this.graphics?.maxPixelRatio ?? 2, devicePixelRatio || 1)); // phones go to 3, which costs a lot of speed
    this.gl.setSize(this.w, this.h, false);
  }

  // Ground point under a screen pixel, in tile coordinates.
  toWorld(px: number, py: number) {
    this.ray.setFromCamera(new THREE.Vector2((px / this.w) * 2 - 1, -(py / this.h) * 2 + 1), this.camera);
    const hit = this.ground.mesh && this.ray.intersectObject(this.ground.mesh, false)[0];
    if (hit) return { x: hit.point.x, y: hit.point.z };
    const p = new THREE.Vector3();
    this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p);
    return { x: p.x, y: p.z };
  }

  screenToTile(px: number, py: number): P {
    const p = this.toWorld(px, py);
    return { x: Math.floor(p.x), y: Math.floor(p.y) };
  }

  centerOn(x: number, y: number) {
    const p = toIso(x + 0.5, y + 0.5);
    this.cam.x = p.x;
    this.cam.y = p.y;
  }

  // Height of the ground at a point in tile coordinates.
  heightAt(x: number, y: number) {
    return this.ground.heightAt(x, y);
  }

  draw(game: Game, view: View, now: number) {
    if (game.world !== this.world) this.setWorld(game.world);
    this.light(game.time);
    this.placeCamera();

    let tk = 0;
    const terr = game.world.territory;
    for (let i = 0; i < terr.length; i++) if (terr[i]) tk += i;
    if (tk !== this.terrKey) {
      this.terrKey = tk;
      this.wornKey = game.worn;
      this.ground.paint(game.wear);
      this.ground.drawBorder();
    } else if (game.worn !== this.wornKey) {
      this.wornKey = game.worn;
      this.ground.paint(game.wear);
    }
    if (game.net !== this.roadNet) {
      this.roadNet = game.net;
      drawRoads(this.roads, game, this.ground);
    }

    this.goods.start();
    this.scenery.draw(game.world, game.wear, now);
    this.buildings(game, now);
    this.flagsAndGoods(game, now);
    this.settlers(game, now);
    this.animals.draw(game, now);
    this.overlays.draw(game, view);
    this.goods.finish();

    this.ground.animate(now);
    this.gl.render(this.scene, this.camera);
  }

  // --- camera --------------------------------------------------------------

  private placeCamera() {
    const { camera, cam, sun } = this;
    const s = PX * cam.zoom;
    const hw = this.w / 2 / s, hh = this.h / 2 / s;
    Object.assign(camera, { left: -hw, right: hw, top: hh, bottom: -hh });
    camera.updateProjectionMatrix();
    const t = fromIso(cam.x, cam.y);
    const target = new THREE.Vector3(t.x, 0, t.y);
    camera.position.copy(target).addScaledVector(VIEW_DIR, 150);
    camera.lookAt(target);

    // The shadow camera covers the view. The time of day turns the sun around it.
    const reach = Math.min(42, Math.max(hw, hh * 2) + 3);
    sun.position.copy(target).addScaledVector(this.sunDir, reach * 1.6);
    sun.target.position.copy(target);
    const sc = sun.shadow.camera;
    Object.assign(sc, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.1, far: reach * 4 });
    sc.updateProjectionMatrix();
  }

  // Sets the sun, sky and background for the time of day.
  private light(time: number) {
    const l = daylightAt(clock(time));
    this.sun.color.copy(l.sun);
    this.sun.intensity = l.sunPower;
    this.hemi.color.copy(l.hemiSky);
    this.hemi.groundColor.copy(l.hemiGround);
    this.hemi.intensity = l.hemi;
    (this.scene.background as THREE.Color).copy(l.sky);
    this.sunDir.copy(l.dir);
  }

  private setWorld(world: World) {
    this.world = world;
    this.terrKey = -1;
    this.roadNet = -1;
    for (const m of [...this.models.values(), ...this.flags.values()]) this.drop(m.g);
    for (const p of this.people.values()) this.drop(p.g);
    this.models.clear();
    this.flags.clear();
    this.people.clear();
    this.animals.clear();
    this.ground.build(world);
  }

  private drop(g: THREE.Object3D) {
    this.scene.remove(g);
    disposeModel(g);
  }

  // --- buildings -----------------------------------------------------------

  private buildings(game: Game, now: number) {
    const seen = new Set<number>();
    for (const b of game.buildings.values()) {
      seen.add(b.id);
      const key = `${b.type}:${b.built}`;
      let m = this.models.get(b.id);
      if (!m || m.key !== key) {
        if (m) this.drop(m.g);
        m = makeBuilding(b.type, b.built);
        if (b.type !== 'hq') m.g.add((m.noRoad = noRoadSign()));
        m.g.position.set(b.x + 0.5, this.heightAt(b.x + 0.5, b.y + 0.5), b.y + 0.5);
        this.models.set(b.id, m);
        this.scene.add(m.g);
      }
      if (m.noRoad) {
        m.noRoad.visible = !game.linked(b);
        m.noRoad.position.y = (b.built ? iconY(b.type) + 0.42 : 1.4) + Math.sin(now * 4) * 0.04;
      }
      this.animateBuilding(b, m, now);
    }
    for (const [id, m] of this.models)
      if (!seen.has(id)) {
        this.drop(m.g);
        this.models.delete(id);
      }
  }

  private animateBuilding(b: Building, m: Model, now: number) {
    const base = m.g.position;
    if (m.rise) {
      m.rise.scale.y = Math.max(0.001, 0.55 * b.progress);
      m.bar!.scale.set(0.6 * b.progress, 0.07, 1);
      let k = 0;
      for (const g of ['plank', 'stone'] as Good[])
        for (let i = 0; i < b.stock[g]; i++, k++) this.goods.put(g, base.x - 0.3 + (k % 3) * 0.2, base.y + 0.04 + Math.floor(k / 3) * 0.06, base.z + 0.52, 0);
      return;
    }
    if (m.cloth) m.cloth.rotation.y = Math.sin(now * 3) * 0.35;
    if (m.icon) m.icon.position.y = iconY(b.type) + Math.sin(now * 2 + b.id) * 0.03;
    if (m.sails && b.busy) m.sails.rotation.z = -now * 1.6;
    if (m.spin && b.busy) m.spin.rotation.z = -now * 14;
    const c = m.chimney;
    m.smoke!.forEach((s, i) => {
      s.visible = b.busy && !!c;
      if (!s.visible) return;
      const t = (now * 0.5 + i / 3) % 1;
      s.position.set(c!.x + Math.sin(t * 6) * 0.05 + t * 0.12, c!.y + t * 0.7, c!.z);
      s.scale.setScalar(0.12 + t * 0.25);
      (s.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - t);
    });
    let k = 0;
    for (const g of GOODS)
      for (let i = 0; i < b.out[g]; i++, k++) this.goods.put(g, base.x + 0.5, base.y + 0.04 + Math.floor(k / 2) * 0.06, base.z + 0.12 - (k % 2) * 0.24, Math.PI / 2);
  }

  // --- flags and settlers --------------------------------------------------

  private flagsAndGoods(game: Game, now: number) {
    const seen = new Set<number>();
    for (const f of game.flags.values()) {
      seen.add(f.id);
      let m = this.flags.get(f.id);
      if (!m) {
        m = makeFlag();
        m.g.position.set(f.x + 0.5, this.heightAt(f.x + 0.5, f.y + 0.5), f.y + 0.5);
        this.flags.set(f.id, m);
        this.scene.add(m.g);
      }
      m.cloth!.rotation.y = Math.sin(now * 4 + f.x) * 0.4;
    }
    for (const [id, m] of this.flags)
      if (!seen.has(id)) {
        this.drop(m.g);
        this.flags.delete(id);
      }
  }

  private settlers(game: Game, now: number) {
    const seen = new Set<number>();
    for (const s of game.settlers.values()) {
      if (s.inside) continue;
      seen.add(s.id);
      let p = this.people.get(s.id);
      if (!p) {
        p = makePerson(s.role);
        this.people.set(s.id, p);
        this.scene.add(p.g);
      }
      this.pose(s, p, now);
    }
    for (const [id, p] of this.people)
      if (!seen.has(id)) {
        this.drop(p.g);
        this.people.delete(id);
      }
  }

  private pose(s: Settler, p: Person, now: number) {
    const x = s.x + 0.5, z = s.y + 0.5;
    const dx = x - p.px, dz = z - p.py;
    if (Math.hypot(dx, dz) > 1e-4 && Math.hypot(dx, dz) < 1) {
      const want = Math.atan2(dx, dz);
      let d = want - p.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      p.heading += d * 0.3;
    }
    p.px = x;
    p.py = z;
    const ph = now * 11 + s.id;
    const y = this.heightAt(x, z);
    p.g.position.set(x, y + (s.walking ? Math.abs(Math.sin(ph)) * 0.02 : 0), z);
    p.g.rotation.y = p.heading;
    const swing = s.walking ? Math.sin(ph) * 0.6 : 0;
    p.legs[0].rotation.x = swing;
    p.legs[1].rotation.x = -swing;
    // Arms swing against the legs, hold a load up on the head, or swing the tool.
    const [armL, armR] = p.arms;
    armL.rotation.x = s.carrying ? -2.7 : -swing * 0.8;
    armR.rotation.x = s.carrying ? -2.7 : swing * 0.8;
    p.tool.visible = !!s.anim;
    if (s.anim) armR.rotation.x = s.anim === 'plant' ? -0.5 + Math.sin(now * 6) * 0.35
      : s.anim === 'fish' ? -1.2 + Math.sin(now * 1.5) * 0.08
      : s.anim === 'reap' ? -0.6 + Math.sin(now * 6) * 0.7
      : -1.2 + Math.sin(now * 9) * 0.9;
    if (s.carrying) this.goods.put(s.carrying, x, y + CARRY_Y, z, p.heading + Math.PI / 2);
  }
}
