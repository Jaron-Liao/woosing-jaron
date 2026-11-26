// 算法区模板 —— 每个模板一键建仓到代码存储区并在编码区打开
// 涉及 iris.csv 的模板依赖数据集区「导入编码区」先建仓

export const ALGO_GROUPS = [
  {
    name: '数据结构与算法',
    items: [
      {
        key: 'bubble_sort',
        name: '冒泡排序 过程可视化',
        desc: '随机打乱 30 个数，排序全程截图，2x3 网格回放每一步。',
        template: `import random
import matplotlib.pyplot as plt

arr = list(range(1, 31))
random.shuffle(arr)
print('初始:', arr)

def bubble_sort(a):
    n = len(a)
    for i in range(n):
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
        yield list(a)

steps = list(bubble_sort(arr))
print('排序步数:', len(steps))

# 取样 6 步回放
idx = [0, len(steps)//5, 2*len(steps)//5, 3*len(steps)//5, 4*len(steps)//5, len(steps)-1]
fig, axes = plt.subplots(2, 3, figsize=(12, 6))
for ax, i in zip(axes.flat, idx):
    ax.bar(range(len(steps[i])), steps[i], color='#ff6b35')
    ax.set_title(f'step {i+1}')
plt.tight_layout()
plt.show()
`,
      },
      {
        key: 'quick_sort',
        name: '快速排序 递归追踪',
        desc: '纯 Python 打印每次分区结果，看枢轴怎么归位。',
        template: `import random

def quick_sort(a, depth=0):
    if len(a) <= 1:
        return a
    pivot = a[len(a) // 2]
    left = [x for x in a if x < pivot]
    mid = [x for x in a if x == pivot]
    right = [x for x in a if x > pivot]
    print('  ' * depth + f'pivot={pivot}  left={left}  mid={mid}  right={right}')
    return quick_sort(left, depth + 1) + mid + quick_sort(right, depth + 1)

arr = random.sample(range(1, 21), 10)
print('初始:', arr)
print('结果:', quick_sort(arr))
`,
      },
      {
        key: 'bfs_grid',
        name: 'BFS 迷宫寻路',
        desc: '5x5 网格从左上角找右下角，# 是墙，打印搜索路径。',
        template: `from collections import deque

grid = [
    list('S...#'),
    list('.##.#'),
    list('..#..'),
    list('.#.#.'),
    list('...#E'),
]
R, C = len(grid), len(grid[0])
start = (0, 0)
goal = (R - 1, C - 1)

def bfs():
    q = deque([(start, [start])])
    seen = {start}
    while q:
        (r, c), path = q.popleft()
        if (r, c) == goal:
            return path
        for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] != '#' and (nr, nc) not in seen:
                seen.add((nr, nc))
                q.append(((nr, nc), path + [(nr, nc)]))
    return None

path = bfs()
for r in range(R):
    row = ''
    for c in range(C):
        if (r, c) in (path or []):
            row += '*'
        else:
            row += grid[r][c]
    print(row)
print('步数:', len(path) if path else '无路可走')
`,
      },
    ],
  },
  {
    name: '机器学习',
    items: [
      {
        key: 'linear_regression',
        name: '线性回归 拟合 Iris',
        desc: '用花瓣长预测花萼长，输出斜率/截距/R² 并画拟合线。需先导入 Iris。',
        template: `import pandas as pd
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression

df = pd.read_csv('iris.csv')  # 数据集区先点「导入编码区」
X = df[['petal_length']].values
y = df['sepal_length'].values

model = LinearRegression().fit(X, y)
print('斜率:', round(model.coef_[0], 3))
print('截距:', round(model.intercept_, 3))
print('R2:', round(model.score(X, y), 3))

plt.scatter(X, y, alpha=0.5, label='data')
plt.plot(X, model.predict(X), color='red', label='fit')
plt.xlabel('petal_length')
plt.ylabel('sepal_length')
plt.legend()
plt.show()
`,
      },
      {
        key: 'knn_iris',
        name: 'KNN 分类 Iris',
        desc: '花瓣长+花瓣宽两特征做 KNN，输出准确率并画决策散点。需先导入 Iris。',
        template: `import pandas as pd
import matplotlib.pyplot as plt
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split

df = pd.read_csv('iris.csv')  # 数据集区先点「导入编码区」
X = df[['petal_length', 'petal_width']].values
y = df['species'].values

Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=42)
model = KNeighborsClassifier(n_neighbors=3).fit(Xtr, ytr)
print('测试集准确率:', round(model.score(Xte, yte), 3))

codes = pd.Categorical(df['species']).codes
plt.scatter(X[:, 0], X[:, 1], c=codes, cmap='viridis', alpha=0.7)
plt.xlabel('petal_length')
plt.ylabel('petal_width')
plt.title('KNN on Iris (k=3)')
plt.show()
`,
      },
      {
        key: 'kmeans_iris',
        name: 'K-Means 聚类 Iris',
        desc: '无监督聚成 3 类，对比真实品种标签看聚类效果。需先导入 Iris。',
        template: `import pandas as pd
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans

df = pd.read_csv('iris.csv')  # 数据集区先点「导入编码区」
X = df[['petal_length', 'petal_width']].values

km = KMeans(n_clusters=3, n_init=10, random_state=42).fit(X)
print('簇中心:', km.cluster_centers_.round(2))

fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))
axes[0].scatter(X[:, 0], X[:, 1], c=km.labels_, cmap='viridis')
axes[0].set_title('K-Means clusters')
codes = pd.Categorical(df['species']).codes
axes[1].scatter(X[:, 0], X[:, 1], c=codes, cmap='viridis')
axes[1].set_title('True species')
for ax in axes:
    ax.set_xlabel('petal_length')
    ax.set_ylabel('petal_width')
plt.tight_layout()
plt.show()
`,
      },
    ],
  },
]
