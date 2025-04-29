interface PowerUpEffects {
  [key: string]: any;
}

class PowerUp {
  type: string;
  effects: PowerUpEffects;

  constructor(type: string, effects: PowerUpEffects = {}) {
    this.type = type;
    this.effects = effects;
  }
}

export default PowerUp; 