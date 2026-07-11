export interface PluginMetadata {
  pluginName: string;
  version: string;
  isActive: boolean;
}

export interface BusinessSensorPayload {
  sensorId: string;
  metricLabel: string;
  rawValue: number | string;
  timestamp: string;
}

export interface DecisionIntelligencePlugin {
  getMetadata(): PluginMetadata;
  harvestMetrics(context: any): Promise<BusinessSensorPayload[]>;
}

// 1. Footfall CCTV Camera Plugin
export class CCTVFootfallPlugin implements DecisionIntelligencePlugin {
  public getMetadata(): PluginMetadata {
    return {
      pluginName: "CCTV Footfall Analytics Adapter",
      version: "1.0.2",
      isActive: true,
    };
  }

  public async harvestMetrics(context: any): Promise<BusinessSensorPayload[]> {
    return [
      {
        sensorId: "cctv-zone-entry",
        metricLabel: "Mall Entry Footfall count",
        rawValue: 1420,
        timestamp: new Date().toISOString(),
      },
    ];
  }
}

// 2. IoT Smart Weather Forecast Plugin
export class WeatherPlugin implements DecisionIntelligencePlugin {
  public getMetadata(): PluginMetadata {
    return {
      pluginName: "IoT Weather Analytics Adapter",
      version: "2.1.0",
      isActive: true,
    };
  }

  public async harvestMetrics(context: any): Promise<BusinessSensorPayload[]> {
    return [
      {
        sensorId: "weather-barometer",
        metricLabel: "Outside Ambient Temperature Celsius",
        rawValue: 34.5,
        timestamp: new Date().toISOString(),
      },
      {
        sensorId: "weather-humidity",
        metricLabel: "Relative Humidity Percentage",
        rawValue: 68,
        timestamp: new Date().toISOString(),
      },
    ];
  }
}
