import * as THREE from 'https://esm.sh/three@0.164.1';

let scene, camera, renderer;
let cursorMesh;
let activeLine = null;
let currentPoints = [];
let sceneObjects = [];

let arWorldGroup = new THREE.Group();
let arEnabled = false;
let baselineBeta = 0, baselineGamma = 0;
let smoothBeta = 0, smoothGamma = 0;
// Ultra-low smoothing to prevent drift (0.03 is very sticky/stable)
const GYRO_SMOOTHING = 0.03;

export function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.z = 2;
    scene.add(arWorldGroup);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.id = 'three-canvas';
    document.body.appendChild(renderer.domElement);

    const geo = new THREE.SphereGeometry(0.015, 16, 16);
    cursorMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x00ffff }));
    scene.add(cursorMesh);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    animate();
}

function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }

export function screenTo3D(x, y) {
    const vec = new THREE.Vector3((x * 2) - 1, -(y * 2) + 1, 0.5);
    vec.unproject(camera); const dir = vec.sub(camera.position).normalize();
    return camera.position.clone().add(dir.multiplyScalar(-camera.position.z / dir.z));
}

export function updateCursor(pos3D) { if(cursorMesh) cursorMesh.position.copy(pos3D); }
export function setCursorColor(hex) { if(cursorMesh) cursorMesh.material.color.setHex(hex); }

export function startDrawing(pos) {
    // THE CRITICAL FIX: Convert World Space to AR Local Space
    let localPos = pos.clone();
    if (arEnabled) arWorldGroup.worldToLocal(localPos);
    currentPoints = [localPos];
}

export function continueDrawing(pos) {
    if (activeLine) getActiveGroup().remove(activeLine);

    // THE CRITICAL FIX: Convert World Space to AR Local Space
    let localPos = pos.clone();
    if (arEnabled) arWorldGroup.worldToLocal(localPos);
    currentPoints.push(localPos);

    const geo = new THREE.BufferGeometry().setFromPoints(currentPoints);
    const mat = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
    activeLine = new THREE.Line(geo, mat);
    getActiveGroup().add(activeLine);
}

function getActiveGroup() { return arEnabled ? arWorldGroup : scene; }
function getCenter(pts) { const c = new THREE.Vector3(); pts.forEach(p => c.add(p)); return c.divideScalar(pts.length); }

function processShape(points) {
    if (points.length < 3) return { type: 'line', points: [points[0], points[points.length-1]] };
    const start = points[0], end = points[points.length-1], closeDist = start.distanceTo(end);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => { if(p.x<minX) minX=p.x; if(p.x>maxX) maxX=p.x; if(p.y<minY) minY=p.y; if(p.y>maxY) maxY=p.y; });
    const w = maxX - minX, h = maxY - minY, a = w * h;
    let tL = 0; for(let i=1; i<points.length; i++) tL += points[i].distanceTo(points[i-1]);
    if (tL <= start.distanceTo(end) * 1.3) return { type: 'line', points: [start, end] };
    const mD = Math.max(w, h), nd = Math.min(w, h), r = mD / 2;
    if (closeDist < r * 0.8 && (nd / mD) > 0.5 && points.length > 12) {
        const c = getCenter(points); let cp = [];
        for(let i=0; i<=36; i++) { const a = (i / 36) * Math.PI * 2; cp.push(new THREE.Vector3(c.x + Math.cos(a)*r, c.y + Math.sin(a)*r, c.z)); }
        return { type: 'circle', points: cp };
    }
    if (closeDist < mD * 0.8 && a > 0.01) {
        const z = points[0].z;
        return { type: 'square', points: [new THREE.Vector3(minX,minY,z), new THREE.Vector3(maxX,minY,z), new THREE.Vector3(maxX,maxY,z), new THREE.Vector3(minX,maxY,z), new THREE.Vector3(minX,minY,z)], width: w, height: h };
    }
    return { type: 'line', points: [start, end] };
}

