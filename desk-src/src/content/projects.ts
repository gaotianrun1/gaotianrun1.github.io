// One project is one tray of slides in the projector. The tray opens on the
// cover (the project at a glance), then one slide per picture, each with a
// short note, then the results. The details page holds the long version.
// Adding a project is one entry here; put its files in public/projects/<id>/.
// Text in a reader's language is a { en, zh } pair (src/lang.ts); names,
// terms and the metrics stay one string.
// Pictures are figures from the papers, padded to 16:10 (see public/projects/).

import type { Text } from '../lang'
import { asset } from '../base'

type Picture = { src: string; alt: string }

export type Project = {
  id: string
  title: string
  /** where it was made: a company, a school, 'Open source' */
  org: string
  period: string
  /** one sentence: what it is */
  pitch: Text
  /** who it was made with, shown under the pitch */
  with?: { name: string; href: string }
  cover: Picture
  slides: (Picture & { title: Text; body: Text })[]
  /** a 60–90 s screen recording, shown as a slide after the cover, with a line on what it follows */
  film?: { src: Text; poster: Text; caption: Text }
  metrics: { value: string; label: string; caveat: string }[]
  results?: Picture
  /** what in the demo is illustrative rather than real */
  disclaimer?: Text
  stack: string[]
  /** the details page: background, what I did, method and trade-offs; results and links follow from the fields above */
  details: { heading: Text; body: Text[] }[]
  /** the project's own public site, when it is live */
  site?: string
  links: { label: Text; href: string }[]
}

export type Slide =
  | { kind: 'cover' }
  | { kind: 'film'; src: Text; poster: Text; caption: Text }
  | { kind: 'picture'; src: string; alt: string; title: Text; body: Text }
  | { kind: 'results' }

export function slidesOf(p: Project): Slide[] {
  return [
    { kind: 'cover' },
    ...(p.film ? [{ kind: 'film' as const, ...p.film }] : []),
    ...p.slides.map((s) => ({ kind: 'picture' as const, ...s })),
    ...(p.metrics.length ? [{ kind: 'results' as const }] : []),
  ]
}

export function contextOf(p: Project) {
  return [p.org, p.period].filter(Boolean).join(' · ')
}

