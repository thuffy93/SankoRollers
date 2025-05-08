/**
 * ShotPanelUI - Visual UI element for guide length selection
 * 
 * This class creates and manages the UI for the shot panel that appears
 * during Phase 2 of the shot process, allowing the player to toggle
 * between short and long guides.
 */
export class ShotPanelUI {
  private panelElement: HTMLElement | null = null;
  private guideTextElement: HTMLElement | null = null;
  private isVisible: boolean = false;
  private currentGuide: 'SHORT' | 'LONG' = 'SHORT';
  
  /**
   * Constructor
   */
  constructor() {
    this.createShotPanel();
  }
  
  /**
   * Create the shot panel UI element
   */
  private createShotPanel(): void {
    // Create a container for the shot panel
    const shotPanel = document.createElement('div');
    shotPanel.id = 'shot-panel';
    shotPanel.style.position = 'absolute';
    shotPanel.style.bottom = '100px';
    shotPanel.style.left = '50%';
    shotPanel.style.transform = 'translateX(-50%)';
    shotPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    shotPanel.style.color = 'white';
    shotPanel.style.padding = '15px 25px';
    shotPanel.style.borderRadius = '8px';
    shotPanel.style.fontFamily = 'Arial, sans-serif';
    shotPanel.style.zIndex = '1000';
    shotPanel.style.display = 'none';
    shotPanel.style.textAlign = 'center';
    shotPanel.style.minWidth = '200px';
    shotPanel.style.border = '2px solid #44aaff';
    shotPanel.style.boxShadow = '0 0 15px rgba(68, 170, 255, 0.4)';
    
    // Add guide selection text
    const guideText = document.createElement('div');
    guideText.id = 'guide-text';
    guideText.style.fontSize = '22px';
    guideText.style.fontWeight = 'bold';
    guideText.style.marginBottom = '10px';
    guideText.innerText = 'SHORT GUIDE';
    guideText.style.color = '#44aaff';
    
    // Add visual guide indicator
    const guideIndicator = document.createElement('div');
    guideIndicator.style.display = 'flex';
    guideIndicator.style.justifyContent = 'center';
    guideIndicator.style.marginBottom = '15px';
    
    // Short guide indicator
    const shortIndicator = document.createElement('div');
    shortIndicator.style.width = '40px';
    shortIndicator.style.height = '8px';
    shortIndicator.style.backgroundColor = '#44aaff';
    shortIndicator.style.borderRadius = '4px';
    shortIndicator.style.margin = '0 5px';
    
    // Long guide indicator
    const longIndicator = document.createElement('div');
    longIndicator.style.width = '80px';
    longIndicator.style.height = '8px';
    longIndicator.style.backgroundColor = '#444';
    longIndicator.style.borderRadius = '4px';
    longIndicator.style.margin = '0 5px';
    longIndicator.id = 'long-guide-indicator';
    
    // Add controls hint
    const controlsHint = document.createElement('div');
    controlsHint.style.fontSize = '14px';
    controlsHint.style.opacity = '0.9';
    controlsHint.innerHTML = 'Press <span class="key">↑</span><span class="key">↓</span> to toggle | <span class="key">S</span> to confirm';
    
    // Style the key spans
    const keyStyle = document.createElement('style');
    keyStyle.textContent = `
      #shot-panel .key {
        display: inline-block;
        background-color: #333;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 2px 6px;
        margin: 0 2px;
        font-family: monospace;
        font-size: 12px;
      }
    `;
    document.head.appendChild(keyStyle);
    
    // Store references
    this.panelElement = shotPanel;
    this.guideTextElement = guideText;
    
    // Assemble the elements
    guideIndicator.appendChild(shortIndicator);
    guideIndicator.appendChild(longIndicator);
    shotPanel.appendChild(guideText);
    shotPanel.appendChild(guideIndicator);
    shotPanel.appendChild(controlsHint);
    document.body.appendChild(shotPanel);
  }
  
  /**
   * Show the shot panel
   */
  public show(): void {
    if (!this.panelElement) return;
    
    this.panelElement.style.display = 'block';
    this.isVisible = true;
  }
  
  /**
   * Hide the shot panel
   */
  public hide(): void {
    if (!this.panelElement) return;
    
    this.panelElement.style.display = 'none';
    this.isVisible = false;
  }
  
  /**
   * Toggle the guide length selection
   * @returns The new guide length
   */
  public toggleGuide(): 'SHORT' | 'LONG' {
    this.currentGuide = this.currentGuide === 'SHORT' ? 'LONG' : 'SHORT';
    this.updateGuideDisplay();
    return this.currentGuide;
  }
  
  /**
   * Set the guide length directly
   * @param guideLength The guide length to set
   */
  public setGuide(guideLength: 'SHORT' | 'LONG'): void {
    this.currentGuide = guideLength;
    this.updateGuideDisplay();
  }
  
  /**
   * Get the current guide length
   */
  public getGuideLength(): 'SHORT' | 'LONG' {
    return this.currentGuide;
  }
  
  /**
   * Update the visual display based on current guide selection
   */
  private updateGuideDisplay(): void {
    // Update text
    if (this.guideTextElement) {
      this.guideTextElement.innerText = `${this.currentGuide} GUIDE`;
    }
    
    // Update indicators
    const shortIndicator = this.panelElement?.querySelector('div > div:first-child') as HTMLElement;
    const longIndicator = document.getElementById('long-guide-indicator') as HTMLElement;
    
    if (shortIndicator && longIndicator) {
      if (this.currentGuide === 'SHORT') {
        shortIndicator.style.backgroundColor = '#44aaff';
        longIndicator.style.backgroundColor = '#444';
      } else {
        shortIndicator.style.backgroundColor = '#444';
        longIndicator.style.backgroundColor = '#44aaff';
      }
    }
  }
  
  /**
   * Check if the panel is currently visible
   */
  public isShown(): boolean {
    return this.isVisible;
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.panelElement && this.panelElement.parentNode) {
      this.panelElement.parentNode.removeChild(this.panelElement);
    }
    
    this.panelElement = null;
    this.guideTextElement = null;
  }
} 