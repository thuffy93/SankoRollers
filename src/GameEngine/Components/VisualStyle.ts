interface VisualStyleSettings {
  [key: string]: any;
}

class VisualStyle {
  settings: VisualStyleSettings;

  constructor(settings: VisualStyleSettings = {}) {
    this.settings = settings;
  }
}

export default VisualStyle; 