import React, { useState, useEffect } from 'react';
import { PhysicsConfig } from '../utils/physicsConfig';
import '../styles/PhysicsConfigUI.css';

interface PhysicsConfigUIProps {
  isVisible: boolean;
  onClose: () => void;
  onApply: (newConfig: any) => void;
}

// Create a flexible type for our physics config structure
interface FlexiblePhysicsConfig {
  [category: string]: {
    [parameter: string]: number | boolean | string | { [key: string]: number };
  };
}

/**
 * UI for adjusting physics parameters in real-time
 */
export const PhysicsConfigUI: React.FC<PhysicsConfigUIProps> = ({
  isVisible,
  onClose,
  onApply
}) => {
  // Create a deep copy of the physics config for editing
  const [config, setConfig] = useState<FlexiblePhysicsConfig>(() => 
    JSON.parse(JSON.stringify(PhysicsConfig))
  );
  const [activeTab, setActiveTab] = useState<string>('playerBall');
  
  // Reset config when visibility changes
  useEffect(() => {
    if (isVisible) {
      setConfig(JSON.parse(JSON.stringify(PhysicsConfig)));
    }
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  // Handle input change
  const handleChange = (
    category: string,
    parameter: string,
    value: string | number
  ) => {
    // Convert string inputs to numbers
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    setConfig((prevConfig: FlexiblePhysicsConfig) => ({
      ...prevConfig,
      [category]: {
        ...prevConfig[category],
        [parameter]: numValue
      }
    }));
  };
  
  // Handle nested property change (e.g., gravity.x)
  const handleNestedChange = (
    category: string,
    parent: string,
    parameter: string,
    value: string | number
  ) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    setConfig((prevConfig: FlexiblePhysicsConfig) => {
      // Create a copy of the nested object
      const parentObj = prevConfig[category][parent] as { [key: string]: number };
      
      return {
        ...prevConfig,
        [category]: {
          ...prevConfig[category],
          [parent]: {
            ...parentObj,
            [parameter]: numValue
          }
        }
      };
    });
  };
  
  // Handle apply button
  const handleApply = () => {
    onApply(config);
  };
  
  // Render a section of parameters
  const renderSection = (category: string, title: string) => {
    const categoryConfig = config[category] || {};
    
    return (
      <div className={`physics-section ${activeTab === category ? 'active' : ''}`}>
        <h3>{title}</h3>
        <div className="physics-params">
          {Object.entries(categoryConfig).map(([key, value]) => {
            // Skip rendering nested objects directly
            if (typeof value === 'object') {
              return (
                <div key={key} className="physics-param-group">
                  <h4>{key}</h4>
                  {Object.entries(value as any).map(([nestedKey, nestedValue]) => (
                    <div key={`${key}.${nestedKey}`} className="physics-param">
                      <label>{nestedKey}:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={nestedValue as number}
                        onChange={(e) => handleNestedChange(
                          category, 
                          key, 
                          nestedKey, 
                          e.target.value
                        )}
                      />
                    </div>
                  ))}
                </div>
              );
            }
            
            return (
              <div key={key} className="physics-param">
                <label>{key}:</label>
                <input
                  type="number"
                  step="0.01"
                  value={value as number}
                  onChange={(e) => handleChange(category, key, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="physics-config-ui">
      <div className="physics-header">
        <h2>Physics Configuration</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="physics-tabs">
        <button 
          className={activeTab === 'playerBall' ? 'active' : ''} 
          onClick={() => setActiveTab('playerBall')}
        >
          Ball
        </button>
        <button 
          className={activeTab === 'terrain' ? 'active' : ''} 
          onClick={() => setActiveTab('terrain')}
        >
          Terrain
        </button>
        <button 
          className={activeTab === 'shot' ? 'active' : ''} 
          onClick={() => setActiveTab('shot')}
        >
          Shot
        </button>
        <button 
          className={activeTab === 'world' ? 'active' : ''} 
          onClick={() => setActiveTab('world')}
        >
          World
        </button>
        <button 
          className={activeTab === 'camera' ? 'active' : ''} 
          onClick={() => setActiveTab('camera')}
        >
          Camera
        </button>
      </div>
      
      <div className="physics-content">
        {renderSection('playerBall', 'Ball Physics')}
        {renderSection('terrain', 'Terrain Physics')}
        {renderSection('shot', 'Shot Physics')}
        {renderSection('world', 'World Physics')}
        {renderSection('camera', 'Camera Settings')}
      </div>
      
      <div className="physics-footer">
        <button className="apply-btn" onClick={handleApply}>Apply Changes</button>
        <button className="reset-btn" onClick={() => setConfig(JSON.parse(JSON.stringify(PhysicsConfig)))}>
          Reset
        </button>
      </div>
    </div>
  );
}; 