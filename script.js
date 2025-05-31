import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";
import Hls from "hls.js";

const w = window.innerWidth;
const h = window.innerHeight;

// Create Scene
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0, 0, 1);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
// Rotate camera 90° right (towards +X)
const lookTarget = new THREE.Vector3().copy(camera.position).add(new THREE.Vector3(1, 0, 0));
camera.lookAt(lookTarget);

// Ensure OrbitControls target is updated too
controls.target.copy(lookTarget); // <-- important

controls.enableZoom = true;
controls.enablePan = true;
controls.rotateSpeed = -1;

controls.update();


// Create single video element
const video = document.createElement("video");
video.crossOrigin = "anonymous";
video.muted = true;
video.playsInline = true;
video.loop = true;

// Create HLS instance and load the video
const hls = new Hls();
hls.loadSource("hls/single/master.m3u8"); // <== update this path to your single video stream
hls.attachMedia(video);



hls.on(Hls.Events.MANIFEST_PARSED, () => {
  video.play().catch((e) => console.error("Playback error:", e));
});

hls.on(Hls.Events.LEVEL_SWITCHED, (e, data) => {
  const level = hls.levels[data.level];
  console.log(`Switched to level ${data.level} → ${level.width}x${level.height}, bitrate: ${Math.round(level.bitrate / 1000)} kbps`);
});

// hls.on(Hls.Events.FRAG_LOADED, (e, data) => {
setInterval(()=>{
  console.log(`Bandwidth estimate: ${Math.round(hls.bandwidthEstimate / 1000)} kbps`);
}, 5000);
// });


// Create texture and mesh
const texture = new THREE.VideoTexture(video);
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.encoding = THREE.sRGBEncoding;

const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.BackSide
});

const geometry = new THREE.SphereGeometry(20, 32, 32);
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// --- Trace Camera ---
let traceData = [];
let traceIndex = 0;
let tracePlaybackStart = null;

// Load CSV
function loadTraceCSV(url) {
  fetch(url)
    .then(res => res.text())
    .then(data => {
      const lines = data.trim().split("\n").slice(1); // skip header
      traceData = lines.map(line => {
        const [time, x, y, z] = line.split(",").map(Number);
        return { time, dir: new THREE.Vector3(x, y, z).normalize() };
      });
      tracePlaybackStart = performance.now();
    });
}

// Call Load CSV
loadTraceCSV("csvs/trace-2.csv");

// Update camera orientation from trace data
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
    camera.updateMatrixWorld(); // update matrices for rendering
  }
}

// Render loop
function animate() {
  requestAnimationFrame(animate);
  updateCameraFromTrace();
  controls.update();
  renderer.render(scene, camera);
}
animate();




// Bitrate of Bandwidth

function getTotalVideoBandwidth(videoUrl) {
  const entries = performance.getEntriesByType("resource");
  const videoEntries = entries.filter(e => e.name.includes(videoUrl));

  let totalBytes = 0;
  videoEntries.forEach(e => {
    totalBytes += e.transferSize; // includes headers + body
  });

  return {
    totalBytes,
    totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
  };
}

// Call periodically (e.g., every 5 seconds)
setInterval(() => {
  const usage = getTotalVideoBandwidth("hls/single/"); // update with your stream prefix
  console.log("Video data downloaded (MB):", usage.totalMB);
}, 5000);

