"""The main supply board, flush-mounted in a wall: a single row of fourteen modules under a smoked black door, in a white frame, from the owner's picture. Units in metres; 300 mm wide, 170 mm
tall, 100 mm deep: 20 mm of frame and door stand out of the wall and 80 mm of box are inside it.

Axes in Blender: X is the width, Y the depth (the front is -Y, which the exporter turns into +Z) and Z the height; its bottom is at Z = 0, centred. The wall's face is 20 mm behind the front.
Inside there are a two-pole main breaker, a two-pole residual-current device and eight single-pole Easy9 breakers; the last two modules are closed with blanking plates.
"""
from __future__ import annotations

import hashlib
from pathlib import Path


def paint(bpy, name, color, roughness, metallic=0, alpha=1):
    item = bpy.data.materials.new(name)
    item.use_nodes = True
    srgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb]
    item.diffuse_color = (*linear, alpha)
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if alpha < 1:
        shader.inputs['Alpha'].default_value = alpha
        item.blend_method = 'BLEND'
    return item


def build(request, _default_material):
    import bpy
    from mathutils import Vector

    white = paint(bpy, 'Frame white', '#f3f4f3', .38)
    box_grey = paint(bpy, 'Box grey', '#c9cbca', .6)
    inside = paint(bpy, 'Inside', '#dcdedd', .5)
    smoke = paint(bpy, 'Smoked door', '#17181a', .12, alpha=.66)
    rail = paint(bpy, 'DIN rail', '#a9adb1', .4, .9)
    grey = paint(bpy, 'Easy9 grey', '#dfe0dc', .45)
    handle = paint(bpy, 'Easy9 handle', '#3b3c3f', .5)
    screw = paint(bpy, 'Terminal', '#16171a', .6)
    mark = paint(bpy, 'EZ green', '#14a44d', .4)
    blank = paint(bpy, 'Blanking plate', '#cfd2d1', .55)
    parts = []
    w, h, d = .3, .17, .1
    front, wall = -d / 2, -d / 2 + .02

    def box(name, finish_material, x, y, z, bevel=.002):
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
        obj.data.materials.append(finish_material)
        parts.append(obj)

    half = w / 2
    # The frame on the wall's face, 20 mm deep, and the box inside the wall (slimmer than the frame), open at the front.
    ring = .022
    box('Frame top', white, (-half, half), (front, wall), (h - ring, h), .004)
    box('Frame bottom', white, (-half, half), (front, wall), (0, ring), .004)
    box('Frame left', white, (-half, -half + ring), (front, wall), (ring, h - ring), .004)
    box('Frame right', white, (half - ring, half), (front, wall), (ring, h - ring), .004)
    bx = half - .012
    box('Box back', inside, (-bx, bx), (d / 2 - .006, d / 2), (.012, h - .012), .002)
    box('Box top', box_grey, (-bx, bx), (wall, d / 2), (h - .018, h - .012), .002)
    box('Box bottom', box_grey, (-bx, bx), (wall, d / 2), (.012, .018), .002)
    box('Box left', box_grey, (-bx, -bx + .006), (wall, d / 2), (.012, h - .012), .002)
    box('Box right', box_grey, (bx - .006, bx), (wall, d / 2), (.012, h - .012), .002)
    # The row of modules on its rail.
    pole = .018
    z = h / 2
    box('Rail', rail, (-bx + .006, bx - .006), (.008, .016), (z - .0175, z + .0175), .0005)
    layout = [2, 2] + [1] * 8
    x0 = -7 * pole
    for index, poles in enumerate(layout):
        x1 = x0 + poles * pole
        box(f'Breaker {index}', grey, (x0 + .0004, x1 - .0004), (-.01, .06), (z - .042, z + .042), .0012)
        for step in range(poles):
            px = x0 + step * pole + pole / 2
            box(f'Handle {index} {step}', handle, (px - .006, px + .006), (-.019, -.01), (z - .011, z + .011), .0012)
            for dz in (-.033, .033):
                box(f'Terminal {index} {step} {dz}', screw, (px - .004, px + .004), (-.0115, -.01), (z + dz - .004, z + dz + .004), .0003)
        if poles > 1:
            box(f'Bar {index}', handle, (x0 + .003, x1 - .003), (-.021, -.015), (z - .006, z + .002), .001)
        box(f'Mark {index}', mark, (x0 + .0045, x0 + .0105), (-.0105, -.01), (z + .015, z + .021), .0002)
        x0 = x1
    for _ in range(2):
        box('Blank', blank, (x0 + .0004, x0 + pole - .0004), (-.002, .003), (z - .042, z + .042), .001)
        x0 += pole
    # The smoked door, a little proud of the frame's face, with its small latch on the right.
    box('Door', smoke, (-half + .012, half - .012), (front - .004, front + .002), (.012, h - .012), .004)
    box('Latch', white, (half - ring - .004, half - ring + .006), (front - .006, front), (z - .008, z + .008), .002)

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
        'recipe': 'board-flush', 'version': 1, 'fidelityStatus': 'draft-needs-visual-review',
        'normalization': 'outer-bounds-to-declared-dimensions', 'inputBounds': list(size), 'partCount': len(parts),
        'recipeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
