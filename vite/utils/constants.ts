export interface FeaturesConfig {
    spine?: boolean;
    spineVersion?: "3.8" | "4.2";
    marionette?: boolean;
    proceduralAnimation?: boolean;
    vendorGoogle?: boolean;
    physics?: boolean;
    physics2D?: boolean;
    particle?: boolean;
    particle2D?: boolean;
    skeletalAnimation?: boolean;
}

export function featuresToConstants(
    features: FeaturesConfig | null | undefined,
): Record<string, boolean | number> {
    if (!features) {
        return {
            SPINE_3_8: false,
            SPINE_4_2: false,
            MARIONETTE: false,
            PROCEDURAL_ANIMATION: false,
            USE_VENDOR_GOOGLE: false,
        };
    }

    return {
        SPINE_3_8: features.spine && features.spineVersion === "3.8",
        SPINE_4_2: features.spine && features.spineVersion === "4.2",
        MARIONETTE: features.marionette || false,
        PROCEDURAL_ANIMATION: features.proceduralAnimation || false,
        USE_VENDOR_GOOGLE: features.vendorGoogle || false,
    };
}
