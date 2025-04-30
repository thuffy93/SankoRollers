import { HTMLUIComponent } from './HTMLUIComponent';
import { UIState } from '../UIManager';

/**
 * Game settings interface
 */
export interface GameSettings {
  soundVolume: number;
  musicVolume: number;
  showFPS: boolean;
  highPerformanceMode: boolean;
  showHints: boolean;
  controlScheme: 'classic' | 'modern';
}

/**
 * Represents the settings UI component
 */
export class SettingsUI extends HTMLUIComponent {
  // HTML elements
  private menuContainer!: HTMLElement;
  private title!: HTMLElement;
  private settingsForm!: HTMLElement;
  private buttonContainer!: HTMLElement;
  private saveButton!: HTMLElement;
  private cancelButton!: HTMLElement;
  private resetButton!: HTMLElement;
  
  // Settings inputs
  private soundVolumeSlider!: HTMLInputElement;
  private musicVolumeSlider!: HTMLInputElement;
  private showFPSToggle!: HTMLInputElement;
  private highPerformanceModeToggle!: HTMLInputElement;
  private showHintsToggle!: HTMLInputElement;
  private controlSchemeSelect!: HTMLSelectElement;
  
  // Settings data
  private settings: GameSettings = {
    soundVolume: 0.8,
    musicVolume: 0.5,
    showFPS: false,
    highPerformanceMode: false,
    showHints: true,
    controlScheme: 'modern'
  };
  
  // Callback for state transitions and settings changes
  private onStateChangeRequest: (state: UIState) => void;
  private onSettingsChange: (settings: GameSettings) => void;
  
  // Event handler references
  private boundSaveHandler: () => void;
  private boundCancelHandler: () => void;
  private boundResetHandler: () => void;
  
  /**
   * Create a new SettingsUI component
   * @param container Parent container element
   * @param onStateChangeRequest Callback for when a menu button requests a state change
   * @param onSettingsChange Callback for when settings are changed
   */
  constructor(
    container: HTMLElement, 
    onStateChangeRequest: (state: UIState) => void,
    onSettingsChange: (settings: GameSettings) => void
  ) {
    super(container, 'settings-ui');
    this.onStateChangeRequest = onStateChangeRequest;
    this.onSettingsChange = onSettingsChange;
    
    // Pre-bind event handlers to maintain references for cleanup
    this.boundSaveHandler = this.handleSave.bind(this);
    this.boundCancelHandler = this.handleCancel.bind(this);
    this.boundResetHandler = this.handleReset.bind(this);
    
    this.initialize();
  }
  
  /**
   * Initialize the component
   */
  protected initialize(): void {
    // Create menu container
    this.menuContainer = this.createElement('div', 'settings ui-panel');
    
    // Create title
    this.title = this.createElement('h2', 'settings-title', 'Game Settings');
    this.menuContainer.appendChild(this.title);
    
    // Create settings form
    this.settingsForm = this.createElement('form', 'settings-form');
    this.menuContainer.appendChild(this.settingsForm);
    
    // Create settings controls
    this.createSettingsControls();
    
    // Create button container
    this.buttonContainer = this.createElement('div', 'button-container');
    this.menuContainer.appendChild(this.buttonContainer);
    
    // Create buttons
    this.saveButton = this.createButton('Save & Apply', 'save-settings-btn');
    this.buttonContainer.appendChild(this.saveButton);
    
    this.cancelButton = this.createButton('Cancel', 'cancel-settings-btn');
    this.buttonContainer.appendChild(this.cancelButton);
    
    this.resetButton = this.createButton('Reset to Defaults', 'reset-settings-btn');
    this.buttonContainer.appendChild(this.resetButton);
    
    // Add event listeners
    this.addEventListeners();
    
    // Apply styles
    this.applyMenuStyles();
  }
  
