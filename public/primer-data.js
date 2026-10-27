/* 小莲宝 CerviPal · 疾病概要数据（36 号）
 * 口径：docs/DISEASE-PRIMER.md；规范：starter docs/36-DISEASE-PRIMER.md。
 * 全部内容属第 ② 层（解释）：只写定义、文件、指南列举过的手段、已发生的变化。
 * 任何「你该怎么办」的判断都不在这里，固定出口是「这一句需要问你的医生」。
 *
 * 原件状态照实写：FIGO 2018 分期据项目 SPEC 与 USER-RESEARCH 转引；CSCO / NCCN 宫颈癌指南
 * 全文未核对（docs/USER-RESEARCH.md 原文），版本号不臆测；WHO 分类未取得原件。
 * 2026-10-27（36 号 §2.5）：每条未取得原件的行都补了可点的二次来源；二次来源的性质写在 note/表内文字里，
 * 不把「书目页 / 官网指南页」冒充全文。ClinicalTrials.gov 与国内登记平台的探测是本机快照，无公开 URL，标 nolink。
 */
window.DISEASE_PRIMER = {
  brand: '小莲宝 CerviPal',
  name: '宫颈癌',
  en: 'Cervical Cancer',
  updated: '2026-10-27',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '宫颈癌是发生在子宫颈上皮的恶性肿瘤。这台工作台把「医生给的是哪一期、凭什么定的」放在第一位，'
        + '因为宫颈癌的治疗路径先按临床分期分岔：手术，还是根治性放化疗。',
      points: [
        '病理类型常见鳞状细胞癌、腺癌、腺鳞癌三类；本台的病历结构按这三类建档，不合并成「宫颈癌」一个空字段。',
        '分期用国际妇产科联盟（FIGO）2018 年宫颈癌临床分期，含 IIIC1 / IIIC2 的淋巴结分期，以及 r（影像）与 p（病理）标记。',
        'FIGO 2018 允许影像与病理参与分期（IIIC r/p）；本台只记录医生给出的期别、依据原文与日期，不自算、不推导。',
        'HPV 筛查史在档案里单列：筛查史与发病不是因果关系，本台不做归因。'
      ],
      sources: [
        { org: 'FIGO', doc: 'FIGO staging for carcinoma of the cervix uteri（2018 修订）', version: '2018', original: false, page: '页码待核',
          secondaryUrl: 'https://www.cancer.gov/types/cervical/hp/cervical-treatment-pdq', note: '二次来源为 NCI PDQ 宫颈癌治疗（含 FIGO 分期说明）；FIGO 原文需出版方订阅' },
        { org: 'WHO', doc: 'Classification of Tumours: Female Genital Tumours, 5th ed.', version: '版本未核实', original: false, page: '页码待核',
          secondaryUrl: 'https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Female-Genital-Tumours-2020', note: 'IARC/WHO 官方书目页；全文需购买' }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '这台工作台里出现的每一条「该查什么、怎么分期、多久随访」，都应能追到下面某一份文件。'
        + '本项目对宫颈癌的两份主要临床指南只核对到「存在」这一层，全文未取得，版本号不写死。',
      table: {
        head: ['机构', '文件', '版本 / 年份', '原件', '本台的用途'],
        rows: [
          ['FIGO', 'FIGO staging for carcinoma of the cervix uteri', '2018 修订', { text: '未取得原件，据 NCI PDQ 二次来源', url: 'https://www.cancer.gov/types/cervical/hp/cervical-treatment-pdq' }, '分期档案的期别结构（含 IIIC1/IIIC2、r/p 标记）'],
          ['CSCO', 'CSCO 宫颈癌诊疗指南', '版本未核实', { text: '未取得原件，据出版方书目页', url: 'https://www.pmphmall.com/gdsdetail/660506-338835' }, '国内治疗路径与药物可及性的对照；本版不作引用依据'],
          ['NCCN', 'NCCN Guidelines · Cervical Cancer', '版本未核实', { text: '未取得原件，据 NCCN 官网指南页', url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1426' }, '国际路径结构的对照；本版不作引用依据'],
          ['WHO', 'Classification of Tumours: Female Genital Tumours', '第 5 版（年份未核实）', { text: '未取得原件，据 IARC 官方书目页', url: 'https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Female-Genital-Tumours-2020' }, '病理类型命名口径']
        ]
      },
      points: [
        '指南给的是「通常怎么做」，不是「你该怎么做」；本台引用一律带机构与版本，查不到版本就写「版本未核实」。',
        '未取得原件的文件只记「存在」与「大致讲什么」，不引用其具体条文，页码写「页码待核」。',
        '本项目 2026-10-21 探测过国家药监局药物临床试验登记与信息公示平台（HTTP 202 挑战页）与 ChiCTR（HTTP 405），均判定不可采集；覆盖未知不等于没有登记。'
      ],
      sources: [
        { org: 'FIGO', doc: 'FIGO staging for carcinoma of the cervix uteri', version: '2018 修订', original: false, page: '页码待核',
          secondaryUrl: 'https://www.cancer.gov/types/cervical/hp/cervical-treatment-pdq', note: '据 NCI PDQ 宫颈癌治疗（含 FIGO 分期说明）' },
        { org: 'CSCO', doc: 'CSCO 宫颈癌诊疗指南', version: '版本未核实', original: false, page: '页码待核',
          secondaryUrl: 'https://www.pmphmall.com/gdsdetail/660506-338835', note: '出版方书目页（2026 版在售）；全文未核对，不据此引用' },
        { org: 'NCCN', doc: 'NCCN Guidelines · Cervical Cancer', version: '版本未核实', original: false, page: '页码待核',
          secondaryUrl: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1426', note: 'NCCN 官网指南页；下载全文需注册' }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '下面按病期与线序列出指南里出现过的手段类别。这是「世界上大致有哪些办法」的地图，不是给你排的先后顺序，'
        + '也不含剂量、疗程与适用条件——那些必须由医生按你的分期与病理决定。',
      groups: [
        {
          label: '早期（可以手术时）',
          points: [
            '手术：按期别与是否要求保留生育，指南结构里出现锥切、根治性宫颈切除、广泛子宫切除与盆腔淋巴结评估等术式；具体做哪一种属医生判断。',
            '生育保留：锥切与根治性宫颈切除等保留子宫或宫颈的术式被列出，适用条件严格；本台只记录「医生提过哪些、你怎么想」。',
            '术后辅助治疗：按病理高危因素决定是否加放疗或放化疗，属医生判断。'
          ]
        },
        {
          label: '局部晚期 / 不能手术时',
          points: [
            '根治性同步放化疗（dCRT）：体外放疗 + 含铂化疗 + 后装（近距离放疗）是这一段的路径主干。',
            '后装（brachytherapy）：近距离放疗是根治性放疗的组成部分；本台只记疗程与日期，不评价剂量方案。',
            '治疗中的支持：营养支持、贫血与不良反应处理被列为支持性内容；本台只记录你的症状与检查值。'
          ]
        },
        {
          label: '复发 / 转移后',
          points: [
            '系统治疗：化疗、靶向治疗、免疫治疗在不同线序中被列出。本项目未取得指南全文，此处只写类别，不写具体药物与线序。',
            '局部处理：复发灶的放疗或手术在特定情形下被列出。',
            '临床研究：指南把「参加登记良好的临床试验」列为一项正式选项，不是最后手段。'
          ]
        },
        {
          label: '贯穿全程的两件事',
          points: [
            '放疗后的长期影响：阴道狭窄、淋巴水肿、治疗诱导绝经与卵巢功能变化，属随访内容；本台只记录你自己的感受与处理，不判定严重程度。',
            '随访节奏：阴道残端细胞学等复查项目按医生安排执行；本台只把「约在哪天、做了没有」整理成时间线。'
          ]
        }
      ],
      points: [
        '以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。'
      ],
      sources: [
        { org: 'FIGO', doc: 'FIGO staging for carcinoma of the cervix uteri', version: '2018 修订', original: false, page: '页码待核',
          secondaryUrl: 'https://www.cancer.gov/types/cervical/hp/cervical-treatment-pdq', note: '据 NCI PDQ 宫颈癌治疗（含 FIGO 分期说明）' },
        { org: 'CSCO', doc: 'CSCO 宫颈癌诊疗指南', version: '版本未核实', original: false, page: '页码待核',
          secondaryUrl: 'https://www.pmphmall.com/gdsdetail/660506-338835', note: '出版方书目页（2026 版在售）；全文未核对，不据此引用' }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '这一段只写已经发生的事：哪一版分期生效、登记平台上多了多少条、哪个渠道查不到。不写预测，不做评价。',
      points: [
        '2018 年：FIGO 发布宫颈癌 2018 修订分期，把影像（r）与病理（p）淋巴结结果纳入 IIIC1 / IIIC2。',
        '截至 2026-10-21：ClinicalTrials.gov 以 query.cond=cervical cancer、StudyFirstPostDate 2026-01-01 至 2026-10-21 检索到 158 条登记；人工筛出 14 条，其中Ⅰ期 2 条、Ⅱ期 7 条、Ⅲ期 2 条、观察性 1 条、登记未分期 2 条。',
        '2026-10-21：国家药监局药物临床试验登记与信息公示平台返回 HTTP 202 挑战页、ChiCTR 返回 HTTP 405，两个渠道本轮判定不可采集，中国登记覆盖数未知；因此上面 158 条只代表 ClinicalTrials.gov 一个通道。'
      ],
      sources: [
        { org: 'FIGO', doc: 'FIGO staging for carcinoma of the cervix uteri', version: '2018 修订', original: false, page: '页码待核',
          secondaryUrl: 'https://www.cancer.gov/types/cervical/hp/cervical-treatment-pdq', note: '据 NCI PDQ 宫颈癌治疗（含 FIGO 分期说明）' },
        { org: 'ClinicalTrials.gov', doc: 'API v2 检索（query.cond=cervical cancer；StudyFirstPostDate 2026-01-01–2026-10-21）', version: '检索日 2026-10-21', original: true, nolink: true, note: '一手登记数据，本项目自采；快照存 research/cervical-cancer/raw-2026.json，无公开 URL' },
        { org: 'NMPA 药品审评中心 / ChiCTR', doc: '两个国内登记平台的采集探测记录', version: '探测日 2026-10-21', original: true, nolink: true, note: '只存判定（HTTP 202 挑战页 / HTTP 405），未复制站点内容；探测记录存 research/cervical-cancer/cn-registry-attempt.json，无公开 URL' }
      ]
    }
  ]
}
