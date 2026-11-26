// 10 版角色方案 — 源自《CodeVerse-设计方案.md》5.2 节
const TURNAROUND = ['xinghang', 'lingxi', 'longyi', 'bit', 'neon', 'foguang', 'panda', 'block', 'teyu', 'gugu']

export const SCHEMES = [
  { id: 1, name: '太空人「星航」', style: 'WooSing whimsical 延续，白宇航服 + 橙细节', method: 'three.js 基础几何拼装', anim: '失重漂浮、挥手、头盔开合', cost: '低', color: '#FF6B35', avatar: '/avatars/xinghang.png' },
  { id: 2, name: '机械狐「灵析」', style: '蒸汽朋克狐狸，铜色齿轮', method: 'Blender 建模导出 glTF', anim: '摇尾、耳朵抖动、齿轮转', cost: '高', color: '#B87333', avatar: '/avatars/lingxi-3d.png' },
  { id: 3, name: '低多边形龙「龙奕」', style: '呼应 LongYi Academy，橙金配色', method: 'three.js 低模拼装', anim: '翅膀扇动、喷小火苗', cost: '中', color: '#FFB347', avatar: '/avatars/longyi.webp' },
  { id: 4, name: '方块机器人「比特」', style: '瓦力风园丁机器人，方盒子身体', method: 'three.js 基础几何', anim: '履带移动、眼部表情屏', cost: '低', color: '#7EC8E3', avatar: '/avatars/bit.webp' },
  { id: 5, name: '赛博猫「霓虹」', style: '霓虹描边黑猫，紫青发光', method: 'three.js + 自发光材质', anim: '伸懒腰、尾巴发光流转', cost: '中', color: '#B48CFF', avatar: '/avatars/neon.webp' },
  { id: 6, name: '数据水母「浮光」', style: '半透明发光水母，触手是数据线', method: 'three.js 半透明材质 + 顶点动画', anim: '触手波动、变色呼吸', cost: '中', color: '#5FF2D0', avatar: '/avatars/foguang.webp' },
  { id: 7, name: '熊猫工程师「胖达」', style: '戴耳机抱键盘的熊猫', method: 'three.js 低模拼装', anim: '敲键盘、啃竹子、点头', cost: '中', color: '#8FBC8F', avatar: '/avatars/panda.webp' },
  { id: 8, name: '体素骑士「块块」', style: 'Minecraft 式体素人，披风是代码屏', method: 'three.js 体素块堆砌', anim: '挥剑、披风飘动', cost: '中', color: '#C0C0C0', avatar: '/avatars/block.webp' },
  { id: 9, name: '森林鹿「苔语」', style: '自然系，鹿角上长发光苔藓', method: 'three.js 低模拼装', anim: '低头饮水、鹿角荧光呼吸', cost: '中', color: '#9ACD32', avatar: '/avatars/teyu.webp' },
  { id: 10, name: '像素鸡「咕咕」', style: '复古游戏风，3D 体素鸡', method: 'three.js 体素', anim: '啄地、扑翅、下蛋彩蛋', cost: '低', color: '#FFD700', avatar: '/avatars/gugu.webp' },
].map((s) => ({ ...s, turnaround: `/avatars/turnaround/${TURNAROUND[s.id - 1]}.webp` }))
