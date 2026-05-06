import { defineUserConfig } from "./platforms/base";

export default defineUserConfig({
    platform: "web",

    features: {
        spine: true,
        spineVersion: "3.8",
        dragonBones: false,
        marionette: true,
        proceduralAnimation: false,
        vendorGoogle: false,
        physics: false,
        physics2D: true,
        particle: true,
        particle2D: true,
        skeletalAnimation: true,
    },

    build: {
        debug: false,
        sourceMap: true,
        minify: true,
    },
});
