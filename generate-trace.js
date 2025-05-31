import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";
import Hls from "hls.js";

const w = window.innerWidth;
const h = window.innerHeight;

// Added for video sync
let globalTime = 0;

// Initialize Three.js scene
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0, 0, 5);
// camera.position.z = 5;


// Added to generate trace log
const traceLog = [];

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
// renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -5);  // Point the camera to look forward
controls.update();
// controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = true;
controls.rotateSpeed = -1;

const videos = [];


// Create HLS Tiles
function createHLSTile(index, phiStart, phiLength, thetaStart, thetaLength) {
  const vid = document.createElement("video");
  vid.crossOrigin = "anonymous";
  vid.muted = true;
  vid.playsInline = true;
  vid.loop = true;  // Optional
  videos.push(vid);

  const texture = new THREE.VideoTexture(vid);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.encoding = THREE.sRGBEncoding;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide
  });

  const geom = new THREE.SphereGeometry(20, 32, 32, phiStart, phiLength, thetaStart, thetaLength);
  const mesh = new THREE.Mesh(geom, material);

  const hls = new Hls({ lowLatencyMode: true });
  hls.loadSource(`hls/tiles-1s/${index}/master.m3u8`);
  hls.attachMedia(vid);

  hls.on(Hls.Events.LEVEL_SWITCHED, (e, data) => {
    // console.log(`Tile ${index} is now at level ${data.level}`);
  });

  // Play video when ready
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    vid.play().catch(() => { });
  });

  // return { mesh, video: vid, texture, index, hls };
  return { mesh, video: vid, texture, index, hls, lastSwitchTime: 0 }; // <-- Add lastSwitchTime

}

// HLS tiles
const tiles = [
  createHLSTile(0, -Math.PI / 2, Math.PI / 2, 0, Math.PI / 2),
  createHLSTile(1, 0, Math.PI / 2, 0, Math.PI / 2),
  createHLSTile(2, Math.PI, Math.PI / 2, 0, Math.PI / 2),
  createHLSTile(3, Math.PI / 2, Math.PI / 2, 0, Math.PI / 2),
  createHLSTile(4, -Math.PI / 2, Math.PI / 2, Math.PI / 2, Math.PI / 2),
  createHLSTile(5, 0, Math.PI / 2, Math.PI / 2, Math.PI / 2),
  createHLSTile(6, Math.PI, Math.PI / 2, Math.PI / 2, Math.PI / 2),
  createHLSTile(7, Math.PI / 2, Math.PI / 2, Math.PI / 2, Math.PI / 2)
];


for (let i = 0; i < 8; i++) {
  const t = tiles[i];
  scene.add(t.mesh);

  // once ready, start the one video
  t.video.addEventListener("loadeddata", () => {
    t.video.currentTime = globalTime;
    t.video.play().catch(() => { });
  });
}



// ABR - 1 Get Camera Direction
const getCameraDirection = () => {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir; // This is a unit vector
};

const quadrantDirections = [
  new THREE.Vector3(-1, 1, -1),  // Top Front Left
  new THREE.Vector3(-1, 1, 1),  // Top Back Left
  new THREE.Vector3(1, 1, -1),  // Top Front Right
  new THREE.Vector3(1, 1, 1),  // Top Back Right

  new THREE.Vector3(-1, -1, -1), // Bottom Front Left
  new THREE.Vector3(-1, -1, 1), // Bottom Back Left
  new THREE.Vector3(1, -1, -1),  // Bottom Front Right
  new THREE.Vector3(1, -1, 1),  // Bottom Back Right
].map(v => v.normalize());



// ABR - 4 Dynamically switch quality based on dot product threshold
// Here we are having two thresholds, then we do the dot product of the camera
// and tile vector, and based on the dot product if it is greater than
// the thresholds it get the quality of video ( high, mid or low ).


// **** New approach 8 tiles, set interval code
const thresholdOne = 0.4;
const thresholdTwo = 0.2;

let oldDir = null;

