import fs from 'fs';

const translations = {
    zh: {
        terms: {
            title: "Summits – 服务条款",
            lastUpdated: "最后更新：2025年1月",
            introduction: "Summits是一个可以帮助您追踪和分享登山成就的平台。通过使用本服务并连接第三方账户（Garmin、Strava、Wikiloc 或 Suunto），即表示您同意本服务条款。",
            dataCollection: {
                title: "1. 数据收集和处理",
                whatData: {
                    title: "1.1 我们访问哪些数据",
                    intro: "当您将外部平台账户连接到 Summits 时，我们访问以下类型的数据：",
                    fromWikiloc: "来自 Wikiloc：",
                    wikiloc: {
                        activity: "活动和路线数据（GPX 文件、轨迹日志）",
                        timestamps: "活动的时间戳和日期",
                        elevation: "海拔剖面和地理坐标",
                        routeNames: "路线名称和描述",
                        activityTypes: "活动类型（徒步、登山等）",
                        profile: "公开个人资料信息"
                    },
                    fromStrava: "来自 Strava：",
                    strava: {
                        activity: "活动数据，包括路线和轨迹",
                        timestamps: "活动的时间戳和持续时间",
                        elevation: "爬升、距离和持续时间指标",
                        coordinates: "地理坐标和海拔剖面",
                        activityTypes: "活动类型和运动项目",
                        profile: "基本个人资料信息（姓名、用户名、个人资料照片）"
                    },
                    fromGarmin: "来自 Garmin Connect：",
                    garmin: {
                        activity: "来自 Garmin 设备的活动记录",
                        gps: "GPS 追踪数据和路线",
                        elevation: "海拔、距离和时间数据",
                        summaries: "活动摘要和统计数据",
                        location: "地理位置数据",
                        profile: "基本个人资料信息（姓名、用户名、个人资料照片）"
                    }
                },
                howWeUse: {
                    title: "1.2 我们如何使用您的数据",
                    intro: "我们使用来自外部平台的数据来：",
                    identifyPeaks: "识别您攀登了哪些山峰",
                    trackProgress: "追踪您的登山进度",
                    displayHistory: "在交互式地图上显示您的攀登历史",
                    calculateStats: "计算您攀登的山峰总数和其他统计数据",
                    enableSharing: "允许与其他用户分享成就（受隐私设置限制）",
                    leaderboards: "将您的统计数据纳入社区排行榜",
                    analyzeRoutes: "分析并存储您带有已识别山峰的路线"
                }
            },
            thirdParty: {
                title: "2. 第三方平台服务条款",
                compliance: {
                    title: "2.1 遵守外部平台政策",
                    intro: "通过将您的外部平台账户连接到 Summits，您承认：",
                    readAgree: "您已阅读并同意遵守每个平台的服务条款",
                    apiTerms: "我们仅根据您授予的权限和每个平台的 API 条款访问您的数据",
                    devPolicies: "我们遵守 Garmin、Strava 和 Wikiloc 的开发者和隐私政策",
                    noCredentials: "我们不会共享您的登录凭据",
                    secureTokens: "我们安全地存储访问令牌，并仅将其用于导入活动数据"
                },
                scope: {
                    title: "2.2 授权范围",
                    intro: "通过授权 Summits，您授予以下权限：",
                    readStore: "读取、存储和处理您的活动数据",
                    analyzeTransform: "分析和转换您的数据以识别山峰",
                    notDo: {
                        intro: "我们不会：",
                        modify: "代表您修改、删除或发布活动",
                        share: "与广告商或第三方共享您的数据（第 4 节所述情况除外）",
                        sell: "出售您的个人数据"
                    }
                },
                revocation: {
                    title: "2.3 撤销访问权限",
                    content: "您可以随时通过外部平台账户设置撤销 Summits 的访问权限。一旦撤销，将不再导入新数据。除非您请求删除，否则之前导入的数据将保留。"
                }
            },
            dataStorage: {
                title: "3. 数据存储和安全",
                retention: {
                    title: "3.1 数据保留",
                    active: "只要您的 Summits 账户处于活动状态，导入的数据就会被存储。",
                    deleted: "注销的账户和数据将在 30 天内永久删除。",
                    matching: "存储山峰匹配信息以提高处理性能。"
                },
                security: {
                    title: "3.2 数据安全",
                    intro: "我们通过行业标准措施保护您的数据，包括：",
                    encryption: "加密（HTTPS/TLS 和静态加密）",
                    access: "仅限授权人员的访问控制",
                    infrastructure: "安全的云存储基础设施",
                    updates: "定期安全更新和修补"
                },
                location: {
                    title: "3.3 数据位置",
                    content: "您的数据存储在符合适用数据保护法的地区云服务器上。使用 Summits 即表示您同意此类转移和处理。"
                }
            },
            dataSharing: {
                title: "4. 数据共享和披露",
                public: {
                    title: "4.1 公开信息",
                    intro: "如果您的个人资料是公开的，其他用户可能会看到：",
                    statistics: "您的山峰统计数据和完成次数",
                    username: "您的用户名和个人资料照片",
                    rankings: "您在排行榜上的排名",
                    profile: "搜索结果和列表中的个人资料"
                },
                private: {
                    title: "4.2 私人信息",
                    intro: "以下信息始终保持私密：",
                    routes: "确切的路线轨迹和坐标",
                    elevation: "详细的海拔剖面",
                    times: "活动开始/结束时间",
                    email: "电子邮件和个人标识符",
                    followers: "关注者和被关注用户列表（除非公开）"
                },
                thirdParties: {
                    title: "4.3 向第三方共享数据",
                    noSell: "我们不出售个人数据。",
                    aggregated: "我们可能会共享汇总的匿名数据用于分析或研究。",
                    shareWith: "我们可能仅与以下各方共享数据：",
                    serviceProviders: "支持平台运营的服务提供商",
                    authorities: "法律要求的政府部门",
                    safety: "为确保用户安全的相关方"
                }
            },
            rights: {
                title: "5. 您的权利和控制",
                correction: {
                    title: "5.1 数据更正",
                    content: "您可以在应用程序中验证或报告不正确的山峰识别。经过验证的更正将被审查和更新。"
                },
                deletion: {
                    title: "5.2 账户注销",
                    content: "您可以随时注销您的 Summits 账户。所有导入的数据和社交连接将在 30 天内移除。注销您的 Summits 账户不会影响您的外部平台账户。"
                },
                privacy: {
                    title: "5.3 隐私设置",
                    content: "您可以直接在应用程序的隐私设置中管理可见性、共享选项和社交功能。"
                }
            },
            accuracy: {
                title: "6. 数据准确性和局限性",
                peakIdentification: {
                    title: "6.1 山峰识别",
                    algorithmic: "山峰识别是基于算法的，可能并不总是准确的。",
                    errors: "可以报告错误以改进未来的准确性。"
                },
                routeData: {
                    title: "6.2 路线数据质量",
                    accuracy: "准确性取决于来自外部平台的 GPS 数据。",
                    incomplete: "不完整或缺失的数据可能会影响处理。",
                    delays: "大型数据集可能会出现延迟。"
                },
                warranty: {
                    title: "6.3 免责声明",
                    intro: "Summits 不对以下内容提供任何保证：",
                    accuracy: "山峰或路线数据的准确性或完整性",
                    reliability: "外部平台 API 的可靠性",
                    uptime: "服务在线时间或不间断访问",
                    disclaimer: "使用 Summits 的风险自担。"
                }
            },
            changes: {
                title: "7. 条款修订",
                modifications: {
                    title: "7.1 修改",
                    content: "我们可能随时修改这些服务条款。更新自发布在应用程序或我们的网站上之日起生效。"
                },
                continuedUse: {
                    title: "7.2 继续使用",
                    content: "更新后的继续使用即表示接受。如果您不同意，请停止使用并注销您的账户。"
                }
            },
            termination: {
                title: "8. 服务终止",
                serviceTermination: {
                    title: "8.1 服务终止",
                    intro: "我们可能会因以下原因暂停或注销账户：",
                    violation: "违反本条款或外部平台条款",
                    fraudulent: "欺诈或滥用活动",
                    legal: "法律或监管要求"
                },
                effect: {
                    title: "8.2 终止的影响",
                    content: "访问权限将立即被撤销，数据将根据保留政策删除。"
                }
            },
            indemnification: {
                title: "9. 赔偿",
                intro: "您同意对因以下原因引起的任何索赔或损失向 Summits 进行赔偿并使之免受损害：",
                violations: "违反本条款",
                platformPolicies: "违反外部平台政策",
                misuse: "误用或欺诈性数据提交",
                disputes: "与其他用户的纠纷"
            },
            liability: {
                title: "10. 责任限制",
                intro: "在法律允许的最大范围内：",
                asIs: "Summits 按“原样”提供，不作任何保证。",
                notLiable: "我们不对任何间接、附带或后果性损害负责。",
                platformDowntime: "我们对外部平台停机或 API 更改不承担责任。"
            },
            disputes: {
                title: "11. 争议解决和适用法律",
                governingLaw: {
                    title: "11.1 适用法律",
                    content: "本条款受哥斯达黎加法律管辖，不包括冲突法原则。"
                },
                resolution: {
                    title: "11.2 争议解决",
                    negotiation: "诚意谈判",
                    mediation: "如果谈判失败，进行调解",
                    arbitration: "未解决纠纷的约束性仲裁"
                },
                classAction: {
                    title: "11.3 集体诉讼豁免",
                    content: "所有争议必须单独解决；不允许进行集体诉讼。"
                }
            },
            contact: {
                title: "12. 联系信息",
                intro: "如果您有任何疑问，请联系我们：",
                email: "电子邮件：cesc.riera@summitstracker.com",
                website: "网站：summitstracker.com",
                support: "支持：可通过应用内帮助和支持功能获得"
            },
            acknowledgment: {
                title: "13. 确认",
                intro: "通过使用 Summits 并连接 Garmin、Strava 或 Wikiloc 账户，您：",
                read: "已阅读并理解本条款",
                consent: "同意所述的数据使用",
                capacity: "具有同意的法律能力",
                comply: "将遵守适用法律",
                responsible: "负责维护您的账户安全",
                footer: "继续使用 Summits 即表示您同意本服务条款。如果您不同意，请停止使用并注销您的账户。"
            }
        },
        privacy: {
            title: "Summits – 隐私政策",
            lastUpdated: "最后更新：2025年1月",
            introduction: {
                title: "1. 简介",
                content: "在 Summits，我们致力于保护您的隐私。本隐私政策解释了我们如何收集、使用、披露和保护您在使用我们的移动应用程序和网站（统称为“服务”）时的信息。使用本服务即表示您同意本政策中所述的数据做法。"
            },
            dataController: {
                title: "2. 数据控制者",
                content: "负责您个人信息的数据控制者是：",
                email: "电子邮件：cesc.riera@summitstracker.com",
                website: "网站：summitstracker.com"
            },
            dataCollection: {
                title: "3. 我们收集的信息",
                personalData: {
                    title: "3.1 个人信息",
                    intro: "当您创建账户时，我们收集：",
                    account: "账户信息（电子邮件地址、用户名、密码）",
                    profile: "个人资料信息（姓名、个人资料照片、简介）",
                    preferences: "应用偏好和设置"
                },
                activityData: {
                    title: "3.2 来自第三方平台的活动数据",
                    intro: "当您连接来自 Wikiloc、Strava 或 Garmin 的账户时，我们收集：",
                    fromWikiloc: "来自 Wikiloc：",
                    wikiloc: {
                        activity: "活动数据（路线、轨迹、GPS 坐标）",
                        timestamps: "活动时间戳（开始时间、结束时间、持续时间）",
                        elevation: "海拔数据和剖面",
                        routeNames: "路线名称和描述",
                        activityTypes: "活动类型（徒步、骑行等）",
                        profile: "公开个人资料信息"
                    },
                    fromStrava: "来自 Strava：",
                    strava: {
                        activity: "活动数据（路线、轨迹、GPS 坐标）",
                        timestamps: "活动时间戳（开始时间、结束时间、持续时间）",
                        elevation: "海拔数据和剖面",
                        coordinates: "GPS 坐标和路线轨迹",
                        activityTypes: "活动类型（跑步、骑行、徒步等）",
                        profile: "公开个人资料信息"
                    },
                    fromGarmin: "来自 Garmin：",
                    garmin: {
                        activity: "来自 Garmin Connect 的活动数据",
                        gps: "GPS 轨迹和坐标",
                        elevation: "海拔数据和心率信息",
                        summaries: "活动摘要和统计数据",
                        location: "位置数据",
                        profile: "公开个人资料信息"
                    }
                },
                technicalData: {
                    title: "3.3 技术信息",
                    intro: "我们自动收集：",
                    device: "设备信息（设备类型、操作系统、唯一设备标识符）",
                    ip: "IP 地址和位置数据",
                    browser: "浏览器类型和版本",
                    logs: "使用日志和分析数据"
                }
            },
            dataUsage: {
                title: "4. 我们如何使用您的信息",
                purposes: {
                    title: "4.1 处理目的",
                    intro: "我们将您的信息用于：",
                    service: "提供和维护服务",
                    peakIdentification: "根据您的活动数据识别您已完成的山峰",
                    progress: "追踪您的进度并生成统计数据",
                    statistics: "计算并显示您的个人统计数据和成就",
                    community: "启用社交功能、排行榜和社区互动",
                    communication: "向您发送通知、更新和支持沟通",
                    improvement: "改进、个性化和开发服务",
                    security: "检测、预防和解决技术问题和安全威胁"
                },
                legalBasis: {
                    title: "4.2 处理的法律依据",
                    intro: "我们基于以下依据处理您的个人数据：",
                    consent: "您连接第三方账户时的同意",
                    contract: "为向您提供服务而履行我们与您的合同",
                    legitimate: "我们在运营和改进服务方面的正当利益",
                    legal: "遵守法律义务"
                }
            },
            dataSharing: {
                title: "5. 数据共享和披露",
                thirdParties: {
                    title: "5.1 第三方服务提供商",
                    intro: "我们可能会与协助我们完成以下工作的受信任服务提供商共享您的信息：",
                    serviceProviders: "托管和基础设施服务",
                    analytics: "分析和性能监控",
                    cloud: "云存储和数据处理"
                },
                publicData: {
                    title: "5.2 公开信息",
                    intro: "以下信息可能是公开可见的：",
                    statistics: "汇总统计数据和成就",
                    username: "您的用户名和公开个人资料",
                    rankings: "您在排行榜上的位置",
                    profile: "您选择分享的公开个人资料信息"
                },
                legal: {
                    title: "5.3 法律要求",
                    content: "如果法律、法院命令或政府当局要求，或者为了保护我们、我们的用户或他人的权利、财产或安全，我们可能会披露您的信息。"
                }
            },
            dataStorage: {
                title: "6. 数据存储和安全",
                location: {
                    title: "6.1 数据位置",
                    content: "您的数据存储在位于欧盟和美国的安全服务器上。使用本服务即表示您同意将数据转移到这些位置。"
                },
                retention: {
                    title: "6.2 数据保留",
                    intro: "我们保留您的数据：",
                    active: "在您的账户处于活动状态期间以及提供服务所需的期间",
                    deleted: "在账户注销后最多保留 30 天，之后将其永久删除",
                    legal: "根据适用法律法规的要求"
                },
                security: {
                    title: "6.3 安全措施",
                    intro: "我们实施适当的技术和组织措施来保护您的数据：",
                    encryption: "对传输中和静态的数据进行加密",
                    access: "访问控制和身份验证机制",
                    infrastructure: "安全的基础设施和定期安全审计",
                    updates: "定期安全更新和补丁"
                }
            },
            userRights: {
                title: "7. 您的权利 (GDPR/CCPA)",
                access: {
                    title: "7.1 访问权",
                    content: "您有权请求访问您的个人数据并获得我们持有的关于您的数据的副本。"
                },
                rectification: {
                    title: "7.2 更正权",
                    content: "您可以请求更正不准确或不完整的个人数据。"
                },
                erasure: {
                    title: "7.3 删除权",
                    content: "您可以请求删除您的个人数据。您可以随时通过应用设置注销您的账户。"
                },
                restriction: {
                    title: "7.4 限制处理权",
                    content: "在某些情况下，您可以请求限制处理您的个人数据。"
                },
                portability: {
                    title: "7.5 数据可移植权",
                    content: "您可以请求以结构化、机器可读的格式提供您的数据副本。"
                },
                objection: {
                    title: "7.6 反对权",
                    content: "您可以基于正当利益反对处理您的个人数据。"
                },
                withdraw: {
                    title: "7.7 撤回同意权",
                    content: "您可以随时通过断开第三方账户或注销您的账户来撤回您的同意。"
                },
                complaint: {
                    title: "7.8 投诉权",
                    content: "如果您认为您的权利受到侵犯，您有权向当地数据保护机构提出投诉。"
                }
            },
            cookies: {
                title: "8. Cookie 和追踪技术",
                intro: "我们使用 Cookie 和类似的追踪技术来追踪我们服务上的活动并存储某些信息。",
                types: {
                    title: "8.1 Cookie 类型",
                    essential: "服务正常运行所需的必要 Cookie",
                    analytics: "了解用户如何与服务互动的分析 Cookie",
                    functional: "记住您偏好的功能性 Cookie"
                },
                management: {
                    title: "8.2 Cookie 管理",
                    content: "您可以通过浏览器设置控制 Cookie。但是，禁用 Cookie 可能会影响服务的功能。"
                }
            },
            children: {
                title: "9. 儿童隐私",
                content: "我们的服务可供所有年龄段的儿童使用。我们致力于保护儿童和所有用户的隐私。我们实施了适当的保障措施，以确保使用我们服务的儿童的安全和隐私。如果您对您的孩子使用我们的服务有任何疑问，请联系我们。"
            },
            international: {
                title: "10. 国际数据转移",
                content: "您的信息可能会被转移到您居住国以外的国家并进行处理。这些国家的数据保护法可能与您所在国家的法律不同。我们确保采取适当的保障措施来保护您的数据。"
            },
            changes: {
                title: "11. 本隐私政策的修订",
                content: "我们可能不时更新本隐私政策。我们将通过在本页面发布新的隐私政策并更新“最后更新”日期来通知您任何更改。建议您定期查看本隐私政策。"
            },
            contact: {
                title: "12. 联系我们",
                intro: "如果您对本隐私政策有疑问或希望行使您的权利，请联系我们：",
                email: "电子邮件：cesc.riera@summitstracker.com",
                website: "网站：summitstracker.com",
                support: "支持：可通过应用内帮助和支持功能获得"
            }
        }
    }
};

function applyTranslations(lang) {
    const path = `src/shared/locales/${lang}.json`;
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    // Deep merge function
    function merge(target, source) {
        for (const key in source) {
            if (typeof source[key] === 'object' && source[key] !== null) {
                if (!target[key]) target[key] = {};
                merge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    if (translations[lang]) {
        merge(data, translations[lang]);
        fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Applied translations to ${path}`);
    }
}

applyTranslations('zh');
