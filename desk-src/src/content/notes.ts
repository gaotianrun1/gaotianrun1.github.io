// The notebook on the About desk. Newest entry is the open page; older
// ones are earlier pages. Paragraphs are separated by a blank line;
// [text](/projects/<id>) opens that project's tray.

import type { Text } from '../lang'
import { asset } from '../base'

export type Note = {
  date: string
  title: Text
  body: Text
}

// A square print at the head of the notebook page, whichever entry is open (480×480).
export const portrait = { src: asset('/about/portrait.jpg'), alt: 'Tianrun Gao' }

export const notes: Note[] = [
  {
    date: '2026-11-26',
    title: { en: 'About me', zh: '关于我' },
    body: {
      en: `I’m Tianrun Gao, a first-year PhD student at the School of Computing and Data Science, The University of Hong Kong, advised by Prof. Liangqiong Qu.

I build machine learning models that learn how complex systems evolve, and use them to predict, design and control those systems. On the method side that means generative models, world models, graph neural networks and temporal sequence modeling; the applications are physical systems, through neural PDE solvers and physics simulators, and health, through medical image analysis and modeling of longitudinal disease progression.

The projector holds a few of the papers, the typewriter my CV. The full publication list is on my [academic homepage](https://gaotianrun1.github.io/publications/).`,
      zh: `我是高天润，香港大学计算与数据科学学院一年级博士生，导师是 Prof. Liangqiong Qu。

我做的是学习复杂系统如何演化的机器学习模型，再用这些模型去预测、设计和控制系统。方法上包括生成模型、world model、图神经网络和时序建模；应用上一是物理系统，做神经 PDE 求解器和物理仿真器，二是医疗健康，做医学影像分析和纵向疾病演化建模。

投影仪里放了几篇论文，打字机上是简历。完整的论文列表在我的[学术主页](https://gaotianrun1.github.io/publications/)。`,
    },
  },
]