export const projects: Project[] = [
  {
    id: 'flipping-the-coins',
    title: 'Flipping the Coins',
    org: 'The University of Hong Kong',
    period: 'arXiv 2026',
    pitch: {
      en: 'Training hybrid physical simulators whose solvers contain hard switches, such as a tripping power line or an igniting grid cell.',
      zh: '训练求解器里含有硬开关的混合物理仿真器，比如跳闸的输电线路、被点燃的网格单元。',
    },
    cover: { src: asset('/projects/flipping-the-coins/01-cover.jpg'), alt: 'EventFlip overview: a hybrid simulator with threshold events, flip-and-replay of a selected switch, and the gradient update that adds a jump term to the path gradient' },
    slides: [
      {
        src: asset('/projects/flipping-the-coins/02-cases.jpg'),
        alt: 'Test cases on a power-grid cascade and cortical spreading depolarization: the reference beside EventFlip and three baselines',
        title: { en: 'Where the gradient breaks', zh: '梯度在哪里断开' },
        body: {
          en: 'At a switch the loss jumps, and automatic differentiation sees only its smooth part. EventFlip flips a near-threshold switch from a stored state, replays the solver, and turns the loss difference between the two runs into a jump term added to the path gradient.',
          zh: '在开关处损失会跳变，自动微分只能看到其中平滑的部分。EventFlip 从存下的状态翻转一个接近阈值的开关，重放求解器，把两次运行的损失差变成一个跳变项，加到路径梯度上。',
        },
      },
    ],
    metrics: [
      { value: '1.5×', label: 'lower error than the strongest baseline, power-grid cascade', caveat: 'identical forward evaluation budget, against twelve baselines' },
      { value: '1.4×', label: 'lower error than the strongest baseline, detonation wave', caveat: 'same setting' },
      { value: '1.4×', label: 'lower error than the strongest baseline, cortical spreading depolarization', caveat: 'same setting' },
    ],
    results: { src: asset('/projects/flipping-the-coins/03-results.jpg'), alt: 'Error against forward budget on the three tasks for EventFlip-Hard, EventFlip-Rand and the baselines' },
    stack: ['PyTorch', 'hybrid simulators', 'gradient estimation'],
    details: [
      {
        heading: { en: 'Background', zh: '背景' },
        body: [
          { en: 'Hybrid simulators embed learnable components in physical solvers and train them on reference trajectories. Gradient-based relaxations smooth the switches and introduce bias across jumps; derivative-free methods treat the solver as a black box and discard the path gradients of the continuous dynamics.', zh: '混合仿真器把可学习的组件嵌进物理求解器，用参考轨迹训练。基于梯度的松弛方法把开关抹平，在跳变处引入偏差；无导数方法把求解器当黑箱，丢掉了连续动力学的路径梯度。' },
        ],
      },
      {
        heading: { en: 'Method', zh: '方法' },
        body: [
          { en: 'Perturbing every threshold with small Gaussian noise casts each switch as a stochastic binary decision, which gives an unbiased gradient estimator: the continuous path gradient plus a jump term built from counterfactual rollouts. EventFlip-Rand optimizes the noise-averaged objective; EventFlip-Hard works on the deterministic hard-switch simulator used at deployment.', zh: '给每个阈值加上小的高斯噪声，把每个开关变成随机的二值决策，由此得到无偏的梯度估计：连续的路径梯度，加上由反事实 rollout 构造的跳变项。EventFlip-Rand 优化噪声平均后的目标；EventFlip-Hard 直接作用于部署时使用的确定性硬开关仿真器。' },
        ],
      },
    ],
    links: [
      { label: { en: 'arXiv', zh: 'arXiv' }, href: 'https://arxiv.org/abs/2611.33716' },
      { label: { en: 'PDF', zh: 'PDF' }, href: 'https://arxiv.org/pdf/2611.33716' },
    ],
  },
  {
    id: 'forge',
    title: 'Sounding the Black Box (FORGE)',
    org: 'Tsinghua University · HKU',
    period: 'arXiv 2026',
    pitch: {
      en: 'Training neural networks embedded in simulators that can only be run forward, such as operational Fortran and C/C++ codes.',
      zh: '训练嵌在只能前向运行的仿真器里的神经网络，比如业务化运行的 Fortran 和 C/C++ 程序。',
    },
    cover: { src: asset('/projects/forge/01-cover.jpg'), alt: 'FORGE overview: a forward-only simulator with a neural closure, then perturbing shared weights and closure outputs to fit a causal response and refit the weights' },
    slides: [
      {
        src: asset('/projects/forge/02-benchmarks.jpg'),
        alt: 'Reference fields and absolute errors of the coarse solver and FORGE on five 2D and 3D benchmarks',
        title: { en: 'Five benchmarks, 2D and 3D', zh: '五个 2D 和 3D 基准' },
        body: {
          en: 'Phase separation, reaction-diffusion, fluid and MHD turbulence, and ocean circulation. The middle row is the error of the coarse solver alone, the bottom row the error with the closure FORGE trained.',
          zh: '相分离、反应扩散、流体与磁流体湍流、海洋环流。中间一行是只用粗网格求解器的误差，最下面一行是加上 FORGE 训练出的闭合项后的误差。',
        },
      },
    ],
    metrics: [
      { value: '50–96%', label: 'lower test MSE than the coarse solver in 2D', caveat: '70% in 3D' },
      { value: '16–69%', label: 'better than the strongest forward-only baseline', caveat: 'across the five benchmarks' },
      { value: '88–98%', label: 'of the gains of solver backpropagation through time', caveat: 'recovered without solver derivatives' },
    ],
    results: { src: asset('/projects/forge/03-results.jpg'), alt: 'Validation error against rollout budget and training GPU-hours for FORGE and the baselines' },
    stack: ['PyTorch', 'Fortran / C++ solvers', 'Gauss-Newton'],
    details: [
      {
        heading: { en: 'Background', zh: '背景' },
        body: [
          { en: 'Closure outputs feed back across time steps, so single-step offline regression does not minimize multi-step rollout error. Backpropagating through the solver is the standard online fix, but many operational simulators expose only forward-only interfaces.', zh: '闭合项的输出会在时间步之间反馈，所以单步离线回归并不能最小化多步 rollout 误差。穿过求解器反向传播是标准的在线做法，但很多业务化仿真器只提供前向接口。' },
        ],
      },
      {
        heading: { en: 'Method', zh: '方法' },
        body: [
          { en: 'FORGE separates exact network derivatives from black-box simulator dynamics. Stage I warms up the rollout with a low-dimensional Gauss-Newton step along output-orthonormal weight directions. Stage II perturbs the output fields, fits a causal linear response operator across rollout steps, solves for target outputs and updates all weights by network backpropagation.', zh: 'FORGE 把网络自身的精确导数和黑箱仿真器的动力学分开处理。第一阶段沿输出正交的权重方向做低维 Gauss-Newton 步，让 rollout 先稳定下来。第二阶段扰动输出场，拟合跨 rollout 步的因果线性响应算子，解出目标输出，再用网络反向传播更新全部权重。' },
        ],
      },
    ],
    links: [
      { label: { en: 'arXiv', zh: 'arXiv' }, href: 'https://arxiv.org/abs/2611.31964' },
      { label: { en: 'Code', zh: '代码' }, href: 'https://github.com/ChiyodaMomo01/FORGE' },
    ],
  },
  {
    id: 'gencp',
    title: 'GenCP',
    org: 'Westlake University',
    period: 'ICLR 2026',
    pitch: {
      en: 'A generative paradigm for coupled multiphysics simulation that trains on decoupled data and infers the coupled solution while sampling.',
      zh: '耦合多物理场仿真的生成式范式：用解耦的数据训练，在采样过程中推断耦合解。',
    },
    cover: { src: asset('/projects/gencp/01-cover.jpg'), alt: 'GenCP overview' },
    slides: [
      {
        src: asset('/projects/gencp/02-train-infer.jpg'),
        alt: 'Training with data of decoupled physical fields, and inference that iteratively updates each field using the flowing other field',
        title: { en: 'Train decoupled, sample coupled', zh: '解耦训练，耦合采样' },
        body: {
          en: 'Each field is learned by flow matching with the other field held as a fixed condition. At inference the fluid and structure flows take turns, each step conditioned on the current state of the other, so the coupled solution emerges during sampling.',
          zh: '每个场都在另一个场作为固定条件的情况下用 flow matching 学习。推断时流体和结构轮流前进，每一步都以对方当前的状态为条件，耦合解在采样过程中形成。',
        },
      },
    ],
    metrics: [],
    stack: ['PyTorch', 'flow matching', 'fluid-structure interaction'],
    details: [
      {
        heading: { en: 'Background', zh: '背景' },
        body: [
          { en: 'Real physical systems often couple several physics. Coupled simulation data are expensive, and many approaches struggle with efficiency and fidelity in strongly coupled spatio-temporal systems.', zh: '真实物理系统常常耦合多种物理。耦合仿真数据代价高，很多方法在强耦合的时空系统里效率和精度都不够。' },
        ],
      },
      {
        heading: { en: 'Method', zh: '方法' },
        body: [
          { en: 'Coupled-physics modeling is posed as probability modeling, combining probability density evolution in generative models with iterative multiphysics coupling. Operator-splitting theory in the space of probability evolution gives error-control guarantees for this conditional-to-joint sampling scheme.', zh: '把耦合物理建模写成概率建模问题，把生成模型中的概率密度演化和迭代式多物理耦合结合起来。在概率演化空间里用算子分裂理论，为这种从条件分布到联合分布的采样方式给出误差可控的保证。' },
        ],
      },
    ],
    links: [
      { label: { en: 'arXiv', zh: 'arXiv' }, href: 'https://arxiv.org/abs/2601.19541' },
      { label: { en: 'OpenReview', zh: 'OpenReview' }, href: 'https://openreview.net/forum?id=tn2VAi1KIO' },
      { label: { en: 'Code', zh: '代码' }, href: 'https://github.com/AI4Science-WestlakeU/GenCP' },
    ],
  },
  {
    id: 'realpde',
    title: 'RealPDE Competition',
    org: 'NeurIPS 2026 Competition Track',
    period: '2026',
    pitch: {
      en: 'The first NeurIPS Scientific ML competition centred on data from real physical systems: paired real-world and simulated airfoil flows.',
      zh: '第一个以真实物理系统数据为核心的 NeurIPS 科学机器学习竞赛：真实实验与数值仿真配对的翼型流场数据。',
    },
    cover: { src: asset('/projects/realpde/01-cover.jpg'), alt: 'The competition at a glance: simulated and real-world data, the two tracks, and the metrics' },
    slides: [],
    metrics: [
      { value: '2', label: 'tracks: Sim2Real transfer learning, long-term test-time adaptation', caveat: 'run on Codabench' },
      { value: '$21,000', label: 'prize pool', caveat: '$10,500 per track' },
    ],
    stack: ['Codabench', 'PIV measurements', 'CFD'],
    details: [
      {
        heading: { en: 'Background', zh: '背景' },
        body: [
          { en: 'Most Scientific ML methods are developed and evaluated on simulated data. The competition is built on a dataset of paired real-world and simulated flow trajectories around a NACA4418 airfoil, under aligned experimental and numerical configurations.', zh: '大多数科学机器学习方法都在仿真数据上开发和评测。这个竞赛建立在一组真实实验与数值仿真配对的流场轨迹上，对象是 NACA4418 翼型，实验和数值配置一一对齐。' },
        ],
      },
      {
        heading: { en: 'What I did', zh: '我的工作' },
        body: [
          { en: 'Co-organizer, responsible for the evaluation pipelines and baselines.', zh: '组织者之一，负责评测流程和基线。' },
        ],
      },
    ],
    site: 'https://realpdecompetition.github.io/',
    links: [],
  },
]
