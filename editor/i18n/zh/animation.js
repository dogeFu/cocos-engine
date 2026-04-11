/* eslint-disable quote-props */
/* eslint-disable camelcase */

module.exports = {
    animation_graph: {
        pose_graph_node_sub_categories: {
            pose_nodes: '姿态结点',
            pose_nodes_blend: '混合',
            pose_nodes_ik: '反向动力学',
            /* eslint-disable quote-props */
            /* eslint-disable camelcase */

            module.exports = {
                classes: {
                    'cc': {
                        'Animation': {
                            'properties': {
                                'clips': {
                                    displayName: '剪辑列表',
                                    tooltip: '此组件管理的所有剪辑。',
                                },
                                'defaultClip': {
                                    displayName: '默认剪辑',
                                    tooltip: '默认播放的剪辑。',
                                },
                                'playOnLoad': {
                                    displayName: '加载后播放',
                                    tooltip: '是否在组件加载完成后自动播放默认剪辑。',
                                },
                            },
                        },
                        'SkeletalAnimation': {
                            'properties': {
                                __extends__: 'classes.cc.Animation.properties',
                                'sockets': {
                                    displayName: '挂点列表',
                                    tooltip: '当前动画组件维护的挂点列表。要挂载自定义节点到受动画驱动的骨骼上，必须先在此注册挂点。',
                                },
                                'useBakedAnimation': {
                                    displayName: '预烘培动画',
                                    tooltip: '是否预烘焙动画，默认启用，可以大幅提高运行效时率，但所有动画效果会被彻底固定，不支持任何形式的编辑和混合。',
                                },
                            },
                        },
                    },
                },
            };
                    displayName: '拷贝变换',
                    title: '拷贝 {sourceNodeName} 的变换至 {targetNodeName}',
                    properties: {
                        'sourceNodeName': {
                            displayName: '源结点',
                            tooltip: '源结点的名称。',
                        },
                        'targetNodeName': {
                            displayName: '目标结点',
                            tooltip: '目标结点的名称。',
                        },
                        'space': {
                            displayName: '空间',
                            tooltip: '拷贝发生的空间。',
                        },
                    },
                    inputs: {
                        __extends__: 'classes.cc.animation.PoseNodeModifyPoseBase.inputs',
                    },
                },
                'PoseNodeSetAuxiliaryCurve': {
                    displayName: '设置辅助曲线',
                    title: '设置辅助曲线 {curveName}',
                    inputs: {
                        __extends__: 'classes.cc.animation.PoseNodeModifyPoseBase.inputs',
                        'curveValue': {
                            displayName: '值',
                        },
                    },
                },
                'PoseNodeTwoBoneIKSolver': {
                    displayName: '双骨骼 IK 结算器',
                    title: '解算双骨骼 IK：{endEffectorBoneName}',
                    properties: {
                        'endEffectorBoneName': {
                            displayName: '终端执行器骨骼',
                            tooltip: '终端执行器骨骼的名称。',
                        },
                        'endEffectorTarget': {
                            displayName: '终端执行器目标',
                            tooltip: '指定终端执行器的目标。',
                        },
                        'poleTarget': {
                            displayName: '极向目标',
                            tooltip: '指定极向的目标，也即中间骨骼的趋向位置。',
                        },
                    },
                    inputs: {
                        __extends__: 'classes.cc.animation.PoseNodeModifyPoseBase.inputs',
                        'endEffectorTargetPosition': {
                            displayName: '终端执行器目标',
                        },
                        'poleTargetPosition': {
                            displayName: '极目标',
                        },
                        'intensityValue': {
                            displayName: '强度',
                        },
                    },
                    'TargetSpecification': {
                        properties: {
                            'type': {
                                displayName: '类型',
                                tooltip: '目标类型。',
                            },
                            'targetPosition': {
                                displayName: '目标位置',
                                tooltip: '目标位置。',
                            },
                            'targetPositionSpace': {
                                displayName: '目标位置空间',
                                tooltip: '目标位置的空间。',
                            },
                            'targetBone': {
                                displayName: '目标骨骼',
                                tooltip: '目标骨骼的名称。',
                            },
                        },
                    },
                },

                'PVNodeGetVariableBase': {
                    displayName: '获取变量',
                    title: '变量 {variableName}',
                },
            },
        },
    },
};
