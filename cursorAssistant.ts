import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ethers } from 'ethers';
import { PythClient } from '@pythnetwork/pyth-sdk-js';

// Interfaces for type safety
interface ProjectConfig {
  projectName: string;
  blockchain: 'Ethereum' | 'Polygon' | 'Solana';
  gameEngine: 'Three.js';
  physicsEngine: 'Rapier';
  openSourceLicense: 'MIT' | 'GPL' | 'Apache';
}

interface SceneConfig {
  terrainSize: { width: number; height: number; depth: number };
  playerBallRadius: number;
  targetBotCount: number;
  holePosition: { x: number; y: number; z: number };
}

interface NFTIntegration {
  contractAddress: string;
  tokenStandard: 'ERC721' | 'ERC1155';
  metadataURL: string;
}

// Assistant class to guide the CosmicGolf project
class CosmicGolfAssistant {
  private config: ProjectConfig;
  private sceneConfig: SceneConfig;

  constructor(config: ProjectConfig, sceneConfig: SceneConfig) {
    this.config = config;
    this.sceneConfig = sceneConfig;
  }

  // Step 1: Initialize the project
  initializeProject(): string {
    return `
      # ${this.config.projectName} - Project Setup
      ## Step 1: Set up the environment
      1. Install Node.js and npm.
      2. Create a new project directory:
         \`\`\`bash
         mkdir ${this.config.projectName}
         cd ${this.config.projectName}
         npm init -y
         \`\`\`
      3. Install dependencies:
         \`\`\`bash
         npm install three @dimforge/rapier3d-compat typescript ts-node vite ethers @rainbow-me/rainbowkit @pythnetwork/pyth-sdk-js wagmi viem
         npm install --save-dev @vitejs/plugin-react eslint jest
         \`\`\`
      4. Initialize TypeScript:
         \`\`\`bash
         npx tsc --init
         \`\`\`
      5. Configure \`tsconfig.json\>:
         \`\`\`json
         {
           "compilerOptions": {
             "target": "ESNext",
             "module": "ESNext",
             "strict": true,
             "esModuleInterop": true,
             "outDir": "./dist",
             "rootDir": "./src",
             "jsx": "react-jsx"
           }
         }
         \`\`\`
      6. Set up Vite for bundling:
         \`\`\`bash
         npm install vite @vitejs/plugin-react
         \`\`\`
         Create \`vite.config.ts\`:
         \`\`\`typescript
         import { defineConfig } from 'vite';
         import react from '@vitejs/plugin-react';

         export default defineConfig({
           plugins: [react()],
         });
         \`\`\`
      7. Configure ESLint:
         \`\`\`bash
         npx eslint --init
         \`\`\`
         Sample \`.eslintrc.json\`:
         \`\`\`json
         {
           "env": { "browser": true, "es2021": true },
           "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
           "parser": "@typescript-eslint/parser",
           "plugins": ["@typescript-eslint"],
           "rules": { "indent": ["error", 2], "semi": ["error", "always"] }
         }
         \`\`\`
      8. Create project structure:
         \`\`\`bash
         mkdir src tests public
         touch src/index.ts src/index.html src/styles.css src/gameElements.ts src/nftIntegration.ts src/pythRNG.ts
         \`\`\`
      9. Initialize Git and GitHub:
         \`\`\`bash
         git init
         echo "# ${this.config.projectName}" > README.md
         git add .
         git commit -m "Initial commit"
         gh repo create ${this.config.projectName} --public --source=. --remote=origin
         \`\`\`
      10. Add MIT license:
          Create \`LICENSE\` with MIT license text.
    `;
  }

