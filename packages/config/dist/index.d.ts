import fs from 'node:fs';
import { z } from 'zod';
export declare const configSchema: z.ZodObject<{
    adapter: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    language: z.ZodString;
    api: z.ZodObject<{
        url: z.ZodString;
        token: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        token?: string | undefined;
    }, {
        url: string;
        token?: string | undefined;
    }>;
    voice: z.ZodObject<{
        voice: z.ZodOptional<z.ZodString>;
        volume: z.ZodNumber;
        rate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        volume: number;
        rate: number;
        voice?: string | undefined;
    }, {
        volume: number;
        rate: number;
        voice?: string | undefined;
    }>;
    hotkeys: z.ZodObject<{
        muteToggle: z.ZodString;
        volumeUp: z.ZodString;
        volumeDown: z.ZodString;
        repeatLast: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        muteToggle: string;
        volumeUp: string;
        volumeDown: string;
        repeatLast?: string | undefined;
    }, {
        muteToggle: string;
        volumeUp: string;
        volumeDown: string;
        repeatLast?: string | undefined;
    }>;
    filters: z.ZodObject<{
        TRAFFIC: z.ZodBoolean;
        FLAGS: z.ZodBoolean;
        ENGINE: z.ZodBoolean;
        COACHING: z.ZodBoolean;
        SYSTEM: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        TRAFFIC: boolean;
        FLAGS: boolean;
        ENGINE: boolean;
        COACHING: boolean;
        SYSTEM: boolean;
    }, {
        TRAFFIC: boolean;
        FLAGS: boolean;
        ENGINE: boolean;
        COACHING: boolean;
        SYSTEM: boolean;
    }>;
    focusMode: z.ZodBoolean;
    temperatures: z.ZodObject<{
        water: z.ZodObject<{
            warning: z.ZodNumber;
            critical: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            warning: number;
            critical: number;
        }, {
            warning: number;
            critical: number;
        }>;
        oil: z.ZodObject<{
            warning: z.ZodNumber;
            critical: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            warning: number;
            critical: number;
        }, {
            warning: number;
            critical: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        water: {
            warning: number;
            critical: number;
        };
        oil: {
            warning: number;
            critical: number;
        };
    }, {
        water: {
            warning: number;
            critical: number;
        };
        oil: {
            warning: number;
            critical: number;
        };
    }>;
    debug: z.ZodObject<{
        telemetryDump: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        telemetryDump: boolean;
    }, {
        telemetryDump: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    adapter: {
        id: string;
    };
    language: string;
    api: {
        url: string;
        token?: string | undefined;
    };
    voice: {
        volume: number;
        rate: number;
        voice?: string | undefined;
    };
    hotkeys: {
        muteToggle: string;
        volumeUp: string;
        volumeDown: string;
        repeatLast?: string | undefined;
    };
    filters: {
        TRAFFIC: boolean;
        FLAGS: boolean;
        ENGINE: boolean;
        COACHING: boolean;
        SYSTEM: boolean;
    };
    focusMode: boolean;
    temperatures: {
        water: {
            warning: number;
            critical: number;
        };
        oil: {
            warning: number;
            critical: number;
        };
    };
    debug: {
        telemetryDump: boolean;
    };
}, {
    adapter: {
        id: string;
    };
    language: string;
    api: {
        url: string;
        token?: string | undefined;
    };
    voice: {
        volume: number;
        rate: number;
        voice?: string | undefined;
    };
    hotkeys: {
        muteToggle: string;
        volumeUp: string;
        volumeDown: string;
        repeatLast?: string | undefined;
    };
    filters: {
        TRAFFIC: boolean;
        FLAGS: boolean;
        ENGINE: boolean;
        COACHING: boolean;
        SYSTEM: boolean;
    };
    focusMode: boolean;
    temperatures: {
        water: {
            warning: number;
            critical: number;
        };
        oil: {
            warning: number;
            critical: number;
        };
    };
    debug: {
        telemetryDump: boolean;
    };
}>;
export type AppConfig = z.infer<typeof configSchema>;
export declare const defaultConfig: AppConfig;
export declare function getConfigPath(appName?: string): string;
export declare function loadConfig(configPath?: string): AppConfig;
export declare function saveConfig(config: AppConfig, configPath?: string): void;
export declare function updateConfig(partial: any, configPath?: string): AppConfig;
export declare function watchConfig(callback: (config: AppConfig) => void, configPath?: string): fs.FSWatcher;
