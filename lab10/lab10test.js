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
    attribute vec3 aNormal;  // Add normals

    uniform mat4 uProjection;
    uniform mat4 uModelView;
    uniform mat4 uNormalMatrix;  // Transform normals properly

    varying vec3 vNormal;  // Pass normal to fragment shader
    varying vec3 vPosition; // Pass position to fragment shader

    void main() {
      vec4 transformedPosition = uModelView * vec4(aPosition, 1.0);
      vPosition = transformedPosition.xyz;
      vNormal = mat3(uNormalMatrix) * aNormal;  // Transform the normal
      gl_Position = uProjection * transformedPosition;
}
`;
const fragmentShaderSource = `
    precision mediump float;

    uniform vec3 uLightPosition;  // Position of the light source
    uniform vec3 uLightColor;     // Light color
    uniform vec3 uAmbientLight;   // Ambient light color
    uniform vec4 uColor;          // Object color

    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
        vec3 normal = normalize(vNormal);  // Normalize interpolated normal
        vec3 lightDir = normalize(uLightPosition - vPosition);  // Light direction

        // Ambient component
        vec3 ambient = uAmbientLight * uColor.rgb;

        // Diffuse component
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uLightColor * diff * uColor.rgb;

        // Specular component
        vec3 viewDir = normalize(-vPosition);  // Camera is at the origin
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);  // Shininess factor
        vec3 specular = uLightColor * spec;

        // Combine all components
        vec3 lighting = ambient + diffuse + specular;

        gl_FragColor = vec4(lighting, uColor.a);
    }
`;
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

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

const uLightPosition = gl.getUniformLocation(program, 'uLightPosition');
const uLightColor = gl.getUniformLocation(program, 'uLightColor');
const uAmbientLight = gl.getUniformLocation(program, 'uAmbientLight');
const uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');

// Set light properties
gl.uniform3fv(uLightPosition, [10.0, 10.0, 10.0]);  // Position of the light
gl.uniform3fv(uLightColor, [1.0, 1.0, 1.0]);        // Light color (white)
gl.uniform3fv(uAmbientLight, [0.2, 0.2, 0.2]);      // Ambient light color



// Uniforms and matrices (same as before)
const uProjection = gl.getUniformLocation(program, 'uProjection');
const uModelView = gl.getUniformLocation(program, 'uModelView');
const uColor = gl.getUniformLocation(program, 'uColor');

const projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 1000.0);
gl.uniformMatrix4fv(uProjection, false, projectionMatrix);
console.log('Projection Matrix:', projectionMatrix);

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

const cubeNormals = new Float32Array([
  // Normals for each face
  0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,  // Front face
  0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, // Back face
  0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,  // Top face
  0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, // Bottom face
  1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,  // Right face
  -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0  // Left face
]);

const normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);

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


window.addEventListener('keydown', (event) => {
  console.log(`Key Pressed: ${event.key}`);
  switch (event.key) {
      case 'ArrowUp':
          cameraPitch -= 0.1;
          if (cameraPitch < -Math.PI / 2) cameraPitch = -Math.PI / 2;
          break;
      case 'ArrowDown':
          cameraPitch += 0.1;
          if (cameraPitch > Math.PI / 2) cameraPitch = Math.PI / 2;
          break;
      case 'ArrowLeft':
          cameraYaw -= 0.1;
          break;
      case 'ArrowRight':
          cameraYaw += 0.1;
          break;
  }
});



function updateCameraPosition() {
  const MAX_CAMERA_DISTANCE = 100; // Define a maximum distance for the camera

  const x = cameraRadius * Math.cos(cameraPitch) * Math.sin(cameraYaw);
  const y = cameraRadius * Math.sin(cameraPitch);
  const z = cameraRadius * Math.cos(cameraPitch) * Math.cos(cameraYaw);

  cameraPosition.x = Math.min(Math.max(x, -MAX_CAMERA_DISTANCE), MAX_CAMERA_DISTANCE);
  cameraPosition.y = Math.min(Math.max(y, -MAX_CAMERA_DISTANCE), MAX_CAMERA_DISTANCE);
  cameraPosition.z = Math.min(Math.max(z, -MAX_CAMERA_DISTANCE), MAX_CAMERA_DISTANCE);
}



// Update camera view
function updateCameraView() {
  updateCameraPosition(); // Update camera dynamically

  mat4.identity(modelViewMatrix);

  // Use `mat4.lookAt` for the view transformation
  mat4.lookAt(
      modelViewMatrix,
      [cameraPosition.x, cameraPosition.y, cameraPosition.z], // Camera position
      [0, 0, 0], // Look-at point (center of the scene)
      [0, 1, 0]  // Up vector
  );
}



// Draw functions
function drawCube(color, transformMatrix) {
  // Set object color
  gl.uniform4fv(uColor, color);

  // Pass model-view matrix
  gl.uniformMatrix4fv(uModelView, false, transformMatrix);

  // Compute and pass the normal matrix
  const normalMatrix = mat4.create();
  mat4.invert(normalMatrix, transformMatrix);
  mat4.transpose(normalMatrix, normalMatrix);
  gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);

  // Enable position attribute
  const aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPosition);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

  // Enable normal attribute
  const aNormal = gl.getAttribLocation(program, 'aNormal');
  gl.enableVertexAttribArray(aNormal);
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);

  // Draw the cube
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

const head = snakeSegments[0];
console.log('Snake Head Position:', head);


function animate() {
  updateCameraView();

  // Store the current positions of all segments
  const previousPositions = snakeSegments.map(segment => ({ ...segment }));

  // Move the head toward the target
  const head = snakeSegments[0];
  console.log('Snake Head Position:', head);
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
