import * as THREE from 'https://esm.sh/three@0.164.1';

let scene, camera, perspectiveCam, orthoCam, renderer;
let cursorMesh, gridHelper;
let activeLine = null;
let currentPoints = [];
let sceneObjects = [];

let isOrtho = false;
let snapEnabled = true;
const GRID_SIZE = 0.1;

export function initThree() {
    scene = new THREE.Scene();
    
    // Setup Both Cameras
    const aspect = window.innerWidth / window.innerHeight;
    perspectiveCam = new THREE.PerspectiveCamera(70, aspect, 0.01, 100);
    const frustumSize = 2;
    orthoCam = new THREE.OrthographicCamera(-frustumSize * aspect / 2, frustumSize * aspect / 2, frustumSize / 2, -frustumSize / 2, 0.01, 100);
    camera = perspectiveCam;
    camera.position.z = 2;

    // CAD Grid Floor
    gridHelper = new THREE.GridHelper(10, 50, 0x444444, 0x222222);
    gridHelper.rotation.x = Math.PI / 2; // Align to XY plane
    scene.add(gridHelper);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.id = 'three-canvas';
    document.body.appendChild(renderer.domElement);

    const geo = new THREE.SphereGeometry(0.015, 16, 16);
    cursorMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
    scene.add(cursorMesh);

    window.addEventListener('resize', onResize);
    animate();
}

function onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    perspectiveCam.aspect = aspect;
    perspectiveCam.updateProjectionMatrix();
    orthoCam.left = -2 * aspect / 2; orthoCam.right = 2 * aspect / 2;
    orthoCam.top = 2 / 2; orthoCam.bottom = -2 / 2;
    orthoCam.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }

export function toggleOrthographic() {
    isOrtho = !isOrtho;
    camera = isOrtho ? orthoCam : perspectiveCam;
    camera.position.z = 2;
    camera.lookAt(0,0,0);
    document.getElementById('btn-ortho').classList.toggle('active', isOrtho);
}

export function toggleSnap() {
    snapEnabled = !snapEnabled;
    document.getElementById('btn-snap').classList.toggle('active', snapEnabled);
}

// Snapping Math: Locks to grid and auto-straightens lines
function applySnapping(pos) {
    if (!snapEnabled) return pos;
    let snapped = pos.clone();
    snapped.x = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
    snapped.y = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
    
    // Straight line snapping (if drawing)
    if (currentPoints.length > 0) {
        const start = currentPoints[0];
        const dx = snapped.x - start.x;
        const dy = snapped.y - start.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // If close to horizontal or vertical, force align
        if (Math.abs(angle) < 15 || Math.abs(angle) > 165) snapped.y = start.y;
        else if (Math.abs(angle - 90) < 15 || Math.abs(angle + 90) < 15) snapped.x = start.x;
    }
    return snapped;
}

export function screenTo3D(x, y) {
    const vec = new THREE.Vector3((x * 2) - 1, -(y * 2) + 1, 0.5);
    vec.unproject(camera); const dir = vec.sub(camera.position).normalize();
    const pos3D = camera.position.clone().add(dir.multiplyScalar(-camera.position.z / dir.z));
    return applySnapping(pos3D); // Apply grid snapping globally
}

export function updateCursor(pos3D) { if(cursorMesh) cursorMesh.position.copy(pos3D); }
export function setCursorColor(hex) { if(cursorMesh) cursorMesh.material.color.setHex(hex); }

export function startDrawing(pos) { currentPoints = [pos.clone()]; }

export function continueDrawing(pos) {
    if (activeLine) scene.remove(activeLine);
    currentPoints.push(pos.clone());
    const geo = new THREE.BufferGeometry().setFromPoints(currentPoints);
    const mat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, linewidth: 2 });
    activeLine = new THREE.Line(geo, mat);
    scene.add(activeLine);
}

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
    if (activeLine) scene.remove(activeLine); activeLine = null;
    if (currentPoints.length > 1) {
        const s = processShape(currentPoints);
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(s.points), new THREE.LineBasicMaterial({ color: 0xAAAAAA, linewidth: 2 }));
        scene.add(line);
        sceneObjects.push({ line, mesh: null, type: s.type, points: s.points, center: getCenter(s.points), width: s.width || 0, height: s.height || 0 });
    }
    currentPoints = [];
}

