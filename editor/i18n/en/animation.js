/* eslint-disable quote-props */
/* eslint-disable camelcase */

/* eslint-disable quote-props */
/* eslint-disable camelcase */

module.exports = {
    classes: {
        'cc': {
            'Animation': {
                'properties': {
                    'clips': {
                        displayName: 'Clips',
                        tooltip: 'All clips this component governs.',
                    },
                    'defaultClip': {
                        displayName: 'Default Clip',
                        tooltip: 'The default clip to play.',
                    },
                    'playOnLoad': {
                        displayName: 'Play On Load',
                        tooltip: 'Whether automatically play the default clip after component loaded.',
                    },
                },
            },
            'SkeletalAnimation': {
                'properties': {
                    __extends__: 'classes.cc.Animation.properties',
                    'sockets': {
                        displayName: 'Sockets',
                        tooltip: 'The joint sockets this animation component maintains. ' +
                            'Sockets have to be registered here before attaching custom nodes to animated joints.',
                    },
                    'useBakedAnimation': {
                        displayName: 'Use Baked Animation',
                        tooltip: `Whether to bake animations. Default to true, ` +
                            `which substantially increases performance while making all animations completely fixed.` +
                            `Dynamically changing this property will take effect when playing the next animation clip.`,
                    },
                },
            },
        },
    },
};
                        'intensityValue': {
                            displayName: 'Intensity',
                        },
                    },
                },
                'PoseNodeCopyTransform': {
                    displayName: 'Copy Transform',
                    title: 'Copy {sourceNodeName}\'s transform to {targetNodeName}',
                    properties: {
                        'sourceNodeName': {
                            displayName: 'Source Node',
                            tooltip: 'Name of the source node.',
                        },
                        'targetNodeName': {
                            displayName: 'Target Node',
                            tooltip: 'Name of the target node.',
                        },
                        'space': {
                            displayName: 'Space',
                            tooltip: 'Specify the transform space in which the transform would be copied.',
                        },
                    },
                    inputs: {
                        __extends__: 'classes.cc.animation.PoseNodeModifyPoseBase.inputs',
                    },
                },
                'PoseNodeSetAuxiliaryCurve': {
                    displayName: 'Set Auxiliary Curve',
                    title: 'Set Auxiliary Curve {curveName}',
                    inputs: {
                        __extends__: 'classes.cc.animation.PoseNodeModifyPoseBase.inputs',
                        'curveValue': {
                            displayName: 'Value',
                        },
                    },
                },
                'PoseNodeTwoBoneIKSolver': {
                    displayName: 'Two Bone IK Solver',
                    title: 'Solve Two Bone IK: {endEffectorBoneName}',
                    properties: {
                        'endEffectorBoneName': {
                            displayName: 'End Effector Bone',
                            tooltip: 'Name of the end effector bone.',
                        },
                        'endEffectorTarget': {
                            displayName: 'End Effector Target',
                            tooltip: 'Specify the end effector\'s target.',
                        },
                        'poleTarget': {
                            displayName: 'Pole Target',
                            tooltip: 'Specify the pole target, ie. the middle bone\'s trending location..',
                        },
                    },
                    inputs: {
                        __extends__: 'classes.cc.animation.PoseNodeModifyPoseBase.inputs',
                        'endEffectorTargetPosition': {
                            displayName: 'End Effector Target',
                        },
                        'poleTargetPosition': {
                            displayName: 'Pole Target',
                        },
                        'intensityValue': {
                            displayName: 'Intensity',
                        },
                    },
                    'TargetSpecification': {
                        properties: {
                            'type': {
                                displayName: 'Type',
                                tooltip: 'Target type.',
                            },
                            'targetPosition': {
                                displayName: 'Target Position',
                                tooltip: 'Target position.',
                            },
                            'targetPositionSpace': {
                                displayName: 'Target Position Space',
                                tooltip: 'Space of the target position.',
                            },
                            'targetBone': {
                                displayName: 'Target Bone',
                                tooltip: 'Name of target bone.',
                            },
                        },
                    },
                },

                'PVNodeGetVariableBase': {
                    displayName: 'Get Variable',
                    title: 'Variable {variableName}',
                },
            },
        },
    },
};