  // Step 2: Set up the main game scene
  generateMainScene(): string {
    return `
      // src/index.ts
      import * as THREE from 'three';
      import RAPIER from '@dimforge/rapier3d-compat';

      /** Main game scene setup */
      async function initGame(): Promise<void> {
        // Initialize Rapier
        await RAPIER.init();
        const gravity = { x: 0, y: -9.81, z: 0 };
        const world = new RAPIER.World(gravity);

        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          75,
          window.innerWidth / window.innerHeight,
          0.1,
          1000
        );
        camera.position.set(10, 10, 10); // Isometric view
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 5);
        scene.add(directionalLight);

        // Terrain
        const terrainGeometry = new THREE.PlaneGeometry(
          ${this.sceneConfig.terrainSize.width},
          ${this.sceneConfig.terrainSize.height},
          32,
          32
        );
        const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
        terrainMesh.rotation.x = -Math.PI / 2;
        scene.add(terrainMesh);

        const terrainBody = world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed()
        );
        const terrainCollider = RAPIER.ColliderDesc.cuboid(
          ${this.sceneConfig.terrainSize.width / 2},
          0.1,
          ${this.sceneConfig.terrainSize.height / 2}
        );
        world.createCollider(terrainCollider, terrainBody);

        // PlayerBall
        const playerBallGeometry = new THREE.SphereGeometry(${this.sceneConfig.playerBallRadius}, 32, 32);
        const playerBallMaterial = new THREE.MeshStandardMaterial({ color: 0x00b7eb });
        const playerBallMesh = new THREE.Mesh(playerBallGeometry, playerBallMaterial);
        scene.add(playerBallMesh);

        const playerBallBody = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1, 0)
        );
        const playerBallCollider = RAPIER.ColliderDesc.ball(${this.sceneConfig.playerBallRadius})
          .setRestitution(0.7)
          .setFriction(0.2)
          .setCcdEnabled(true);
        world.createCollider(playerBallCollider, playerBallBody);
        playerBallBody.userData = { mesh: playerBallMesh };

        // Animation loop
        function animate() {
          requestAnimationFrame(animate);
          world.step();
          const playerBallPos = playerBallBody.translation();
          playerBallMesh.position.set(playerBallPos.x, playerBallPos.y, playerBallPos.z);
          renderer.render(scene, camera);
        }
        animate();
      }

      initGame().catch(console.error);
    `;
  }

  // Step 3: Implement NFT integration with Rainbow Wallet
  integrateNFTs(nftConfig: NFTIntegration): string {
    return `
      // src/nftIntegration.ts
      import { ethers } from 'ethers';
      import * as THREE from 'three';
      import { getAccount } from '@wagmi/core';

      /** Loads NFT cosmetic for the PlayerBall */
      async function loadNFTCosmetic(
        tokenId: number,
        mesh: THREE.Mesh,
        contractAddress: string = '${nftConfig.contractAddress}'
      ): Promise<void> {
        try {
          // Check wallet connection
          const account = getAccount();
          if (!account.address) {
            throw new Error('Wallet not connected');
          }

          // Connect to blockchain
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(
            contractAddress,
            [
              'function ownerOf(uint256 tokenId) view returns (address)',
              'function tokenURI(uint256 tokenId) view returns (string)'
            ],
            provider
          );

          // Verify ownership
          const owner = await contract.ownerOf(tokenId);
          if (owner.toLowerCase() !== account.address.toLowerCase()) {
            throw new Error('User does not own this NFT');
          }

          // Fetch and validate metadata
          const tokenURI = await contract.tokenURI(tokenId);
          if (!tokenURI.startsWith('https://') && !tokenURI.startsWith('ipfs://')) {
            throw new Error('Invalid metadata URL');
          }
          const response = await fetch(tokenURI);
          const metadata = await response.json();
          if (!metadata.image) {
            throw new Error('Metadata missing image');
          }

          // Apply cosmetic
          const texture = new THREE.TextureLoader().load(metadata.image);
          mesh.material = new THREE.MeshStandardMaterial({ map: texture });
        } catch (error) {
          console.error('Error loading NFT:', error);
          alert('Failed to load NFT cosmetic. Please try again.');
        }
      }

      // Example usage
      const playerBallMesh = new THREE.Mesh(); // Replace with actual PlayerBall mesh
      loadNFTCosmetic(1, playerBallMesh).catch(console.error);
    `;
  }

  // Step 4: Implement Pyth RNG for procedural generation
  integratePythRNG(): string {
    return `
      // src/pythRNG.ts
      import { PythClient } from '@pythnetwork/pyth-sdk-js';

      /** Fetches a random number from Pyth Network */
      async function getRandomNumber(): Promise<number> {
        try {
          const client = new PythClient({ network: 'mainnet' }); // Replace with actual endpoint
          const random = await client.getRandomNumber();
          return random;
        } catch (error) {
          console.error('Pyth RNG failed:', error);
          return Math.random(); // Fallback to client-side RNG
        }
      }

      /** Generates random TargetBot positions using Pyth RNG */
      async function generateTargetBotPositions(count: number, terrainSize: { width: number; height: number }): Promise<{ x: number; y: number; z: number }[]> {
        const positions: { x: number; y: number; z: number }[] = [];
        for (let i = 0; i < count; i++) {
          const random = await getRandomNumber();
          const x = (random * terrainSize.width) - (terrainSize.width / 2);
          const z = (random * terrainSize.height) - (terrainSize.height / 2);
          positions.push({ x, y: 1, z });
        }
        return positions;
      }

      // Example usage
      generateTargetBotPositions(${this.sceneConfig.targetBotCount}, { width: ${this.sceneConfig.terrainSize.width}, height: ${this.sceneConfig.terrainSize.height} })
        .then(positions => console.log('TargetBot positions:', positions))
        .catch(console.error);
    `;
  }

