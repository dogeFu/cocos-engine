import { defineUserConfig } from "./platforms/base";

export default defineUserConfig({
    platform: "web",

    features: {
        spine: true,
        spineVersion: "3.8",
        dragonBones: false,
        marionette: true,
        physics: false,
        physics2D: true,
        skeletalAnimation: true,
    },

    build: {
        debug: false,
        sourceMap: true,
        minify: true,
    },
});
