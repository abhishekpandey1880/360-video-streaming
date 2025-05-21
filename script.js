import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";

const w = window.innerWidth;
const h = window.innerHeight;

// Initialize Three.js scene
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0,0,1);
// camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
// renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);
// document.getElementById('container').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 5);  // Point the camera to look forward
controls.update();
// controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = true;
controls.rotateSpeed = -1;

const videos = [];

function createQuadrant(vidSrc, phiStart, phiLength, thetaStart, thetaLength){

  // Create video element
  const video = document.createElement('video');
  videos.push(video);
  video.src = vidSrc; // Placeholder - replace with actual video URL
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.muted = true; // Muted to allow autoplay

  // Create video texture
  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.NearestFilter;
  videoTexture.magFilter = THREE.NearestFilter;
  videoTexture.encoding = THREE.sRGBEncoding; // For quality

  // Material with video texture
  const videoMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture,
    side: THREE.DoubleSide
  });

  // Create a quadrant
  let quadGeometry = new THREE.SphereGeometry(20, 64, 64, phiStart, phiLength, thetaStart, thetaLength);

  // Create a mesh
  const quadMesh = new THREE.Mesh(quadGeometry, videoMaterial);

  return quadMesh;

}

// ABR - 1 Get Camera Direction
const getCameraDirection = () => {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir; // This is a unit vector
};

// ABR - 2 Define the center direction of each quadrant
const quadrantDirections = [
  new THREE.Vector3(0, 1, 1),  // quad1
  new THREE.Vector3(0, 1, -1), // quad2
  new THREE.Vector3(0, -1, 1), // quad3
  new THREE.Vector3(0, -1, -1) // quad4
].map(v => v.normalize());

// ABR - 3 Calculate which quadrant in the view
function getCurrentQuadrant() {
  const camDir = getCameraDirection();
  let maxDot = -Infinity;
  let currentIndex = -1;

  quadrantDirections.forEach((quadDir, index) => {
    const dot = camDir.dot(quadDir); // Cosine of angle between them
    if (dot > maxDot) {
      maxDot = dot;
      currentIndex = index;
    }
  });

  return currentIndex; // 0 = quad1, 1 = quad2, ...
}

// ABR - 4 Video Sources for diffrent quality ( yet to be implemented ) 
const videoSources = {
  0: { high: "2_high.mp4", low: "2_low.mp4" },
  1: { high: "1_high.mp4", low: "1_low.mp4" },
  2: { high: "4_high.mp4", low: "4_low.mp4" },
  3: { high: "3_high.mp4", low: "3_low.mp4" },
};


// ABR - 5 Dynamically switch quality based on the viewport
let currentQuadrant = -1;

setInterval(() => {
  const newQuadrant = getCurrentQuadrant();
  if (newQuadrant !== currentQuadrant) {
    currentQuadrant = newQuadrant;
    
  console.log(currentQuadrant);
  //   videos.forEach((video, i) => {
  //     const src = (i === currentQuadrant) ? videoSources[i].high : videoSources[i].low;
  //     if (video.src !== src) {
  //       video.pause();
  //       video.src = src;
  //       video.load();
  //       video.play().catch(e => console.log("play error:", e));
  //     }
  //   });
  }
}, 500);


const quad1 = createQuadrant("360-videos/roller-coaster/OG-tiles/tl.mp4", -1 * (Math.PI / 2), Math.PI, 0, Math.PI / 2); // Top Left 
const quad2 = createQuadrant("360-videos/roller-coaster/OG-tiles/tr.mp4", Math.PI / 2, Math.PI, 0, Math.PI / 2); // Top Right
const quad3 = createQuadrant("360-videos/roller-coaster/OG-tiles/bl.mp4", -1 * (Math.PI / 2), Math.PI, Math.PI / 2, Math.PI / 2); // Bottom Left
const quad4 = createQuadrant("360-videos/roller-coaster/OG-tiles/br.mp4", Math.PI / 2, Math.PI, Math.PI / 2, Math.PI / 2); // Bottom Right

scene.add(quad1);
scene.add(quad2);
scene.add(quad3);
scene.add(quad4);



// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update(); // ✅ VERY IMPORTANT
}

// Start animation
animate();

// Try to autoplay the video (might be blocked by browser policies)
let loadedCount = 0;

videos.forEach((video) => {
  video.addEventListener('loadeddata', () => {
    loadedCount++;
    if (loadedCount === videos.length) {
      // All videos are ready
      videos.forEach(v => {
        v.currentTime = 0;
      });

      // Delay a tiny bit to ensure alignment
      setTimeout(() => {
        videos.forEach(v => {
          v.play().catch(e => {
            console.log('Video autoplay was prevented:', e);
          });
        });
      }, 100); // small sync buffer
    }
  });
});

