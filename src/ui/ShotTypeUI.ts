import { ShotType } from '../gameplay/shot/ShotTypes';

/**
 * ShotTypeUI - Visual UI element for shot type selection
 * 
 * This class creates and manages the UI for the shot type selection panel
 * that appears during Phase 0 of the shot process, allowing the player to toggle
 * between grounder and fly shots.
 */
export class ShotTypeUI {
  private panelElement: HTMLElement | null = null;
  private typeTextElement: HTMLElement | null = null;
  private isVisible: boolean = false;
  private currentType: ShotType = ShotType.GROUNDER;
  
  /**
   * Constructor
   */
  constructor() {
    this.createShotTypePanel();
  }
  
  /**
   * Create the shot type selection UI element
   */
  private createShotTypePanel(): void {
    // Create a container for the shot type panel
    const shotTypePanel = document.createElement('div');
    shotTypePanel.id = 'shot-type-panel';
    shotTypePanel.style.position = 'absolute';
    shotTypePanel.style.top = '100px';
    shotTypePanel.style.left = '50%';
    shotTypePanel.style.transform = 'translateX(-50%)';
    shotTypePanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    shotTypePanel.style.color = 'white';
    shotTypePanel.style.padding = '15px 25px';
    shotTypePanel.style.borderRadius = '8px';
    shotTypePanel.style.fontFamily = 'Arial, sans-serif';
    shotTypePanel.style.zIndex = '1000';
    shotTypePanel.style.display = 'none';
    shotTypePanel.style.textAlign = 'center';
    shotTypePanel.style.minWidth = '200px';
    shotTypePanel.style.border = '2px solid #ff44aa';
    shotTypePanel.style.boxShadow = '0 0 15px rgba(255, 68, 170, 0.4)';
    
    // Add shot type selection text
    const typeText = document.createElement('div');
    typeText.id = 'type-text';
    typeText.style.fontSize = '22px';
    typeText.style.fontWeight = 'bold';
    typeText.style.marginBottom = '10px';
    typeText.innerText = 'GROUNDER SHOT';
    typeText.style.color = '#55aaff'; // Blue for grounder
    
    // Add visual type indicators
    const typeIndicatorContainer = document.createElement('div');
    typeIndicatorContainer.style.display = 'flex';
    typeIndicatorContainer.style.justifyContent = 'center';
    typeIndicatorContainer.style.marginBottom = '15px';
    
    // Grounder shot indicator
    const grounderIndicator = document.createElement('div');
    grounderIndicator.id = 'grounder-indicator';
    grounderIndicator.style.width = '60px';
    grounderIndicator.style.height = '10px';
    grounderIndicator.style.backgroundColor = '#55aaff'; // Blue for grounder
    grounderIndicator.style.borderRadius = '5px';
    grounderIndicator.style.margin = '0 5px';
    
    // Fly shot indicator
    const flyIndicator = document.createElement('div');
    flyIndicator.id = 'fly-indicator';
    flyIndicator.style.width = '60px';
    flyIndicator.style.height = '10px';
    flyIndicator.style.backgroundColor = '#444'; // Gray for inactive
    flyIndicator.style.borderRadius = '5px';
    flyIndicator.style.margin = '0 5px';
    
    // Add help text
    const helpText = document.createElement('div');
    helpText.style.fontSize = '14px';
    helpText.style.opacity = '0.8';
    helpText.innerText = 'Press UP/DOWN to change\nSPACE to confirm';
    helpText.style.whiteSpace = 'pre-line';
    
    // Add all elements to the container
    typeIndicatorContainer.appendChild(grounderIndicator);
    typeIndicatorContainer.appendChild(flyIndicator);
    shotTypePanel.appendChild(typeText);
    shotTypePanel.appendChild(typeIndicatorContainer);
    shotTypePanel.appendChild(helpText);
    
    // Add to document body
    document.body.appendChild(shotTypePanel);
    
    // Store references
    this.panelElement = shotTypePanel;
    this.typeTextElement = typeText;
  }
  
  /**
   * Update the visual display to match the current shot type
   */
  private updateTypeDisplay(): void {
    if (!this.typeTextElement || !this.panelElement) return;
    
    // Update text content
    if (this.currentType === ShotType.GROUNDER) {
      this.typeTextElement.innerText = 'GROUNDER SHOT';
      this.typeTextElement.style.color = '#55aaff'; // Blue for grounder
      
      // Update indicators
      const grounderIndicator = this.panelElement.querySelector('#grounder-indicator') as HTMLElement;
      const flyIndicator = this.panelElement.querySelector('#fly-indicator') as HTMLElement;
      
      if (grounderIndicator && flyIndicator) {
        grounderIndicator.style.backgroundColor = '#55aaff'; // Blue for active
        flyIndicator.style.backgroundColor = '#444'; // Gray for inactive
      }
    } else {
      this.typeTextElement.innerText = 'FLY SHOT';
      this.typeTextElement.style.color = '#ff44aa'; // Pink for fly
      
      // Update indicators
      const grounderIndicator = this.panelElement.querySelector('#grounder-indicator') as HTMLElement;
      const flyIndicator = this.panelElement.querySelector('#fly-indicator') as HTMLElement;
      
      if (grounderIndicator && flyIndicator) {
        grounderIndicator.style.backgroundColor = '#444'; // Gray for inactive
        flyIndicator.style.backgroundColor = '#ff44aa'; // Pink for active
      }
    }
  }
  
  /**
   * Show the shot type selection UI
   */
  public show(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'block';
      this.isVisible = true;
      this.updateTypeDisplay();
    }
  }
  
  /**
   * Hide the shot type selection UI
   */
  public hide(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
      this.isVisible = false;
    }
  }
  
  /**
   * Toggle the shot type selection
   * @returns The new shot type
   */
  public toggleType(): ShotType {
    this.currentType = this.currentType === ShotType.GROUNDER ? ShotType.FLY : ShotType.GROUNDER;
    this.updateTypeDisplay();
    return this.currentType;
  }
  
  /**
   * Set the shot type directly
   * @param shotType The shot type to set
   */
  public setType(shotType: ShotType): void {
    this.currentType = shotType;
    this.updateTypeDisplay();
  }
  
  /**
   * Get the current shot type
   */
  public getType(): ShotType {
    return this.currentType;
  }
  
  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.panelElement && this.panelElement.parentNode) {
      this.panelElement.parentNode.removeChild(this.panelElement);
    }
    
    this.panelElement = null;
    this.typeTextElement = null;
  }
} 