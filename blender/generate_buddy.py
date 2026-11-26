# CodeVerse 学习伙伴 · Blender 批量建模脚本
# 用法（安装 Blender 4.x 后）：
#   blender -b --python generate_buddy.py -- --out ../public/models
# 产物：
#   codeverse-buddy.glb        可直接被 three.js GLTFLoader 加载
#   turnaround_front/side/back.png   三视图（用于图鉴/头像）
#   preview.png                带灯光的质感预览
#
# 设计：低多边形机械狐（10 版角色里的「灵犀」），全部用基础几何拼装，
# 无外部贴图依赖，材质用 Principled BSDF，保证在任何机器都能离线跑通。

import bpy
import math
import os
import sys
from mathutils import Vector

# ---------------- 参数 ----------------
def arg(name, default):
    try:
        i = sys.argv.index(name)
        return sys.argv[i + 1]
    except (ValueError, IndexError):
        return default

OUT = os.path.abspath(arg('--out', '../public/models'))
os.makedirs(OUT, exist_ok=True)

BODY = (0.13, 0.55, 0.85, 1.0)      # 主体青蓝
ACCENT = (0.06, 0.86, 0.72, 1.0)    # 荧光薄荷
DARK = (0.09, 0.14, 0.20, 1.0)      # 机械关节
WHITE = (0.96, 0.98, 1.0, 1.0)
GOLD = (1.0, 0.78, 0.33, 1.0)

# ---------------- 清场 ----------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials):
    bpy.data.materials.remove(m)


def mat(name, color, metallic=0.15, rough=0.42, emission=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = color
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = rough
    if emission:
        bsdf.inputs['Emission Color'].default_value = emission
        bsdf.inputs['Emission Strength'].default_value = strength
    return m


M_BODY = mat('Body', BODY, metallic=0.28, rough=0.36)
M_ACCENT = mat('Accent', ACCENT, metallic=0.10, rough=0.30, emission=ACCENT, strength=0.22)
M_DARK = mat('Joint', DARK, metallic=0.65, rough=0.35)
M_WHITE = mat('White', WHITE, metallic=0.05, rough=0.52)
M_GOLD = mat('Gold', GOLD, metallic=0.72, rough=0.28)

parts = []


def add(obj, material, name=None):
    if name:
        obj.name = name
    obj.data.materials.append(material)
    parts.append(obj)
    return obj


def sphere(loc, scale, material, name, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o = bpy.context.object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return add(o, material, name)


def box(loc, scale, material, name, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        m = o.modifiers.new('Bevel', 'BEVEL')
        m.width = bevel
        m.segments = 2
        bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.ops.object.shade_smooth()
    return add(o, material, name)


def cone(loc, r1, r2, depth, material, name, rot=(0, 0, 0), verts=16):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2,
                                    depth=depth, location=loc, rotation=rot)
    return add(bpy.context.object, material, name)


# ---------------- 身体 ----------------
sphere((0, 0, 1.02), (0.62, 0.46, 0.58), M_BODY, 'Torso')
sphere((0, -0.06, 1.06), (0.42, 0.40, 0.40), M_WHITE, 'Belly')
box((0, -0.02, 1.30), (0.52, 0.12, 0.10), M_ACCENT, 'Collar', bevel=0.03)

# 头
sphere((0, -0.30, 1.72), (0.48, 0.44, 0.44), M_BODY, 'Head')
sphere((0, -0.62, 1.62), (0.24, 0.26, 0.20), M_WHITE, 'Muzzle')
sphere((0, -0.83, 1.66), (0.085, 0.07, 0.07), M_DARK, 'Nose')

# 耳朵（左右）
for side in (-1, 1):
    cone((0.29 * side, -0.20, 2.12), 0.19, 0.01, 0.52, M_BODY,
         f'Ear_{"L" if side < 0 else "R"}', rot=(0.12, 0.18 * side, 0.12 * side))
    cone((0.29 * side, -0.27, 2.10), 0.10, 0.01, 0.34, M_ACCENT,
         f'EarInner_{"L" if side < 0 else "R"}', rot=(0.12, 0.18 * side, 0.12 * side))

# 眼睛（发光）
for side in (-1, 1):
    sphere((0.19 * side, -0.68, 1.79), (0.085, 0.045, 0.095), M_DARK,
           f'Eye_{"L" if side < 0 else "R"}')
    sphere((0.19 * side, -0.71, 1.79), (0.042, 0.022, 0.048), M_ACCENT,
           f'Pupil_{"L" if side < 0 else "R"}', segments=12, rings=8)

# 尾巴（三段递进，做出蓬松感）
tail_data = [
    ((0, 0.55, 1.00), (0.25, 0.30, 0.25)),
    ((0, 0.86, 1.18), (0.29, 0.33, 0.29)),
    ((0, 1.14, 1.42), (0.26, 0.31, 0.26)),
]
for i, (loc, sc) in enumerate(tail_data):
    sphere(loc, sc, M_ACCENT if i == 2 else M_BODY, f'Tail_{i}')

# 四条腿
for x in (-0.34, 0.34):
    for y in (-0.28, 0.30):
        box((x, y, 0.44), (0.19, 0.20, 0.72), M_BODY, f'Leg_{x}_{y}', bevel=0.055)
        sphere((x, y - 0.04, 0.13), (0.15, 0.20, 0.11), M_DARK, f'Paw_{x}_{y}')

# 胸口能量核心
sphere((0, -0.47, 1.18), (0.14, 0.06, 0.14), M_ACCENT, 'Core')
sphere((0, -0.51, 1.18), (0.075, 0.03, 0.075), M_GOLD, 'CoreInner', segments=12, rings=8)

# ---------------- 灯光与相机 ----------------
world = bpy.context.scene.world or bpy.data.worlds.new('World')
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.055, 0.075, 0.10, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.7


def area(name, loc, energy, size, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy = energy
    d.size = size
    d.color = color
    o = bpy.data.objects.new(name, d)
    bpy.context.collection.objects.link(o)
    o.location = loc
    direction = Vector((0, 0, 1.2)) - o.location
    o.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    return o


area('Key', (2.6, -3.4, 4.2), 420, 3.0, (1.0, 0.96, 0.90))
area('Fill', (-3.0, -1.2, 2.4), 260, 3.5, (0.62, 0.88, 1.0))
area('Rim', (0.4, 3.2, 3.4), 520, 2.4, (0.35, 1.0, 0.88))

scene = bpy.context.scene
scene.render.engine = 'CYCLES' if hasattr(scene, 'cycles') else 'BLENDER_EEVEE_NEXT'
if scene.render.engine == 'CYCLES':
    scene.cycles.samples = 48
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'

cam_data = bpy.data.cameras.new('Cam')
cam = bpy.data.objects.new('Cam', cam_data)
bpy.context.collection.objects.link(cam)
scene.camera = cam
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 3.8

TARGET = Vector((0, 0, 1.15))


def render_view(name, loc):
    cam.location = loc
    cam.rotation_euler = (TARGET - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(OUT, name)
    bpy.ops.render.render(write_still=True)
    print('RENDERED', name)


render_view('preview.png', (2.4, -4.2, 2.9))
render_view('turnaround_front.png', (0, -6, 1.3))
render_view('turnaround_side.png', (6, 0, 1.3))
render_view('turnaround_back.png', (0, 6, 1.3))

# ---------------- 导出 GLB ----------------
# 只导出模型，不含灯光/相机
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, 'codeverse-buddy.glb'),
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_materials='EXPORT',
)
print('EXPORTED', os.path.join(OUT, 'codeverse-buddy.glb'))
print('DONE')
