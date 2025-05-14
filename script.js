import { OrbitControls } from "jsm/controls/OrbitControls.js";
import * as THREE from "three";

// Initialize Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// document.getElementById('container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -1);  // Point the camera to look forward
controls.update();
controls.enableDamping = true;
controls.dampingFactor = 0.005;
controls.enableZoom = true;
controls.enablePan = true;
controls.rotateSpeed = -1;

// Create video element
const video = document.createElement('video');
video.src = "360-sun.mp4"; // Placeholder - replace with actual video URL
video.crossOrigin = "anonymous";
video.loop = true;
video.muted = true; // Muted to allow autoplay

// Create video texture
const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;

// Material with video texture
const videoMaterial = new THREE.MeshBasicMaterial({
  map: videoTexture,
  side: THREE.DoubleSide
});

// Create default shape (cube)
let currentGeometry = new THREE.BoxGeometry(3, 3, 3);
let object = new THREE.Mesh(currentGeometry, videoMaterial);
scene.add(object);


// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update(); // ✅ VERY IMPORTANT
}

// Start animation
animate();

// Try to autoplay the video (might be blocked by browser policies)
video.play().catch(e => {
  console.log('Video autoplay was prevented:', e);
  console.log('Please click the Play/Pause button to start the video');
});