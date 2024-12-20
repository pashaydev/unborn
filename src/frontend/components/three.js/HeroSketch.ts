class HeroSketch {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private particles: THREE.Points;
    private time: number;
    private el: HTMLCanvasElement;
    private THREE: any;

    private isCharging = false;
    private chargePower = 0;
    private readonly MAX_CHARGE = 1.0;
    private readonly CHARGE_RATE = 0.8; // Speed of charging
    private readonly DISCHARGE_RATE = 2.0; // Speed of discharge
    private isFocused = true; // Default to true
    private focusTransition = 1.0; // 1.0 = fully focused, 0.0 = fully blurred
    private readonly FOCUS_TRANSITION_SPEED = 2.0; // Speed of focus/blur transition

    private mousePosition: THREE.Vector2;
    private raycaster: THREE.Raycaster;
    private mouseWorldPosition: THREE.Vector3;
    private texture: THREE.Texture;

    constructor(el: HTMLCanvasElement) {
        this.el = el;
        this.time = 0;
        this.init();
    }

    private async init() {
        this.THREE = await import("three");

        this.mousePosition = new this.THREE.Vector2(0, 0);
        this.raycaster = new this.THREE.Raycaster();
        this.mouseWorldPosition = new this.THREE.Vector3(0, 0, 0);

        this.texture = await new this.THREE.TextureLoader().loadAsync("../public/snow.webp");

        // Initialize Three.js components
        this.initRenderer();
        this.initScene();
        this.initCamera();

        if (
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            )
        ) {
            this.camera.far = 500; // Reduce draw distance
            this.camera.updateProjectionMatrix();
            this.renderer.setPixelRatio(1); // Force lower pixel ratio
        }

        this.createSnowParticles();
        this.addEventListeners();
        this.animate();
    }

    private initRenderer(): void {
        this.renderer = new this.THREE.WebGLRenderer({
            canvas: this.el,
            alpha: true,
            antialias: false,
        });

        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private initScene(): void {
        this.scene = new this.THREE.Scene();
    }

    private initCamera(): void {
        this.camera = new this.THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 50;
    }

    private createSnowParticles(): void {
        const isMobile = window.innerWidth < 768;
        const aspectRatio = window.innerWidth / window.innerHeight;

        const particleCount = isMobile ? 2000 : 5000;
        const geometry = new this.THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const scales = new Float32Array(particleCount);
        const randomFactors = new Float32Array(particleCount * 3);

        // Calculate the visible area based on camera FOV and distance
        const fov = this.camera.fov;
        const distance = this.camera.position.z; // Camera distance from origin
        const vFov = (fov * Math.PI) / 180; // Convert to radians
        const height = 2 * Math.tan(vFov / 2) * distance;
        const width = height * aspectRatio;

        for (let i = 0; i < particleCount; i++) {
            // Spread particles across the visible area
            positions[i * 3] = (Math.random() - 0.5) * width; // X position
            positions[i * 3 + 1] = (Math.random() - 0.5) * height; // Y position
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50; // Z position (depth)

            scales[i] = Math.random() * 2 + 0.5;

            randomFactors[i * 3] = Math.random() * 2 - 1;
            randomFactors[i * 3 + 1] = Math.random() + 0.5;
            randomFactors[i * 3 + 2] = Math.random() * 2 - 1;
        }

        geometry.setAttribute("position", new this.THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("scale", new this.THREE.BufferAttribute(scales, 1));
        geometry.setAttribute("randomFactors", new this.THREE.BufferAttribute(randomFactors, 3));

        const material = new this.THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                mousePosition: { value: new this.THREE.Vector3() },
                pixelRatio: { value: this.renderer.getPixelRatio() },
                mouseRadius: { value: 20.0 },
                chargePower: { value: 0.0 },
                focusTransition: { value: 1.0 },
                uTexture: { value: this.texture },
                screenSize: {
                    value: new this.THREE.Vector2(window.innerWidth, window.innerHeight),
                },
            },
            vertexShader: `
               uniform float time;
                uniform vec3 mousePosition;
                uniform float mouseRadius;
                uniform float chargePower;
                uniform float focusTransition;
                uniform vec2 screenSize;

                attribute float scale;
                attribute vec3 randomFactors;

                varying vec3 vColor;
                varying float vFocusTransition;


                void main() {
                    vec3 pos = position;
                    
                    // Basic snow movement
                    float snowFallSpeed = randomFactors.y;
                    float horizontalDrift = randomFactors.x;
                    float swirlFactor = randomFactors.z;
                    
                    // Add blur effect when unfocused
                    float blurOffset = (1.0 - focusTransition) * sin(time * 2.0 + pos.y) * 20.0;
                    pos.x += blurOffset * randomFactors.x;
                    pos.y = mod(pos.y - time * snowFallSpeed * 2.0 * (0.5 + 0.5 * focusTransition), 50.0) - 25.0;
                    float sway = sin(time * 0.5 + pos.y * 0.1) * horizontalDrift;
                    pos.x += sway * 0.5;
                    
                    // Enhanced mouse interaction with charge
                    vec3 toMouse = mousePosition - pos;
                    float distToMouse = length(toMouse);
                    float chargeRadius = mouseRadius * (1.0 + chargePower * 2.0);
                    
                    if (distToMouse < chargeRadius && focusTransition > 0.5) {
                        float strength = 1.0 - (distToMouse / chargeRadius);
                        strength = smoothstep(0.0, 1.0, strength) * chargePower;
                        
                        vec3 perpendicular = normalize(vec3(-toMouse.y, toMouse.x, 0.0));
                        vec3 repelDir = normalize(pos - mousePosition);
                        
                        vec3 movement = mix(perpendicular, repelDir, 0.5) * strength * 10.0;
                        pos += movement;
                    }

                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    
                    // Scale points based on charge and focus
                    float chargeScale = 1.0 + chargePower * 1.5;
                    float focusScale = 1.0 + (1.0 - focusTransition) * 2.0; // Particles get bigger when blurred
                    float screenFactor = min(screenSize.x, screenSize.y) / 1000.0;
                    gl_PointSize = scale * 100.0 * chargeScale * focusScale * screenFactor * (1.0 / -mvPosition.z);

                    // Pass focus transition to fragment shader
                    vFocusTransition = focusTransition;
                    
                    float chargeInfluence = smoothstep(chargeRadius, 0.0, distToMouse);
                    vColor = vec3(0.1 + chargeInfluence * chargePower * focusTransition);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vFocusTransition;
                uniform sampler2D uTexture;
                uniform vec2 screenSize;

                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    vec4 txt = texture(uTexture, gl_PointCoord);
                    
                    
                    float inner = smoothstep(0.1, 0.2, dist);
                    vec3 color = txt.rgb;
                    vec3 mixColor = vec3(0.0);
                    float alpha = vColor.x;

                    if(screenSize.x < 768.) {
                        alpha *= 3.2;
                    } 

                    // Add slight color adjustment when blurred
                    color = mix(color, mixColor, 1.0 - vFocusTransition);
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: this.THREE.AdditiveBlending,
        });

        this.particles = new this.THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    private handleMouseDown(e: MouseEvent): void {
        this.isCharging = true;
    }

    private handleMouseUp(e: MouseEvent): void {
        this.isCharging = false;
    }

    private handleTouchStart(e: TouchEvent): void {
        this.isCharging = true;
        this.handleTouchMove(e); // Update position immediately
    }

    private handleTouchMove(e: TouchEvent): void {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.mousePosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mousePosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mousePosition, this.camera);
            const intersectPlane = new this.THREE.Plane(new this.THREE.Vector3(0, 0, 1), 0);
            const mouseWorldPos = new this.THREE.Vector3();
            this.raycaster.ray.intersectPlane(intersectPlane, mouseWorldPos);

            if (this.particles.material instanceof this.THREE.ShaderMaterial) {
                const material = this.particles.material as THREE.ShaderMaterial;
                material.uniforms.mousePosition.value.copy(mouseWorldPos);
            }
        }
    }
    private handleTouchEnd(e: TouchEvent): void {
        this.isCharging = false;
    }

    private addEventListeners(): void {
        window.addEventListener("touchstart", this.handleTouchStart.bind(this), {
            passive: false,
        });
        window.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
        window.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: false });

        window.addEventListener("resize", this.onResize.bind(this));
        window.addEventListener("mousemove", this.onMouseMove.bind(this));
        window.addEventListener("mouseup", this.handleMouseUp.bind(this));
        window.addEventListener("mousedown", this.handleMouseDown.bind(this));
        window.addEventListener("focus", this.handleFocus.bind(this));
        window.addEventListener("blur", this.handleBlur.bind(this));
    }

    private handleFocus(): void {
        this.isFocused = true;
    }

    private handleBlur(): void {
        this.isFocused = false;
        this.isCharging = false; // Reset charging state when window loses focus
    }

    private onResize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        // Update screen size uniform
        if (this.particles.material instanceof this.THREE.ShaderMaterial) {
            // @ts-ignore
            this.particles.material.uniforms.screenSize.value.set(width, height);
        }
    }

    private onMouseMove(event: MouseEvent): void {
        // Update normalized mouse coordinates
        this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update world position
        this.raycaster.setFromCamera(this.mousePosition, this.camera);
        const intersectPlane = new this.THREE.Plane(new this.THREE.Vector3(0, 0, 1), 0);
        const mouseWorldPos = new this.THREE.Vector3();
        this.raycaster.ray.intersectPlane(intersectPlane, mouseWorldPos);

        // Update shader uniform
        if (this.particles.material instanceof this.THREE.ShaderMaterial) {
            // @ts-ignore
            this.particles.material.uniforms.mousePosition.value.copy(mouseWorldPos);
        }
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));

        // Update focus transition
        if (this.isFocused) {
            this.focusTransition = Math.min(
                this.focusTransition + this.FOCUS_TRANSITION_SPEED * 0.016,
                1.0
            );
        } else {
            this.focusTransition = Math.max(
                this.focusTransition - this.FOCUS_TRANSITION_SPEED * 0.016,
                0.0
            );
        }

        // Update charge power
        if (this.isCharging && this.isFocused) {
            this.chargePower = Math.min(
                this.chargePower + this.CHARGE_RATE * 0.016,
                this.MAX_CHARGE
            );
        } else {
            this.chargePower = Math.max(this.chargePower - this.DISCHARGE_RATE * 0.016, 0);
        }

        this.time += 0.01;

        if (this.particles.material instanceof this.THREE.ShaderMaterial) {
            // @ts-ignore
            this.particles.material.uniforms.time.value = this.time;
            // @ts-ignore
            this.particles.material.uniforms.chargePower.value = this.chargePower;
            // @ts-ignore
            this.particles.material.uniforms.focusTransition.value = this.focusTransition;
        }

        this.renderer.render(this.scene, this.camera);
    }

    // Public method to clean up resources
    public dispose(): void {
        this.scene.remove(this.particles);
        this.particles.geometry.dispose();
        if (this.particles.material instanceof this.THREE.Material) {
            // @ts-ignore
            this.particles.material.dispose();
        }
        this.renderer.dispose();
    }
}

export default HeroSketch;
