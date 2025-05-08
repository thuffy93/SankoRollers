/**
 * BoostIndicator - Visual UI element for showing boost opportunity
 * 
 * This class creates and manages a visual indicator that appears when
 * the player can boost the ball at a bounce point (Phase 4b)
 */
export class BoostIndicator {
  private boostElement: HTMLElement | null = null;
  private timerElement: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private timeRemaining: number = 0;
  private maxTime: number = 0.5; // 500ms window for boost
  private isVisible: boolean = false;
  
  /**
   * Constructor
   */
  constructor() {
    this.createBoostIndicator();
  }
  
  /**
   * Create the boost indicator UI element
   */
  private createBoostIndicator(): void {
    // Create a container for the boost indicator
    const boostContainer = document.createElement('div');
    boostContainer.id = 'boost-indicator';
    boostContainer.style.position = 'absolute';
    boostContainer.style.top = '50%';
    boostContainer.style.left = '50%';
    boostContainer.style.transform = 'translate(-50%, -50%)';
    boostContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    boostContainer.style.borderRadius = '8px';
    boostContainer.style.padding = '15px';
    boostContainer.style.color = 'white';
    boostContainer.style.fontFamily = 'Arial, sans-serif';
    boostContainer.style.textAlign = 'center';
    boostContainer.style.zIndex = '1000';
    boostContainer.style.display = 'none';
    boostContainer.style.border = '2px solid #ffcc00';
    boostContainer.style.boxShadow = '0 0 20px rgba(255, 204, 0, 0.5)';
    
    // Add boost message
    const boostMessage = document.createElement('div');
    boostMessage.innerText = 'BOOST!';
    boostMessage.style.fontSize = '24px';
    boostMessage.style.fontWeight = 'bold';
    boostMessage.style.color = '#ffcc00';
    boostMessage.style.marginBottom = '10px';
    
    // Add key hint
    const keyHint = document.createElement('div');
    keyHint.innerHTML = 'Press <span class="key">B</span> now!';
    keyHint.style.fontSize = '16px';
    keyHint.style.marginBottom = '10px';
    
    // Style the key span
    const keyStyle = document.createElement('style');
    keyStyle.textContent = `
      #boost-indicator .key {
        display: inline-block;
        background-color: #444;
        border: 1px solid #666;
        border-radius: 4px;
        padding: 2px 8px;
        margin: 0 2px;
        font-family: monospace;
        box-shadow: 0 2px 0 #222;
      }
    `;
    document.head.appendChild(keyStyle);
    
    // Create timer bar container
    const timerContainer = document.createElement('div');
    timerContainer.style.width = '100%';
    timerContainer.style.height = '10px';
    timerContainer.style.backgroundColor = '#333';
    timerContainer.style.borderRadius = '5px';
    timerContainer.style.overflow = 'hidden';
    
    // Create timer bar
    const timerBar = document.createElement('div');
    timerBar.style.width = '100%';
    timerBar.style.height = '100%';
    timerBar.style.backgroundColor = '#ffcc00';
    timerBar.style.borderRadius = '5px';
    timerBar.style.transition = 'width linear';
    
    // Store references
    this.progressBar = timerBar;
    this.boostElement = boostContainer;
    
    // Assemble the elements
    timerContainer.appendChild(timerBar);
    boostContainer.appendChild(boostMessage);
    boostContainer.appendChild(keyHint);
    boostContainer.appendChild(timerContainer);
    document.body.appendChild(boostContainer);
  }
  
  /**
   * Show the boost indicator
   * @param position Position of the boost opportunity (screen coordinates)
   * @param duration How long the boost window lasts (seconds)
   */
  public show(position: { x: number, y: number } | null = null, duration: number = 0.5): void {
    if (!this.boostElement) return;
    
    // Store the max time
    this.maxTime = duration;
    this.timeRemaining = duration;
    
    // Position the indicator
    if (position) {
      this.boostElement.style.top = `${position.y}px`;
      this.boostElement.style.left = `${position.x}px`;
    } else {
      // Center on screen by default
      this.boostElement.style.top = '50%';
      this.boostElement.style.left = '50%';
      this.boostElement.style.transform = 'translate(-50%, -50%)';
    }
    
    // Reset timer bar
    if (this.progressBar) {
      this.progressBar.style.width = '100%';
      // Set the transition duration to match the timer duration
      this.progressBar.style.transition = `width ${duration}s linear`;
    }
    
    // Make visible
    this.boostElement.style.display = 'block';
    
    // Start animation
    setTimeout(() => {
      if (this.progressBar) {
        this.progressBar.style.width = '0%';
      }
    }, 50); // Small delay to ensure transition works
    
    this.isVisible = true;
  }
  
  /**
   * Hide the boost indicator
   */
  public hide(): void {
    if (!this.boostElement) return;
    
    this.boostElement.style.display = 'none';
    this.isVisible = false;
  }
  
  /**
   * Update the boost indicator timer
   * @param deltaTime Time since last frame (seconds)
   * @returns true if timer is still active, false if expired
   */
  public update(deltaTime: number): boolean {
    if (!this.isVisible) return false;
    
    this.timeRemaining -= deltaTime;
    
    // Check if timer expired
    if (this.timeRemaining <= 0) {
      this.hide();
      return false;
    }
    
    return true;
  }
  
  /**
   * Pulse the indicator to draw attention during the boost window
   */
  public pulse(): void {
    if (!this.boostElement || !this.isVisible) return;
    
    // Add a pulse animation
    this.boostElement.style.animation = 'none';
    setTimeout(() => {
      if (this.boostElement) {
        this.boostElement.style.animation = 'pulse 0.5s ease-in-out';
      }
    }, 10);
    
    // Add the CSS animation if it doesn't exist
    if (!document.getElementById('boost-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'boost-pulse-animation';
      style.textContent = `
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.boostElement && this.boostElement.parentNode) {
      this.boostElement.parentNode.removeChild(this.boostElement);
    }
    
    this.boostElement = null;
    this.progressBar = null;
  }
} 