  /**
   * Create settings form controls
   */
  private createSettingsControls(): void {
    // Sound volume slider
    const soundVolumeGroup = this.createFormGroup('Sound Volume');
    this.soundVolumeSlider = this.createSlider('sound-volume', 0, 1, 0.1, this.settings.soundVolume);
    soundVolumeGroup.appendChild(this.soundVolumeSlider);
    this.settingsForm.appendChild(soundVolumeGroup);
    
    // Music volume slider
    const musicVolumeGroup = this.createFormGroup('Music Volume');
    this.musicVolumeSlider = this.createSlider('music-volume', 0, 1, 0.1, this.settings.musicVolume);
    musicVolumeGroup.appendChild(this.musicVolumeSlider);
    this.settingsForm.appendChild(musicVolumeGroup);
    
    // Show FPS toggle
    const showFPSGroup = this.createFormGroup('Show FPS Counter');
    this.showFPSToggle = this.createToggle('show-fps', this.settings.showFPS);
    showFPSGroup.appendChild(this.showFPSToggle);
    this.settingsForm.appendChild(showFPSGroup);
    
    // High performance mode toggle
    const highPerformanceModeGroup = this.createFormGroup('High Performance Mode');
    this.highPerformanceModeToggle = this.createToggle('high-performance-mode', this.settings.highPerformanceMode);
    highPerformanceModeGroup.appendChild(this.highPerformanceModeToggle);
    this.settingsForm.appendChild(highPerformanceModeGroup);
    
    // Show hints toggle
    const showHintsGroup = this.createFormGroup('Show Gameplay Hints');
    this.showHintsToggle = this.createToggle('show-hints', this.settings.showHints);
    showHintsGroup.appendChild(this.showHintsToggle);
    this.settingsForm.appendChild(showHintsGroup);
    
    // Control scheme select
    const controlSchemeGroup = this.createFormGroup('Control Scheme');
    this.controlSchemeSelect = this.createSelect('control-scheme', [
      { value: 'classic', label: 'Classic Controls' },
      { value: 'modern', label: 'Modern Controls' }
    ], this.settings.controlScheme);
    controlSchemeGroup.appendChild(this.controlSchemeSelect);
    this.settingsForm.appendChild(controlSchemeGroup);
  }
  
  /**
   * Create a form group with a label
   * @param labelText Label text
   * @returns Form group element
   */
  private createFormGroup(labelText: string): HTMLElement {
    const group = this.createElement('div', 'settings-group');
    const label = this.createElement('label', 'settings-label', labelText);
    group.appendChild(label);
    return group;
  }
  
  /**
   * Create a slider input
   * @param id Slider ID
   * @param min Minimum value
   * @param max Maximum value
   * @param step Step value
   * @param value Initial value
   * @returns Slider input element
   */
  private createSlider(id: string, min: number, max: number, step: number, value: number): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.className = 'settings-slider';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    
    // Add an output element to show the current value
    const output = this.createElement('span', 'slider-value', `${Math.round(value * 100)}%`);
    
    // Update the output when the slider changes
    slider.addEventListener('input', () => {
      output.textContent = `${Math.round(parseFloat(slider.value) * 100)}%`;
    });
    
    // Create a container for the slider and value
    const container = this.createElement('div', 'slider-container');
    container.appendChild(slider);
    container.appendChild(output);
    
