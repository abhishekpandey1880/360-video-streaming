// Initialize Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);

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

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Animation variables
let isRotating = false;

// Control functions
function playPauseVideo() {
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

function toggleRotation() {
  isRotating = !isRotating;
}

function changeShape(shape) {
  scene.remove(object);

  switch (shape) {
    case 'cube':
      currentGeometry = new THREE.BoxGeometry(3, 3, 3);
      break;
    case 'sphere':
      currentGeometry = new THREE.SphereGeometry(2, 32, 32);
      break;
    case 'cylinder':
      currentGeometry = new THREE.CylinderGeometry(1.5, 1.5, 3, 32);
      break;
    case 'torus':
      currentGeometry = new THREE.TorusGeometry(2, 0.5, 16, 100);
      break;
    default:
      currentGeometry = new THREE.BoxGeometry(3, 3, 3);
  }

  object = new THREE.Mesh(currentGeometry, videoMaterial);
  scene.add(object);
}

// Event listeners
document.getElementById('playPauseBtn').addEventListener('click', playPauseVideo);
document.getElementById('rotateBtn').addEventListener('click', toggleRotation);
document.getElementById('shapeSelect').addEventListener('change', function () {
  changeShape(this.value);
});

// Handle window resize
window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (isRotating) {
    // object.rotation.x += 0.005;
    object.rotation.y += 0.01;
  }

  renderer.render(scene, camera);
}

// Start animation
animate();

// Try to autoplay the video (might be blocked by browser policies)
video.play().catch(e => {
  console.log('Video autoplay was prevented:', e);
  console.log('Please click the Play/Pause button to start the video');
});