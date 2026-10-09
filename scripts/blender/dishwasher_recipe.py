"""The kitchen's dishwasher, from the owner's picture: a Whirlpool slimline of 45 cm, stainless steel. Seen from the front: a black control strip across the top with its buttons and the lit
display, under it the steel door with a recessed handle tray across its top, and a grey plinth at the foot; the body behind the door is dark grey. Units in metres; 0.45 m wide, 0.85 m tall and 0.59 m deep.

Axes in Blender: X is the width, Y the depth (the front, the door's side, is -Y, which the exporter turns into +Z) and Z the height; it stands at Z = 0, centred. Positions on the front are read from the
picture as fractions of its height, from the top.
"""
from __future__ import annotations

import hashlib
from pathlib import Path


def paint(bpy, name, color, roughness, metallic=0, emission=None):
    item = bpy.data.materials.new(name)
    item.use_nodes = True
    srgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb]
    item.diffuse_color = (*linear, 1)
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if emission:
        shader.inputs['Emission Color'].default_value = (*emission, 1)
        shader.inputs['Emission Strength'].default_value = 3
    return item


def build(request, _default_material):
    import bpy
    from mathutils import Vector

    w, h, d = request['dimensions']
    steel = paint(bpy, 'Brushed steel', '#b9bcc0', .38, .9)
    black = paint(bpy, 'Control strip', '#0d0e10', .35, .15)
    body_grey = paint(bpy, 'Body', '#3b3d41', .55, .3)
    plinth = paint(bpy, 'Plinth', '#6e7176', .55, .3)
    tray = paint(bpy, 'Handle tray', '#2a2c2f', .5, .5)
    key = paint(bpy, 'Key', '#2e3033', .5, .2)
    display = paint(bpy, 'Display', '#f2f6fa', .3, emission=(.85, .92, 1))
    parts = []
    front = -d / 2

    def box(name, finish, x, y, z, bevel=.002):
        bpy.ops.mesh.primitive_cube_add(size=1, location=((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2))
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = (x[1] - x[0], y[1] - y[0], z[1] - z[0])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        size = min(x[1] - x[0], y[1] - y[0], z[1] - z[0])
        if bevel and size > .003:
            soft = obj.modifiers.new('Soft edges', 'BEVEL')
            soft.width = min(bevel, size / 3)
            soft.segments = 2
            bpy.ops.object.modifier_apply(modifier=soft.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        obj.data.materials.append(finish)
        parts.append(obj)

    def z(fraction):
        return h * (1 - fraction)

    half = w / 2
    door = .02
    # The body behind the door, with its top; the plinth at the foot, set back a little.
    box('Body', body_grey, (-half + .004, half - .004), (front + door, d / 2), (z(.93), z(.04)), .006)
    box('Plinth', plinth, (-half + .01, half - .01), (front + .035, d / 2 - .03), (0, z(.93)), .003)
    # The control strip across the top of the front, black, with its keys and the lit display; the steel door under it.
    box('Control strip', black, (-half, half), (front, front + door), (z(.21), z(.045)), .004)
    box('Door', steel, (-half, half), (front, front + door), (z(.935), z(.21)), .004)
    # The handle tray across the top of the door: a recess, dark, with its lip.
    box('Handle tray', tray, (-half + .025, half - .025), (front - .012, front + .004), (z(.285), z(.235)), .003)
    box('Display', display, (-.028, .028), (front - .0015, front), (z(.16), z(.135)), .0005)
    for side in (-1, 1):
        for index in range(3):
            x = side * (.065 + index * .026)
            box(f'Key {side} {index}', key, (x - .009, x + .009), (front - .0015, front), (z(.175), z(.15)), .0005)
    box('Logo', steel, (-.03, .03), (front - .001, front), (z(.205), z(.2)), .0003)

    for obj in parts:
        obj.data.transform(obj.matrix_world)
        obj.matrix_world = obj.matrix_world.__class__.Identity(4)
    points = [vertex.co for obj in parts for vertex in obj.data.vertices]
    lower = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    upper = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    size = upper - lower
    target = Vector((request['dimensions'][0], request['dimensions'][2], request['dimensions'][1]))
    centre = Vector(((lower.x + upper.x) / 2, (lower.y + upper.y) / 2, lower.z))
    for obj in parts:
        for vertex in obj.data.vertices:
            vertex.co = Vector(tuple((vertex.co[i] - centre[i]) * target[i] / size[i] for i in range(3)))
        obj.data.update()
    return parts, {
        'recipe': 'dishwasher', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