// new set interval for quality change using threholds
function switchTilesQuality(){
  // setInterval(() => {
    const camDir = getCameraDirection();
    // if (oldDir && oldDir.equals(camDir)) return;

    // if(getAngleBetweenDirs(oldDir, camDir) <= 10){
      // console.log("old cam and new cam are almost same");
      // return;
    // }
  
    const now = performance.now();
    const SWITCH_COOLDOWN = 5000; // x seconds between switches per tile
  
    const tileScores = tiles.map((t, i) => ({
      tile: t,
      dot: camDir.dot(quadrantDirections[i]),
      index: i
    }));
  
    // Sort tiles by how much they align with the camera
    tileScores.sort((a, b) => b.dot - a.dot);
  
    // Switch tiles quality
    tileScores.forEach(({ tile: t, dot, index }) => {
      let desiredLevel = 1; // default to "low"
      if (dot >= thresholdOne) desiredLevel = 3;
      else if (dot >= thresholdTwo) desiredLevel = 2;
  
      // Conditions to allow a level switch
      const canSwitch = (now - t.lastSwitchTime) > SWITCH_COOLDOWN;
  
      if (
        t.hls &&
        t.hls.levels &&
        desiredLevel < t.hls.levels.length &&
        canSwitch &&
        t.hls.nextLevel !== desiredLevel
      ) {
        t.hls.nextLevel = desiredLevel; // Smooth switch
        t.lastSwitchTime = now;
        console.log(`Tile ${index} queued level ${desiredLevel}`);
      }
    });
  
    oldDir = camDir.clone();
  
  // }, 2000);
}


function updateGlobalTime() {
  if (!playbackStartTime) return;
  const elapsed = (performance.now() - playbackStartTime) / 1000; // in seconds
  globalTime = elapsed;
}


function getCurrentQuadrant() {
  const camDir = getCameraDirection();
  let maxDot = -Infinity;
  let currentIndex = -1;

  quadrantDirections.forEach((quadDir, index) => {
    const dot = camDir.dot(quadDir); // Cosine of angle between them
    // console.log("dot product: ", index, dot);
    if (dot > maxDot) {
      maxDot = dot;
      currentIndex = index;
    }
  });
  return currentIndex; // 0 = quad1, 1 = quad2, ...
}



setInterval(() => {
  // Added for sync videos
  updateGlobalTime();

  const camDir = getCameraDirection();

  // Added for trace log
  const currentQuadrant = getCurrentQuadrant();
  traceLog.push({
    time: globalTime.toFixed(2),
    direction: { x: camDir.x, y: camDir.y, z: camDir.z },
    quadrant: currentQuadrant
  })
},100);


// camera check
const ANGLE_THRESHOLD_DEGREES = 18;
const SWITCH_INTERVAL = 1000; // (x/1000) second

let lastCamDir = null;

setInterval(() => {
  const camDir = getCameraDirection().normalize();
  if (!lastCamDir) {
    lastCamDir = camDir.clone();
    return;
  }

  const dot = camDir.dot(lastCamDir);
  const angleRad = Math.acos(Math.min(Math.max(dot, -1), 1)); // clamp for safety
  const angleDeg = angleRad * (180 / Math.PI);

  if (angleDeg <= ANGLE_THRESHOLD_DEGREES) {
    // camera moved enough → switch quality
    switchTilesQuality(camDir, performance.now());
    // lastCamDir.copy(camDir);
    console.log(`Camera moved ${angleDeg.toFixed(2)}°, switching tile quality`);
  } else {
    console.log(`Camera movement ${angleDeg.toFixed(2)}° too small, skipping update`);
    // lastCamDir.copy(camDir);
  }
  lastCamDir.copy(camDir);
}, SWITCH_INTERVAL);




// Preventing video lag on switch, and making all the videos in sync. Added for video sync
let playbackStartTime = null;


// Play all videos once loaded
let loadedCount = 0;
videos.forEach((v) => {
  v.addEventListener("loadeddata", () => {
    loadedCount++;
    if (loadedCount === videos.length) {
      videos.forEach((vid) => {
        vid.currentTime = 0;
      });
      setTimeout(() => {
        // Added for vidoe sync
        playbackStartTime = performance.now();

        videos.forEach((vid) => {
          // Added for video sync
          vid.currentTime = 0;
          vid.play().catch((e) => console.log("Autoplay prevented:", e));
        });
      }, 200);
    }
  });
});



// Added to generate trace route
function downloadTrace() {
  const csv = ["time,x,y,z,quadrant"];
  traceLog.forEach(entry => {
    csv.push(`${entry.time},${entry.direction.x.toFixed(4)},${entry.direction.y.toFixed(4)},${entry.direction.z.toFixed(4)},${entry.quadrant}`);
  });
  const blob = new Blob([csv.join("\n")], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "camera_trace.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Add key listener or button to trigger it
window.addEventListener("keydown", (e) => {
  if (e.key === "t") {  // press 't' to trigger
    downloadTrace();
  }
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Added to generate trace route



