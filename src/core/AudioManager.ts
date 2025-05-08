/**
 * Interface for audio options
 */
interface AudioOptions {
  volume?: number;
  loop?: boolean;
  autoplay?: boolean;
}

/**
 * AudioManager - Handles loading and playing audio
 */
export class AudioManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private currentMusic: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private musicVolume: number = 0.5;
  private effectsVolume: number = 0.7;
  
  /**
   * Constructor
   */
  constructor() {
    // Initialize Web Audio API context if needed
    this.initAudioContext();
  }
  
  /**
   * Initialize Web Audio API context
   * This is needed for some browsers that require user interaction
   */
  private initAudioContext(): void {
    // Create a temporary audio context
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    
    if (AudioContext) {
      const context = new AudioContext();
      
      // Resume context on user interaction
      const resumeAudio = () => {
        if (context.state !== 'running') {
          context.resume();
        }
        
        // Remove event listeners after first interaction
        document.removeEventListener('click', resumeAudio);
        document.removeEventListener('touchstart', resumeAudio);
        document.removeEventListener('keydown', resumeAudio);
      };
      
      // Add event listeners
      document.addEventListener('click', resumeAudio);
      document.addEventListener('touchstart', resumeAudio);
      document.addEventListener('keydown', resumeAudio);
    }
  }
  
  /**
   * Load a sound file
   */
  public loadSound(
    key: string, 
    url: string, 
    onSuccess?: () => void, 
    onError?: (error: any) => void
  ): void {
    // Create audio element
    const audio = new Audio();
    
    // Set up event listeners
    audio.addEventListener('canplaythrough', () => {
      // Add to sounds map
      this.sounds.set(key, audio);
      
      // Call success callback
      if (onSuccess) onSuccess();
    }, { once: true });
    
    audio.addEventListener('error', (error) => {
      // Call error callback
      if (onError) onError(error);
    });
    
    // Set source and load
    audio.src = url;
    audio.load();
  }
  
  /**
   * Play a sound effect
   */
  public playSound(key: string, options: AudioOptions = {}): void {
    // Check if sound exists
    if (!this.sounds.has(key)) {
      console.warn(`AudioManager: Sound '${key}' not found`);
      return;
    }
    
    // Get sound
    const originalAudio = this.sounds.get(key)!;
    
    // Clone the audio element to allow multiple plays
    const audio = originalAudio.cloneNode() as HTMLAudioElement;
    
    // Set options
    audio.volume = this.isMuted ? 0 : (options.volume !== undefined ? options.volume : this.effectsVolume);
    audio.loop = options.loop || false;
    
    // Play
    audio.play().catch(error => {
      console.warn(`AudioManager: Failed to play sound '${key}'`, error);
    });
    
    // Clean up when sound finishes
    audio.addEventListener('ended', () => {
      // Remove element references for garbage collection
      audio.onended = null;
      audio.onerror = null;
    });
  }
  
  /**
   * Play music
   */
  public playMusic(key: string, options: AudioOptions = {}): void {
    // Check if sound exists
    if (!this.sounds.has(key)) {
      console.warn(`AudioManager: Music '${key}' not found`);
      return;
    }
    
    // Stop current music if playing
    this.stopMusic();
    
    // Get sound
    const audio = this.sounds.get(key)!;
    
    // Set as current music
    this.currentMusic = audio;
    
    // Set options
    audio.volume = this.isMuted ? 0 : (options.volume !== undefined ? options.volume : this.musicVolume);
    audio.loop = options.loop !== undefined ? options.loop : true;
    
    // Play
    audio.play().catch(error => {
      console.warn(`AudioManager: Failed to play music '${key}'`, error);
    });
  }
  
  /**
   * Stop the current music
   */
  public stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
    }
  }
  
  /**
   * Pause the current music
   */
  public pauseMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause();
    }
  }
  
  /**
   * Resume the current music
   */
  public resumeMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.play().catch(error => {
        console.warn('AudioManager: Failed to resume music', error);
      });
    }
  }
  
  /**
   * Set music volume
   */
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    
    // Update current music volume
    if (this.currentMusic && !this.isMuted) {
      this.currentMusic.volume = this.musicVolume;
    }
  }
  
  /**
   * Set effects volume
   */
  public setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
  }
  
  /**
   * Mute all audio
   */
  public mute(): void {
    this.isMuted = true;
    
    // Mute current music
    if (this.currentMusic) {
      this.currentMusic.volume = 0;
    }
  }
  
  /**
   * Unmute all audio
   */
  public unmute(): void {
    this.isMuted = false;
    
    // Restore music volume
    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume;
    }
  }
  
  /**
   * Toggle mute state
   */
  public toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    
    return this.isMuted;
  }
  
  /**
   * Check if audio is muted
   */
  public isMutedState(): boolean {
    return this.isMuted;
  }
} 