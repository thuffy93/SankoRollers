/**
 * Simple audio system for game sound effects
 */

export class AudioSystem {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private isMuted: boolean = false;
  private volume: number = 0.5;
  
  /**
   * Initialize the audio system with default sounds
   */
  constructor() {
    // Default sound effects
    this.registerSound('shot', '/assets/sounds/shot.mp3');
    this.registerSound('collision', '/assets/sounds/collision.mp3');
    this.registerSound('goal', '/assets/sounds/goal.mp3');
  }
  
  /**
   * Register a new sound
   * @param id Sound identifier
   * @param url Sound file URL
   */
  public registerSound(id: string, url: string): void {
    // Create audio element
    const audio = new Audio();
    audio.src = url;
    audio.volume = this.volume;
    
    // Store in sounds map
    this.sounds.set(id, audio);
    
    // Preload sound
    audio.load();
  }
  
  /**
   * Play a sound by ID
   * @param id Sound identifier
   * @param options Play options
   */
  public playSound(
    id: string, 
    options: { volume?: number; loop?: boolean } = {}
  ): void {
    // Don't play if muted
    if (this.isMuted) return;
    
    // Get sound from map
    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`Sound "${id}" not found`);
      return;
    }
    
    try {
      // Clone the audio to allow multiple simultaneous plays
      const soundInstance = sound.cloneNode() as HTMLAudioElement;
      
      // Apply options
      if (options.volume !== undefined) {
        soundInstance.volume = options.volume * this.volume;
      }
      soundInstance.loop = options.loop || false;
      
      // Play the sound
      soundInstance.play().catch(error => {
        console.warn(`Error playing sound "${id}":`, error);
      });
    } catch (error) {
      console.warn(`Error playing sound "${id}":`, error);
    }
  }
  
  /**
   * Stop a looping sound
   * @param id Sound identifier
   */
  public stopSound(id: string): void {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }
  
  /**
   * Mute/unmute all sounds
   * @param muted Whether to mute
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }
  
  /**
   * Set master volume
   * @param volume Volume level (0-1)
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    
    // Update all sounds
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
  }
  
  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.sounds.forEach(sound => {
      sound.pause();
      sound.src = '';
    });
    this.sounds.clear();
  }
}

// Create and export a singleton instance
export const audioSystem = new AudioSystem(); 