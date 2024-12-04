// Setup WebGL
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.1, 0.1, 0.1, 1.0);
gl.enable(gl.DEPTH_TEST);

// Shaders (same as before)
const vertexShaderSource = `
    attribute vec3 aPosition;
    uniform mat4 uProjection;
    uniform mat4 uModelView;
    void main() {
        gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
    }
`;
const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 uColor;
    void main() {
        gl_FragColor = uColor;
    }
`;
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}
const program = (() => {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    return program;
})();

// Uniforms and matrices (same as before)
const uProjection = gl.getUniformLocation(program, 'uProjection');
const uModelView = gl.getUniformLocation(program, 'uModelView');
const uColor = gl.getUniformLocation(program, 'uColor');

const projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);
gl.uniformMatrix4fv(uProjection, false, projectionMatrix);

const modelViewMatrix = mat4.create();
let cameraPosition = { x: 0, y: 20, z: 0 }; // High above the scene
let cameraRadius = 20; // Fixed distance from the center
let cameraYaw = 0;     // Rotation around the Y-axis
let cameraPitch = 0;   // Rotation around the X-axis




// Cube geometry
const cubeVertices = new Float32Array([
  // Front face
  -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
  // Back face
  -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5, -0.5,
  // Top face
  -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
  // Bottom face
  -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
  // Right face
  0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,
  // Left face
  -0.5, -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5
]);

const indices = new Uint16Array([
  0, 1, 2,  0, 2, 3,    // Front face
  4, 5, 6,  4, 6, 7,    // Back face
  8, 9, 10,  8, 10, 11, // Top face
  12, 13, 14,  12, 14, 15, // Bottom face
  16, 17, 18,  16, 18, 19, // Right face
  20, 21, 22,  20, 22, 23  // Left face
]);
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Snake data
const segmentSpacing = 1.0; // Distance between each segment
const initialYPosition = 3.0;
const snakeSegments = Array.from({ length: 10 }, (_, i) => ({
    x: -i * segmentSpacing, // Space the segments along the X-axis
    y: initialYPosition,
    z: 0
}));
let targetPosition = { x: 0, z: 0 };

function getMouseWorldPosition(mouseX, mouseY) {
  // Convert NDC (Normalized Device Coordinates) to clip space
  const clipCoords = vec4.fromValues(mouseX, mouseY, -1.0, 1.0);

  // Unproject clip coordinates into view space
  const inverseProjection = mat4.create();
  mat4.invert(inverseProjection, projectionMatrix);
  const viewCoords = vec4.create();
  vec4.transformMat4(viewCoords, clipCoords, inverseProjection);
  viewCoords[2] = -1.0; // Set depth to the near plane
  viewCoords[3] = 0.0;

  // Transform view space coordinates into world space
  const inverseView = mat4.create();
  mat4.invert(inverseView, modelViewMatrix);
  const worldCoords = vec4.create();
  vec4.transformMat4(worldCoords, viewCoords, inverseView);

  // Create a ray from the camera position
  const rayDirection = vec3.fromValues(worldCoords[0], worldCoords[1], worldCoords[2]);
  vec3.normalize(rayDirection, rayDirection);

  // Calculate intersection with the ground plane (y = 0)
  const cameraWorldPosition = vec3.fromValues(cameraPosition.x, cameraPosition.y, cameraPosition.z);
  const t = -cameraWorldPosition[1] / rayDirection[1]; // Solve for y = 0
  const intersection = vec3.create();
  vec3.scaleAndAdd(intersection, cameraWorldPosition, rayDirection, t);

  return { x: intersection[0], z: intersection[2] };
}


// Track mouse movement
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
  const mouseY = -(((event.clientY - rect.top) / canvas.height) * 2 - 1);

  // Get the world position of the mouse on the ground plane
  const worldPosition = getMouseWorldPosition(mouseX, mouseY);
  targetPosition.x = worldPosition.x;
  targetPosition.z = worldPosition.z;
});


// Track arrow key presses
window.addEventListener('keydown', (event) => {
  switch (event.key) {
      case 'ArrowUp': // Rotate upward (increase pitch)
          cameraPitch -= 0.1;
          if (cameraPitch < -Math.PI / 2) cameraPitch = -Math.PI / 2; // Clamp to 90° upward
          break;
      case 'ArrowDown': // Rotate downward (decrease pitch)
          cameraPitch += 0.1;
          if (cameraPitch > Math.PI / 2) cameraPitch = Math.PI / 2; // Clamp to 90° downward
          break;
      case 'ArrowLeft': // Rotate left (increase yaw)
          cameraYaw -= 0.1;
          break;
      case 'ArrowRight': // Rotate right (decrease yaw)
          cameraYaw += 0.1;
          break;
  }
});


function updateCameraPosition() {
  const x = cameraRadius * Math.cos(cameraPitch) * Math.sin(cameraYaw); // X coordinate
  const y = cameraRadius * Math.sin(cameraPitch);                       // Y coordinate
  const z = cameraRadius * Math.cos(cameraPitch) * Math.cos(cameraYaw); // Z coordinate

  cameraPosition.x = x;
  cameraPosition.y = y;
  cameraPosition.z = z;
}



// Update camera view
function updateCameraView() {
  updateCameraPosition(); // Calculate the new camera position dynamically

  mat4.identity(modelViewMatrix);

  // Use `mat4.lookAt` to position the camera and point it at the center
  mat4.lookAt(
      modelViewMatrix,
      [cameraPosition.x, cameraPosition.y, cameraPosition.z], // Camera position
      [0, 0, 0], // Look-at point (center of the scene)
      [0, 1, 0]  // Up vector
  );
}



// Draw functions
function drawCube(color, transformMatrix) {
    gl.uniform4fv(uColor, color);
    gl.uniformMatrix4fv(uModelView, false, transformMatrix);
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}
function drawSnake() {
  snakeSegments.forEach((segment, index) => {
      const transformMatrix = mat4.create();
      mat4.translate(transformMatrix, modelViewMatrix, [segment.x, segment.y, segment.z]);

      // Set color: red for the head, orange for the body
      const color = index === 0 ? [1.0, 0.0, 0.0, 1.0] : [1.0, 0.5, 0.0, 1.0]; // Red for head, orange for body
      drawCube(color, transformMatrix);
  });
}



// Ground plane vertices
const groundVertices = new Float32Array([
  -50.0, -0.6, -50.0,  // Bottom-left corner
   50.0, -0.6, -50.0,  // Bottom-right corner
   50.0, -0.6,  50.0,  // Top-right corner
  -50.0, -0.6,  50.0   // Top-left corner
]);

const groundIndices = new Uint16Array([
  0, 1, 2,  // First triangle
  0, 2, 3   // Second triangle
]);

const groundColor = [0.3, 0.3, 0.3, 1.0]; // Gray color for the ground

// Create buffers for the ground
const groundPositionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, groundPositionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);

const groundIndexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, groundIndices, gl.STATIC_DRAW);

// Draw the ground plane
function drawGround() {
  const aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPosition);
  gl.bindBuffer(gl.ARRAY_BUFFER, groundPositionBuffer);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

  gl.uniform4fv(uColor, groundColor);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundIndexBuffer);
  gl.drawElements(gl.TRIANGLES, groundIndices.length, gl.UNSIGNED_SHORT, 0);
}


function animate() {
  updateCameraView();

  // Store the current positions of all segments
  const previousPositions = snakeSegments.map(segment => ({ ...segment }));

  // Move the head toward the target
  const head = snakeSegments[0];
  const direction = { x: targetPosition.x - head.x, z: targetPosition.z - head.z };
  const magnitude = Math.sqrt(direction.x ** 2 + direction.z ** 2);
  if (magnitude > 0) {
      direction.x /= magnitude;
      direction.z /= magnitude;
  }
  head.x += direction.x * 0.1;
  head.z += direction.z * 0.1;

  // Update each segment to follow the segment ahead
  for (let i = 1; i < snakeSegments.length; i++) {
      const prev = previousPositions[i - 1];
      const curr = snakeSegments[i];

      const dx = prev.x - curr.x;
      const dz = prev.z - curr.z;
      const distance = Math.sqrt(dx ** 2 + dz ** 2);

      if (distance > segmentSpacing) {
          const adjustment = (distance - segmentSpacing) / distance;
          curr.x += dx * adjustment;
          curr.z += dz * adjustment;
      }
  }

  // Clear and redraw
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  drawGround();  // Draw the ground first
  drawSnake();   // Draw the snake above the ground

  requestAnimationFrame(animate);
}

animate();
