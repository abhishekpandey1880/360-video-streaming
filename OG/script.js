import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";

// Scene setup
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0, 0, 0.01);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -5);
controls.update();

// QREA variables
let qualitySwitches = 0;
let lastQualities = ["low"];
let QREA_logs = [];
let lastQmatch = 1;
let lastLatency = 100;
let lastBuse = 0.5;

const thresholdOne = 0.5;
const thresholdTwo = 0.1;

// Trace CSV
let traceData = [];
let traceIndex = 0;
let tracePlaybackStart = null;

function loadTraceCSV(url) {
  fetch(url)
    .then(res => res.text())
    .then(data => {
      const lines = data.trim().split("\n").slice(1);
      traceData = lines.map(line => {
        const [time, x, y, z] = line.split(",").map(Number);
        console.log("csv read done");
        return { time, dir: new THREE.Vector3(x, y, z).normalize() };
      });
      tracePlaybackStart = performance.now();
    });
}

loadTraceCSV("/csvs/trace-2.csv");

function updateCameraFromTrace() {
  if (!tracePlaybackStart || traceIndex >= traceData.length) return;
  const currentTime = (performance.now() - tracePlaybackStart) / 1000;
  while (
    traceIndex + 1 < traceData.length &&
    traceData[traceIndex + 1].time <= currentTime
  ) {
    traceIndex++;
  }
  const lookDir = traceData[traceIndex]?.dir;
  if (lookDir) {
    const target = new THREE.Vector3().copy(camera.position).add(lookDir);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }
}

// Video sources
const pathHigh = "360-videos/roller-coaster/OG-roller-coaster-flip.mp4";
const pathMid = "360-videos/roller-coaster/OG-roller-coaster-flip.mp4";
const pathLow = "360-videos/roller-coaster/OG-roller-coaster-flip.mp4";

const highVid = document.createElement("video");
const midVid = document.createElement("video");
const lowVid = document.createElement("video");
[highVid, midVid, lowVid].forEach(v => {
  v.crossOrigin = "anonymous";
  v.loop = true;
  v.muted = true;
  v.playbackRate = 1;
});
highVid.src = pathHigh;
midVid.src = pathMid;
lowVid.src = pathLow;

const highTex = new THREE.VideoTexture(highVid);
const midTex = new THREE.VideoTexture(midVid);
const lowTex = new THREE.VideoTexture(lowVid);
[highTex, midTex, lowTex].forEach(tex => {
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.encoding = THREE.sRGBEncoding;
});

const material = new THREE.MeshBasicMaterial({ map: lowTex, side: THREE.BackSide });
const sphereGeo = new THREE.SphereGeometry(20, 64, 64);
const sphereMesh = new THREE.Mesh(sphereGeo, material);
sphereMesh.userData = { textures: { high: highTex, mid: midTex, low: lowTex } };
scene.add(sphereMesh);

function getCameraDirection() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir;
}

function getCurrentQuality() {
  const map = sphereMesh.material.map;
  const { high, mid } = sphereMesh.userData.textures;
  if (map === high) return "high";
  if (map === mid) return "mid";
  return "low";
}

setInterval(() => {
  const camDir = getCameraDirection();
  const sphereDir = new THREE.Vector3(0, 0, 1).normalize();
  const dot = camDir.dot(sphereDir);

  let desired;
  if (dot >= thresholdOne) desired = "high";
  else if (dot >= thresholdTwo) desired = "mid";
  else desired = "low";

  const currQual = getCurrentQuality();
  if (currQual !== desired) {
    sphereMesh.material.map = sphereMesh.userData.textures[desired];
    sphereMesh.material.needsUpdate = true;
    qualitySwitches++;
    lastQualities[0] = desired;
  }

  lastQmatch = (currQual === desired) ? 1 : 0;
  const bitrate = { high: 1000, mid: 600, low: 200 };
  const totalBW = bitrate[currQual];
  lastBuse = totalBW / totalBW;
}, 1000);

setInterval(() => {
  const w1 = 0.4, w2 = 0.2, w3 = 0.3, w4 = 0.1;
  const rlat = 1 - Math.min(lastLatency, 300) / 300;
  const qstab = 1 - Math.min(qualitySwitches / 10, 1);
  const QREA = w1 * lastQmatch + w3 * lastBuse + w2 * rlat + w4 * qstab;

  QREA_logs.push({
    time: QREA_logs.length * 5,
    q: lastQmatch,
    r: rlat,
    b: lastBuse,
    s: qstab,
    qrea: QREA
  });
  console.log(`QREA: ${QREA.toFixed(3)}`);

  qualitySwitches = 0;
}, 5000);

function exportQREALog() {
  const header = "Time,Qmatch,Rlatency,Buse,Qstability,QREA\n";
  const rows = QREA_logs.map(log =>
    `${log.time},${log.q.toFixed(3)},${log.r.toFixed(3)},${log.b.toFixed(3)},${log.s.toFixed(3)},${log.qrea.toFixed(3)}`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "QREA_log.csv";
  a.click();
}

window.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "d") {
    exportQREALog();
    console.log("QREA log download triggered.");
  }
});

let loaded = 0;
[highVid, midVid, lowVid].forEach(v => {
  v.addEventListener("loadeddata", () => {
    loaded++;
    if (loaded === 3) {
      [highVid, midVid, lowVid].forEach(vid => { vid.currentTime = 0; vid.play().catch(() => { }); });
    }
  });
});

function animate() {
  requestAnimationFrame(animate);
  updateCameraFromTrace();
  controls.update();
  renderer.render(scene, camera);
}
animate();