export function finishLine() {
    const g = getActiveGroup(); if (activeLine) g.remove(activeLine); activeLine = null;
    if (currentPoints.length > 1) {
        const s = processShape(currentPoints);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(s.points), new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 }));
        g.add(line);
        sceneObjects.push({ line, mesh: null, type: s.type, points: s.points, center: getCenter(s.points), width: s.width || 0, height: s.height || 0 });
    }
    currentPoints = [];
}

// --- STABILIZED GYROSCOPE ANCHORING ---
export function enableAR() {
    arEnabled = true;
    // Lock the baseline to the CURRENT smoothed values the millisecond AR is turned on
    baselineBeta = smoothBeta; baselineGamma = smoothGamma;
    sceneObjects.forEach(obj => { if(obj.line && obj.line.parent === scene) arWorldGroup.attach(obj.line); if(obj.mesh && obj.mesh.parent === scene) arWorldGroup.attach(obj.mesh); });
}

export function disableAR() {
    arEnabled = false; arWorldGroup.rotation.set(0,0,0);
    sceneObjects.forEach(obj => { if(obj.line && obj.line.parent === arWorldGroup) scene.attach(obj.line); if(obj.mesh && obj.mesh.parent === arWorldGroup) scene.attach(obj.mesh); });
}

export function updateGyroscope(beta, gamma) {
    // Ignore Alpha (compass) completely - it causes massive drift on phones
    // Heavily smooth Beta (front/back) and Gamma (left/right)
    smoothBeta += (beta - smoothBeta) * GYRO_SMOOTHING;
    smoothGamma += (gamma - smoothGamma) * GYRO_SMOOTHING;

    if (arEnabled) {
        // Apply counter-rotation so the group stays frozen in space
        arWorldGroup.rotation.x = THREE.MathUtils.degToRad(baselineBeta - smoothBeta);
        arWorldGroup.rotation.y = THREE.MathUtils.degToRad(baselineGamma - smoothGamma);
    }
}

// --- INTERACTIONS ---
export function getSceneObjects2D() {
    return sceneObjects.map(obj => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for(let i=0; i<obj.points.length; i++) {
            const wp = new THREE.Vector3();
            if (obj.line.parent === arWorldGroup) arWorldGroup.localToWorld(wp.copy(obj.points[i]));
            else wp.copy(obj.points[i]);
            const c2d = wp.project(camera);
            const sx = (c2d.x + 1) / 2, sy = (-c2d.y + 1) / 2;
            if(sx < minX) minX = sx; if(sx > maxX) maxX = sx;
            if(sy < minY) minY = sy; if(sy > maxY) maxY = sy;
        }
        return { id: obj, minX, minY, maxX, maxY, center: obj.center };
    });
}

export function highlightObject(obj, isHover) {
    if (!obj) return; const c = isHover ? 0xffff00 : 0x00ffff;
    if (obj.line) obj.line.material.color.setHex(c);
    if (obj.mesh) {
        obj.mesh.material.color.setHex(isHover ? 0x555500 : 0x005555);
        if(obj.mesh.children[0]) obj.mesh.children[0].material.color.setHex(c);
    }
}

export function moveObject(obj, pos3D) {
    if (!obj) return; const tg = arEnabled ? arWorldGroup : scene;
    const lp = tg.worldToLocal(pos3D.clone()); const d = lp.sub(obj.center);
    obj.center.add(d); if (obj.line) obj.line.position.add(d); if (obj.mesh) obj.mesh.position.add(d);
}

export function extrudeObject(obj, depth) {
    if (!obj || obj.type === 'line' || obj.mesh) return false; let g;
    if (obj.type === 'square') { g = new THREE.BoxGeometry(obj.width, obj.height, depth); g.translate(0, 0, depth / 2); }
    else if (obj.type === 'circle') { const r = obj.points[0].distanceTo(obj.center); g = new THREE.CylinderGeometry(r, r, depth, 32); g.rotateX(Math.PI / 2); g.translate(0, 0, depth / 2); }
    else return false;
    
    // CAD UPGRADE: Transparent inner mesh + Glowing Wireframe edges
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x005555, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
    const edges = new THREE.EdgesGeometry(g);
    const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
    m.add(wireframe);
    
    m.position.copy(obj.center); getActiveGroup().add(m); obj.mesh = m; return true;
}