    return slider;
  }
  
  /**
   * Create a toggle switch input
   * @param id Toggle ID
   * @param checked Initial checked state
   * @returns Toggle input element
   */
  private createToggle(id: string, checked: boolean): HTMLInputElement {
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = id;
    toggle.className = 'settings-toggle';
    toggle.checked = checked;
    
    // Create a switch label for styling
    const switchLabel = this.createElement('label', 'switch') as HTMLLabelElement;
    switchLabel.htmlFor = id;
    
    const slider = this.createElement('span', 'slider');
    switchLabel.appendChild(toggle);
    switchLabel.appendChild(slider);
    
    return toggle;
  }
  
  /**
   * Create a select dropdown
   * @param id Select ID
   * @param options Select options
   * @param value Initial value
   * @returns Select element
   */
  private createSelect(
    id: string, 
    options: Array<{ value: string, label: string }>, 
    value: string
  ): HTMLSelectElement {
    const select = document.createElement('select');
    select.id = id;
    select.className = 'settings-select';
    
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      optionElement.selected = option.value === value;
      select.appendChild(optionElement);
    });
    
    return select;
  }
  
  /**
   * Create a button
   * @param text Button text
   * @param id Button ID
   * @returns Button element
   */
  private createButton(text: string, id: string): HTMLElement {
    const button = this.createElement('button', 'ui-button settings-button', text);
    button.id = id;
    return button;
  }
  
  /**
   * Add event listeners to buttons
   */
  private addEventListeners(): void {
    this.saveButton.addEventListener('click', this.boundSaveHandler);
    this.cancelButton.addEventListener('click', this.boundCancelHandler);
    this.resetButton.addEventListener('click', this.boundResetHandler);
    
    // Prevent form submission
    this.settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSave();
    });
  }
  
  /**
   * Remove event listeners from buttons
   */
  private removeEventListeners(): void {
    this.saveButton.removeEventListener('click', this.boundSaveHandler);
    this.cancelButton.removeEventListener('click', this.boundCancelHandler);
    this.resetButton.removeEventListener('click', this.boundResetHandler);
    
    // Remove form submit listener
    this.settingsForm.removeEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSave();
    });
  }
  
  /**
   * Handle save button click
   */
  private handleSave(): void {
    // Update settings from form values
    this.settings.soundVolume = parseFloat(this.soundVolumeSlider.value);
    this.settings.musicVolume = parseFloat(this.musicVolumeSlider.value);
    this.settings.showFPS = this.showFPSToggle.checked;
    this.settings.highPerformanceMode = this.highPerformanceModeToggle.checked;
    this.settings.showHints = this.showHintsToggle.checked;
    this.settings.controlScheme = this.controlSchemeSelect.value as 'classic' | 'modern';
    
    // Notify of settings change
    this.onSettingsChange(this.settings);
    
    // Return to previous screen
    this.onStateChangeRequest(UIState.MAIN_MENU);
  }
  
  /**
   * Handle cancel button click
   */
  private handleCancel(): void {
    // Return to previous screen without saving
    this.onStateChangeRequest(UIState.MAIN_MENU);
  }
  
  /**
   * Handle reset button click
   */
  private handleReset(): void {
    // Reset to default settings
    this.settings = {
      soundVolume: 0.8,
      musicVolume: 0.5,
      showFPS: false,
      highPerformanceMode: false,
      showHints: true,
      controlScheme: 'modern'
    };
    
    // Update form controls
    this.soundVolumeSlider.value = this.settings.soundVolume.toString();
    this.musicVolumeSlider.value = this.settings.musicVolume.toString();
    this.showFPSToggle.checked = this.settings.showFPS;
    this.highPerformanceModeToggle.checked = this.settings.highPerformanceMode;
    this.showHintsToggle.checked = this.settings.showHints;
    this.controlSchemeSelect.value = this.settings.controlScheme;
    
    // Update slider value displays
    const soundValueDisplay = this.soundVolumeSlider.nextElementSibling;
    if (soundValueDisplay) {
      soundValueDisplay.textContent = `${Math.round(this.settings.soundVolume * 100)}%`;
    }
    
    const musicValueDisplay = this.musicVolumeSlider.nextElementSibling;
    if (musicValueDisplay) {
      musicValueDisplay.textContent = `${Math.round(this.settings.musicVolume * 100)}%`;
    }
  }
  
  /**
   * Set the current settings
   * @param settings Game settings
   */
  public setSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    
    // Update form controls
    this.soundVolumeSlider.value = this.settings.soundVolume.toString();
    this.musicVolumeSlider.value = this.settings.musicVolume.toString();
    this.showFPSToggle.checked = this.settings.showFPS;
    this.highPerformanceModeToggle.checked = this.settings.highPerformanceMode;
    this.showHintsToggle.checked = this.settings.showHints;
    this.controlSchemeSelect.value = this.settings.controlScheme;
    
    // Update slider value displays
    const soundValueDisplay = this.soundVolumeSlider.nextElementSibling;
    if (soundValueDisplay) {
      soundValueDisplay.textContent = `${Math.round(this.settings.soundVolume * 100)}%`;
    }
    
    const musicValueDisplay = this.musicVolumeSlider.nextElementSibling;
    if (musicValueDisplay) {
      musicValueDisplay.textContent = `${Math.round(this.settings.musicVolume * 100)}%`;
    }
  }
  
  /**
   * Apply styles to the menu components
   */
  private applyMenuStyles(): void {
    // Container styles
    this.menuContainer.style.display = 'flex';
    this.menuContainer.style.flexDirection = 'column';
    this.menuContainer.style.alignItems = 'center';
    this.menuContainer.style.padding = '30px';
    this.menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    this.menuContainer.style.borderRadius = '10px';
    this.menuContainer.style.color = 'white';
    this.menuContainer.style.gap = '20px';
    this.menuContainer.style.position = 'absolute';
    this.menuContainer.style.top = '50%';
    this.menuContainer.style.left = '50%';
    this.menuContainer.style.transform = 'translate(-50%, -50%)';
    this.menuContainer.style.minWidth = '350px';
    this.menuContainer.style.maxWidth = '600px';
    this.menuContainer.style.width = '90%';
    this.menuContainer.style.maxHeight = '80vh';
    this.menuContainer.style.overflowY = 'auto';
    
    // Title styles
    this.title.style.fontSize = '28px';
    this.title.style.marginBottom = '20px';
    this.title.style.color = '#64b5f6';
    this.title.style.textShadow = '0 0 5px rgba(100, 181, 246, 0.5)';
    
    // Form styles
    this.settingsForm.style.width = '100%';
    
    // Button container styles
    this.buttonContainer.style.display = 'flex';
    this.buttonContainer.style.justifyContent = 'space-between';
    this.buttonContainer.style.width = '100%';
    this.buttonContainer.style.marginTop = '20px';
    
    // Save button styles
    this.saveButton.style.backgroundColor = 'rgba(76, 175, 80, 0.8)';
    
    // Cancel button styles
    this.cancelButton.style.backgroundColor = 'rgba(158, 158, 158, 0.8)';
    
    // Reset button styles
    this.resetButton.style.backgroundColor = 'rgba(244, 67, 54, 0.8)';
    
    // Apply CSS styles
    const style = document.createElement('style');
    style.textContent = `
      .settings-group {
        margin-bottom: 15px;
        width: 100%;
        padding: 10px;
        background-color: rgba(50, 50, 50, 0.5);
        border-radius: 5px;
      }
      
      .settings-label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
      }
      
      .settings-slider {
        width: 80%;
        -webkit-appearance: none;
        appearance: none;
        height: 8px;
        background: #444;
        outline: none;
        border-radius: 4px;
        display: inline-block;
      }
      
      .settings-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: #64b5f6;
        border-radius: 50%;
        cursor: pointer;
      }
      
      .settings-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #64b5f6;
        border-radius: 50%;
        cursor: pointer;
      }
      
      .slider-container {
        display: flex;
        align-items: center;
      }
      
      .slider-value {
        margin-left: 10px;
        min-width: 40px;
        text-align: right;
      }
      
      /* Toggle switch styles */
      .switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
      }
      
      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #444;
        transition: .4s;
        border-radius: 24px;
      }
      
      .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }
      
      input:checked + .slider {
        background-color: #64b5f6;
      }
      
      input:checked + .slider:before {
        transform: translateX(26px);
      }
      
      .settings-select {
        width: 100%;
        padding: 8px;
        border-radius: 4px;
        background-color: #444;
        color: white;
        border: none;
        outline: none;
      }
      
      .settings-select option {
        background-color: #333;
      }
      
      .settings-button {
        min-width: 120px;
      }
    `;
    
    this.element.appendChild(style);
  }
  
  /**
   * Show animation when displayed
   */
  public show(): void {
    super.show();
    
    // Add entrance animation
    this.menuContainer.style.animation = 'fadeIn 0.3s ease forwards';
  }
  
  /**
   * Hide animation when hidden
   */
  public hide(): void {
    // Add exit animation
    this.menuContainer.style.animation = 'fadeOut 0.3s ease forwards';
    
    // Delay actual hiding until animation completes
    setTimeout(() => {
      super.hide();
    }, 300);
  }
  
  /**
   * Update method - called every frame
   * @param deltaTime Time since last frame
   */
  public update(deltaTime: number): void {
    // No continual updates needed for this component
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public dispose(): void {
    this.removeEventListeners();
    super.dispose();
  }
} 