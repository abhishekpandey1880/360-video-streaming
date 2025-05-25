import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";

const w = window.innerWidth;
const h = window.innerHeight;

// Initialize Three.js scene
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0,0,0.01);
// camera.position.z = 5;

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

const path720 = "360-videos/roller-coaster/OG-tiles/8-tiles/720p/";
const path480 = "360-videos/roller-coaster/OG-tiles/8-tiles/480p/";
const path360 = "360-videos/roller-coaster/OG-tiles/8-tiles/360p/";
const path144 = "360-videos/roller-coaster/OG-tiles/8-tiles/144p/";

const sourceMap = {
  0: { high: path480 + "nftl.mp4", mid: path360 + "nftl.mp4", low: path144 + "nftl.mp4" },
  1: { high: path480 + "nbtl.mp4", mid: path360 + "nbtl.mp4", low: path144 + "nbtl.mp4" },
  2: { high: path480 + "nftr.mp4", mid: path360 + "nftr.mp4", low: path144 + "nftr.mp4" },
  3: { high: path480 + "nbtr.mp4", mid: path360 + "nbtr.mp4", low: path144 + "nbtr.mp4" },
  4: { high: path480 + "nfbl.mp4", mid: path360 + "nfbl.mp4", low: path144 + "nfbl.mp4" },
  5: { high: path480 + "nbbl.mp4", mid: path360 + "nbbl.mp4", low: path144 + "nbbl.mp4" },
  6: { high: path480 + "nfbr.mp4", mid: path360 + "nfbr.mp4", low: path144 + "nfbr.mp4" },
  7: { high: path480 + "nbbr.mp4", mid: path360 + "nbbr.mp4", low: path144 + "nbbr.mp4" },
};

function createQuadrant(index, phiStart, phiLength, thetaStart, thetaLength) {
  const highVid = document.createElement("video");
  const midVid = document.createElement("video");
  const lowVid = document.createElement("video");
  [highVid, midVid, lowVid].forEach((v) => {
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    v.playbackRate = 1;
    videos.push(v);
  });

  highVid.src = sourceMap[index].high;
  midVid.src = sourceMap[index].mid;
  lowVid.src = sourceMap[index].low;

  const highTexture = new THREE.VideoTexture(highVid);
  const midTexture = new THREE.VideoTexture(midVid);
  const lowTexture = new THREE.VideoTexture(lowVid);
  [highTexture, midTexture, lowTexture].forEach((tex) => {
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.encoding = THREE.sRGBEncoding;
  });

  const videoMaterial = new THREE.MeshBasicMaterial({
    map: lowTexture,
    side: THREE.BackSide
  });

  const geometry = new THREE.SphereGeometry(20, 64, 64, phiStart, phiLength, thetaStart, thetaLength);
  const mesh = new THREE.Mesh(geometry, videoMaterial);

  mesh.userData.textures = {
    high: highTexture,
    mid: midTexture,
    low: lowTexture
  };
  mesh.userData.videos = {
    high: highVid,
    mid: midVid,
    low: lowVid
  };

  return mesh;
}

const quads = [
  createQuadrant(0, -Math.PI / 2, Math.PI/2, 0, Math.PI / 2), // Front Top Left
  createQuadrant(1, 0, Math.PI/2, 0, Math.PI / 2), // Back Top Left

  createQuadrant(2, Math.PI, Math.PI/2, 0, Math.PI / 2),  // Front Top Right
  createQuadrant(3, Math.PI/2, Math.PI/2, 0, Math.PI / 2),  // Back Top Right

  createQuadrant(4, -Math.PI / 2, Math.PI/2, Math.PI/2, Math.PI / 2), // Front Bottom Left
  createQuadrant(5, 0, Math.PI / 2, Math.PI / 2, Math.PI / 2), // back Bottom Left

  createQuadrant(6, Math.PI, Math.PI/2, Math.PI/2, Math.PI/2),   // Front Bottom Right
  createQuadrant(7, Math.PI/2, Math.PI/2, Math.PI/2, Math.PI/2)   // Back Bottom Right
];

quads.forEach((q) => scene.add(q));


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

// ABR - 3 Calculate which quadrant in the view
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

// ABR - 4 Dynamically switch quality based on dot product threshold
// Here we are having two thresholds, then we do the dot product of the camera 
// and tile vector, and based on the dot product if it is greater than 
// the thresholds it get the quality of video ( high, mid or low ).

// const DOT_THRESHOLD = 0.35;
const thresholdOne = 0.5;
const thresholdTwo = 0.1;

setInterval(() => {
  const camDir = getCameraDirection();

  quads.forEach((q, i) => {
    const dot = camDir.dot(quadrantDirections[i]);

    let desiredTexture;
    if (dot >= thresholdOne) {
      desiredTexture = q.userData.textures.high;
    } else if (dot >= thresholdTwo) {
      desiredTexture = q.userData.textures.mid;
    } else {
      desiredTexture = q.userData.textures.low;
    }

    const currentTexture = q.material.map;

    if (currentTexture !== desiredTexture) {
      q.material.map = desiredTexture;
      q.material.needsUpdate = true;
    }
  });  
}, 200);




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
        videos.forEach((vid) => {
          vid.play().catch((e) => console.log("Autoplay prevented:", e));
        });
      }, 500);
    }
  });
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();
}
animate();