export function undo() {
    if (sceneObjects.length === 0) return;
    const obj = sceneObjects.pop();
    if (obj.line) scene.remove(obj.line);
    if (obj.mesh) scene.remove(obj.mesh);
}

export function clearAll() {
    sceneObjects.forEach(obj => { if(obj.line) scene.remove(obj.line); if(obj.mesh) scene.remove(obj.mesh); });
    sceneObjects = [];
}

export function getSceneObjects2D() {
    return sceneObjects.map(obj => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for(let i=0; i<obj.points.length; i++) {
            const wp = obj.points[i].clone();
            const c2d = wp.project(camera);
            const sx = (c2d.x + 1) / 2, sy = (-c2d.y + 1) / 2;
            if(sx < minX) minX = sx; if(sx > maxX) maxX = sx;
            if(sy < minY) minY = sy; if(sy > maxY) maxY = sy;
        }
        return { id: obj, minX, minY, maxX, maxY, center: obj.center };
    });
}

export function highlightObject(obj, isHover) {
    if (!obj) return; 
    const c = isHover ? 0xFFFFFF : 0xAAAAAA;
    if (obj.line) obj.line.material.color.setHex(c);
    if (obj.mesh) {
        obj.mesh.material.color.setHex(isHover ? 0x555555 : 0x222222);
        if(obj.mesh.children[0]) obj.mesh.children[0].material.color.setHex(c);
    }
}

export function moveObject(obj, pos3D) {
    if (!obj) return; 
    const d = pos3D.clone().sub(obj.center);
    obj.center.add(d); 
    if (obj.line) obj.line.position.add(d); 
    if (obj.mesh) obj.mesh.position.add(d);
}

export function extrudeObject(obj, depth) {
    if (!obj || obj.type === 'line' || obj.mesh) return false; let g;
    if (obj.type === 'square') { g = new THREE.BoxGeometry(obj.width, obj.height, depth); g.translate(0, 0, depth / 2); }
    else if (obj.type === 'circle') { const r = obj.points[0].distanceTo(obj.center); g = new THREE.CylinderGeometry(r, r, depth, 32); g.rotateX(Math.PI / 2); g.translate(0, 0, depth / 2); }
    else return false;
    
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
    const edges = new THREE.EdgesGeometry(g);
    const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xFFFFFF }));
    m.add(wireframe);
    
    m.position.copy(obj.center); scene.add(m); obj.mesh = m; return true;
}

// PRO FEATURE: Export everything to standard 3D .OBJ format
export function exportOBJ() {
    let objStr = "# Exported from Air-Touch CAD\n";
    let vCount = 1;
    
    sceneObjects.forEach(item => {
        if (item.mesh) {
            const geo = item.mesh.geometry;
            const pos = geo.attributes.position;
            item.mesh.updateMatrixWorld();
            const temp = new THREE.Vector3();
            for(let i=0; i<pos.count; i++) {
                temp.fromBufferAttribute(pos, i).applyMatrix4(item.mesh.matrixWorld);
                objStr += `v ${temp.x.toFixed(4)} ${temp.y.toFixed(4)} ${temp.z.toFixed(4)}\n`;
            }
            if (geo.index) {
               const idx = geo.index.array;
               for(let i=0; i<idx.length; i+=3) {
                   objStr += `f ${vCount+idx[i]} ${vCount+idx[i+1]} ${vCount+idx[i+2]}\n`;
               }
            }
            vCount += pos.count;
        } else if (item.line) {
            const pos = item.line.geometry.attributes.position;
            item.line.updateMatrixWorld();
            const temp = new THREE.Vector3();
            let indices = [];
            for(let i=0; i<pos.count; i++) {
                temp.fromBufferAttribute(pos, i).applyMatrix4(item.line.matrixWorld);
                objStr += `v ${temp.x.toFixed(4)} ${temp.y.toFixed(4)} ${temp.z.toFixed(4)}\n`;
                indices.push(vCount + i);
            }
            for(let i=1; i<indices.length; i++) {
                objStr += `l ${indices[i-1]} ${indices[i]}\n`;
            }
            vCount += pos.count;
        }
    });
    
    const blob = new Blob([objStr], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'air-touch-cad.obj';
    link.click();
    URL.revokeObjectURL(link.href);
}