  // Step 5: Guide open-source collaboration
  setupOpenSource(): string {
    return `
      # Open-Source Collaboration Guide
      ## Step 5: Set up the repository for collaboration
      1. Create a comprehensive README (see project root).
      2. Add contributing guidelines:
         Create \`CONTRIBUTING.md\`:
         \`\`\`markdown
         # Contributing to CosmicGolf
         1. Fork the repo and create a branch (\`git checkout -b feature/your-feature\`).
         2. Follow code rules in README.md (TypeScript, Three.js, Rapier, etc.).
         3. Write Jest tests for new features.
         4. Submit a PR with a clear description.
         5. For NFT integrations, propose collections via GitHub Issues.
         \`\`\`
      3. Set up GitHub Actions for CI/CD:
         Create \`.github/workflows/ci.yml\`:
         \`\`\`yaml
         name: CI
         on: [push, pull_request]
         jobs:
           build:
             runs-on: ubuntu-latest
             steps:
               - uses: actions/checkout@v3
               - uses: actions/setup-node@v3
                 with:
                   node-version: '18'
               - run: npm install
               - run: npm run build
               - run: npm test
         \`\`\`
      4. Engage the community:
         - Create a Discord server for discussions (link TBD).
         - Announce on X.com with #CosmicGolf, #Web3Gaming, #OpenSource.
         - Encourage NFT projects to propose integrations via GitHub Issues.
    `;
  }

  // Step 6: Add TargetBots and hole
  addGameElements(): string {
    return `
      // src/gameElements.ts
      import * as THREE from 'three';
      import RAPIER from '@dimforge/rapier3d-compat';

      /** Adds a TargetBot to the scene */
      function addTargetBot(
        scene: THREE.Scene,
        world: RAPIER.World,
        position: { x: number; y: number; z: number }
      ): void {
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0xff4500 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        scene.add(mesh);

        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x, position.y, position.z)
        );
        const collider = RAPIER.ColliderDesc.ball(0.5);
        world.createCollider(collider, body);
        body.userData = { mesh, type: 'targetBot' };
      }

      /** Adds a hole to the scene */
      function addHole(
        scene: THREE.Scene,
        world: RAPIER.World,
        position: { x: number; y: number; z: number }
      ): void {
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32);
        const material = new THREE.MeshStandard GudelinesMaterial({ color: 0x000000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        scene.add(mesh);

        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z)
        );
        const collider = RAPIER.ColliderDesc.cylinder(0.05, 0.3).setSensor(true);
        world.createCollider(collider, body);
        body.userData = { mesh, type: 'hole' };
      }

      /** Sets up collision handling */
      function setupCollisions(world: RAPIER.World, playerBallBody: RAPIER.RigidBody): void {
        world.contactsWith(playerBallBody, (collider) => {
          const body = collider.parent();
          if (body?.userData?.type === 'targetBot') {
            scene.remove(body.userData.mesh);
            world.removeRigidBody(body);
            playerBallBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
          }
        });

        world.intersectionsWith(playerBallBody, (collider) => {
          const body = collider.parent();
          if (body?.userData?.type === 'hole') {
            console.log('Win condition met!');
            // Trigger win logic
          }
        });
      }

      // Example usage
      async function initElements(): Promise<void> {
        await RAPIER.init();
        const scene = new THREE.Scene();
        const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
        const playerBall = { body: world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()) }; // Replace with actual PlayerBall
        addTargetBot(scene, world, { x: 2, y: 1, z: 2 });
        addHole(scene, world, { x: ${this.sceneConfig.holePosition.x}, y: ${this.sceneConfig.holePosition.y}, z: ${this.sceneConfig.holePosition.z} });
        setupCollisions(world, playerBall.body);
      }

      initElements().catch(console.error);
    `;
  }

  // Get full project guidance
  getFullGuidance(): string {
    return [
      this.initializeProject(),
      this.generateMainScene(),
      this.integrateNFTs({
        contractAddress: '0xYourNFTContractAddress',
        tokenStandard: 'ERC721',
        metadataURL: 'https://ipfs.io/ipfs/yourMetadata',
      }),
      this.integratePythRNG(),
      this.setupOpenSource(),
      this.addGameElements(),
    ].join('\n\n---\n\n');
  }
}

// Example usage in Cursor
const assistant = new CosmicGolfAssistant(
  {
    projectName: 'CosmicGolf',
    blockchain: 'Ethereum',
    gameEngine: 'Three.js',
    physicsEngine: 'Rapier',
    openSourceLicense: 'MIT',
  },
  {
    terrainSize: { width: 20, height: 20, depth: 5 },
    playerBallRadius: 0.5,
    targetBotCount: 3,
    holePosition: { x: 5, y: 0.1, z: 5 },
  }
);

console.log(assistant.getFullGuidance());

export default CosmicGolfAssistant;