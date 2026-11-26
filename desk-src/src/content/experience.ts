// Typed onto the typewriter's sheet, newest first. Text in a reader's
// language is a { en, zh } pair (src/lang.ts); dates stay as they are.
// [text](/projects/<id>) in a bullet links to that project's tray.

import type { Text } from '../lang'

export type Job = {
  company: Text
  url: string
  role: Text
  place: Text
  start: string
  end: string
  bullets: Text[]
}

export const experience: Job[] = [
  {
    company: { en: 'The University of Hong Kong', zh: '香港大学' },
    url: 'https://www.cds.hku.hk/',
    role: { en: 'PhD Student, School of Computing and Data Science', zh: '计算与数据科学学院 博士生' },
    place: { en: 'Hong Kong', zh: '香港' },
    start: 'Nov 2026',
    end: 'Present',
    bullets: [
      { en: 'Advised by Prof. Liangqiong Qu.', zh: '导师：Prof. Liangqiong Qu。' },
      { en: '[Flipping the Coins](/projects/flipping-the-coins): training hybrid simulators through hard switches. First author.', zh: '[Flipping the Coins](/projects/flipping-the-coins)：训练含硬开关的混合仿真器。第一作者。' },
      { en: '[FORGE](/projects/forge): training neural networks inside forward-only simulators. Co-first author.', zh: '[FORGE](/projects/forge)：在只能前向运行的仿真器里训练神经网络。共同第一作者。' },
    ],
  },
  {
    company: { en: 'Fudan University & Shanghai Academy of AI for Science', zh: '复旦大学 & 上海科学智能研究院' },
    url: 'https://www.fudan.edu.cn/',
    role: { en: 'Research Intern', zh: '研究实习生' },
    place: { en: 'Shanghai', zh: '上海' },
    start: 'Oct 2025',
    end: 'Oct 2026',
    bullets: [
      { en: 'Supervised by Prof. Long Wei.', zh: '指导老师：Prof. Long Wei。' },
      { en: 'Multiphysics post-training: from decoupled modules to coupled equilibria. First author, under review.', zh: '多物理场后训练：从解耦模块到耦合平衡。第一作者，在审。' },
    ],
  },
  {
    company: { en: 'Westlake University', zh: '西湖大学' },
    url: 'https://www.westlake.edu.cn/',
    role: { en: 'Research Intern, Department of AI', zh: '人工智能系 研究实习生' },
    place: { en: 'Hangzhou', zh: '杭州' },
    start: 'Dec 2024',
    end: 'Oct 2025',
    bullets: [
      { en: 'Supervised by Prof. Tailin Wu.', zh: '指导老师：Prof. Tailin Wu。' },
      { en: '[GenCP](/projects/gencp): a generative paradigm for coupled multiphysics simulation, ICLR 2026. First author.', zh: '[GenCP](/projects/gencp)：耦合多物理场仿真的生成式范式，ICLR 2026。第一作者。' },
      { en: 'Co-organized the [RealPDE Competition](/projects/realpde) at NeurIPS 2026: evaluation pipelines and baselines.', zh: '参与组织 NeurIPS 2026 [RealPDE 竞赛](/projects/realpde)，负责评测流程和基线。' },
    ],
  },
  {
    company: { en: 'University of Toronto', zh: '多伦多大学' },
    url: 'https://www.utoronto.ca/',
    role: { en: 'Research Intern, Mitacs Globalink', zh: '研究实习生（Mitacs Globalink）' },
    place: { en: 'Online', zh: '线上' },
    start: 'Jul 2021',
    end: 'Nov 2021',
    bullets: [{ en: 'Research internship funded by the Mitacs Globalink program.', zh: '由 Mitacs Globalink 项目资助的研究实习。' }],
  },
]

// Typed under the jobs on the same sheet.
export type School = { school: Text; degree: Text; start: string; end: string }

export const education: School[] = [
  {
    school: { en: 'The University of Hong Kong', zh: '香港大学' },
    degree: { en: 'PhD in Computing and Data Science', zh: '计算与数据科学 博士' },
    start: 'Nov 2026',
    end: 'Present',
  },
  {
    school: { en: 'Tongji University', zh: '同济大学' },
    degree: { en: 'Master of Engineering', zh: '工学硕士' },
    start: 'Sep 2022',
    end: 'Jul 2026',
  },
  {
    school: { en: 'Tianjin University', zh: '天津大学' },
    degree: { en: 'Bachelor of Engineering', zh: '工学学士' },
    start: 'Sep 2018',
    end: 'Jun 2022',
  },
]
