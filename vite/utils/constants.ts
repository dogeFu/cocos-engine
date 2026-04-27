export interface FeaturesConfig {
    spine?: boolean;
    spineVersion?: "3.8" | "4.2";
    marionette?: boolean;
}

export function featuresToConstants(
    features: FeaturesConfig | null | undefined,
): Record<string, boolean> {
    if (!features) {
        return {
            SPINE_3_8: false,
            SPINE_4_2: false,
            MARIONETTE: false,
        };
    }

    return {
        SPINE_3_8: features.spine && features.spineVersion === "3.8",
        SPINE_4_2: features.spine && features.spineVersion === "4.2",
        MARIONETTE: features.marionette || false,
    };
}
